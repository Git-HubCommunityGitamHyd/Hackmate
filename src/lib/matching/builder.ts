import { getUserSignal, getUserTeamForHackathon } from "@/lib/queries/context";
import { getProfile, people } from "@/lib/queries/people";
import type { PersonCardDTO } from "@/lib/queries/types";
import { db, schema } from "@/lib/db";
import { and, eq, inArray } from "drizzle-orm";
import { hasUsableStoredEmbedding, cosineSimilarity } from "./semantic";

export type BuilderResult = {
  requester: PersonCardDTO;
  members: (PersonCardDTO & {
    matchScore: number;
    matchReasons: string[];
    coveredRoles: string[];
    coveredSkills: string[];
  })[];
  missingSlots: number;
  coveredRoles: string[];
  coveredSkills: string[];
  uncoveredRoles: string[];
  uncoveredSkills: string[];
  explanation: string;
  hackathon: { id: string; slug: string; name: string };
};

function scoreCandidate(
  requester: PersonCardDTO,
  candidate: PersonCardDTO,
  uncoveredRoles: Set<string>,
  uncoveredSkills: Set<string>,
  semanticScore = 0,
) {
  const newRoles = candidate.roles.filter((role) => uncoveredRoles.has(role.slug));
  const newSkills = candidate.topSkills.filter((skill) => uncoveredSkills.has(skill.id));
  const sharedSkills = candidate.topSkills.filter((skill) => !uncoveredSkills.has(skill.id));
  const availability = Math.min(candidate.hoursPerWeek, requester.hoursPerWeek) / Math.max(requester.hoursPerWeek, 1);
  const commitment = candidate.commitment && requester.commitment
    ? candidate.commitment === requester.commitment ? 1 : 0.55
    : 0.5;
  const coverage = newRoles.length * 32 + newSkills.length * 7;
  const score = Math.round(Math.min(100, coverage + availability * 12 + commitment * 10 + Math.min(sharedSkills.length, 3) * 2 + semanticScore * 12));
  const reasons = [
    newRoles.length > 0 ? `Covers ${newRoles.map((role) => role.name).join(", ")}` : "Adds supporting skills",
    newSkills.length > 0 ? `Adds ${newSkills.slice(0, 3).map((skill) => skill.name).join(", ")}` : "Builds on the team's existing skills",
    availability >= 0.8 ? "Availability overlaps well" : "Has some availability overlap",
    commitment >= 0.9 ? "Matches your commitment level" : "Has a compatible commitment level",
  ];
  return {
    score,
    reasons,
    coveredRoles: newRoles.map((role) => role.name),
    coveredSkills: newSkills.map((skill) => skill.name),
  };
}

export function selectBuilderCandidates(
  requester: PersonCardDTO,
  candidates: PersonCardDTO[],
  slots: number,
  semanticScores: Map<string, number> = new Map(),
) {
  const uncoveredRoles = new Set(
    candidates.flatMap((candidate) => candidate.roles.map((role) => role.slug)),
  );
  for (const role of requester.roles) uncoveredRoles.delete(role.slug);
  const uncoveredSkills = new Set(candidates.flatMap((candidate) => candidate.topSkills.map((skill) => skill.id)));
  for (const skill of requester.topSkills) uncoveredSkills.delete(skill.id);
  const selected: { candidate: PersonCardDTO; score: number; reasons: string[]; coveredRoles: string[]; coveredSkills: string[] }[] = [];
  const remaining = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  for (let index = 0; index < slots && remaining.size > 0; index += 1) {
    const best = [...remaining.values()]
      .map((candidate) => ({ candidate, ...scoreCandidate(requester, candidate, uncoveredRoles, uncoveredSkills, semanticScores.get(candidate.id) ?? 0) }))
      .sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id))[0];
    if (!best) break;
    selected.push(best);
    remaining.delete(best.candidate.id);
    for (const role of best.candidate.roles) uncoveredRoles.delete(role.slug);
    for (const skill of best.candidate.topSkills) uncoveredSkills.delete(skill.id);
  }
  return {
    selected,
    uncoveredRoles: [...uncoveredRoles],
    uncoveredSkills: [...uncoveredSkills],
  };
}

export async function buildTeamRecommendation(userId: string, slug: string): Promise<BuilderResult | null> {
  const [hackathon] = await db
    .select({ id: schema.hackathons.id, slug: schema.hackathons.slug, name: schema.hackathons.name, status: schema.hackathons.status, teamSizeMax: schema.hackathons.teamSizeMax })
    .from(schema.hackathons)
    .where(eq(schema.hackathons.slug, slug))
    .limit(1);
  if (!hackathon || hackathon.status === "completed") return null;

  const signal = await getUserSignal(userId);
  if (!signal || !signal.user.onboarded || !signal.user.openToOpportunities) return null;
  if (await getUserTeamForHackathon(userId, hackathon.id)) return null;

  const profile = await getProfile(userId);
  if (!profile) return null;

  const candidatePeople = await people({ excludeTeamHackathonId: hackathon.id, limit: 100 });
  const eligibleRows = candidatePeople.length > 0
    ? await db
      .select({ id: schema.users.id, openToOpportunities: schema.users.openToOpportunities })
      .from(schema.users)
      .where(and(eq(schema.users.openToOpportunities, true), inArray(schema.users.id, candidatePeople.map((candidate) => candidate.id))))
    : [];
  const eligibleIds = new Set(eligibleRows.map((row) => row.id));
  const candidates = candidatePeople
    .filter((candidate) =>
      candidate.id !== userId &&
      eligibleIds.has(candidate.id) &&
      candidate.recruitmentStatus !== "not_looking" &&
      candidate.recruitmentStatus !== "team_full" &&
      candidate.topSkills.length > 0 &&
      candidate.roles.length > 0,
    );
  const embeddingRows = candidates.length > 0
    ? await db.select({
      id: schema.users.id,
      vector: schema.users.profileEmbedding,
      modelVersion: schema.users.profileEmbeddingModel,
      taxonomyVersion: schema.users.profileEmbeddingTaxonomy,
      preparationVersion: schema.users.profileEmbeddingPreparation,
      status: schema.users.profileEmbeddingStatus,
    }).from(schema.users).where(inArray(schema.users.id, [userId, ...candidates.map((candidate) => candidate.id)]))
    : [];
  const vectors = new Map(embeddingRows.map((row) => [row.id, row]));
  const requesterVector = vectors.get(userId);
  const semanticScores = new Map<string, number>();
  if (hasUsableStoredEmbedding(requesterVector)) {
    for (const candidate of candidates) {
      const vector = vectors.get(candidate.id);
      if (hasUsableStoredEmbedding(vector)) {
        const similarity = cosineSimilarity(requesterVector.vector, vector.vector);
        if (similarity !== null) semanticScores.set(candidate.id, Math.max(0, similarity));
      }
    }
  }

  const slots = Math.max(0, Math.min(4, hackathon.teamSizeMax) - 1);
  const selection = selectBuilderCandidates(profile, candidates, slots, semanticScores);
  const selected = selection.selected;
  const members = selected.map(({ candidate, score, reasons, coveredRoles, coveredSkills }) => ({
    ...candidate,
    matchScore: score,
    matchReasons: reasons,
    coveredRoles,
    coveredSkills,
  }));
  const targetSize = Math.min(4, hackathon.teamSizeMax);
  const missingSlots = Math.max(0, targetSize - members.length - 1);
  const coveredRoles = [...new Set([ ...profile.roles.map((role) => role.name), ...members.flatMap((member) => member.coveredRoles) ])];
  const coveredSkills = [...new Set([ ...profile.topSkills.map((skill) => skill.name), ...members.flatMap((member) => member.coveredSkills) ])];
  const missingRoles = selection.uncoveredRoles.map((slug) => candidates.flatMap((candidate) => candidate.roles).find((role) => role.slug === slug)?.name ?? slug);
  const missingSkills = selection.uncoveredSkills.map((id) => candidates.flatMap((candidate) => candidate.topSkills).find((skill) => skill.id === id)?.name ?? id);
  return {
    requester: profile,
    members,
    missingSlots,
    coveredRoles,
    coveredSkills,
    uncoveredRoles: missingRoles,
    uncoveredSkills: missingSkills,
    explanation: missingSlots > 0
      ? `We found ${members.length} eligible teammate${members.length === 1 ? "" : "s"}; ${missingSlots} slot${missingSlots === 1 ? " is" : "s are"} still open${missingRoles.length > 0 ? `, including ${missingRoles.slice(0, 2).join(" and ")}` : ""}.`
      : `This lineup covers ${coveredRoles.slice(0, 3).join(", ")} with complementary skills, availability, and commitment.`,
    hackathon: { id: hackathon.id, slug: hackathon.slug, name: hackathon.name },
  };
}
