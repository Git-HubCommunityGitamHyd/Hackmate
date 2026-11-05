import { NextRequest } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { listHackathons } from "@/lib/queries/hackathons";
import { listTeams } from "@/lib/queries/teams";
import { people } from "@/lib/queries/people";
import { parseSearchQuery, toStructuredFilters } from "@/lib/matching/search-parser";
import { ROLE_TAXONOMY } from "@/lib/constants";
import { prepareSemanticText } from "@/lib/matching/taxonomy";
import { ok, fail, withPublic, requireUser } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
  isCurrentEmbedding,
  profileEmbeddingText,
  validateEmbedding,
} from "@/lib/matching/semantic";
import {
  combineScores,
  explainSearchMatch,
  normalizedKeywordScore,
  safeSemanticScore,
} from "@/lib/matching/ranking";

/**
 * GET /api/search?q=… - natural-language search across everything.
 * "Need someone who knows Next.js and has ML experience for a 4-person team"
 *   → parses skills (next.js), category (ai_ml), team size (4), intent (people)
 * Postgres full-text (tsvector) used for hackathon text; structured filters
 * via junction tables for skills/roles.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, { key: "search", limit: 20, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  return withPublic(async () => {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length === 0) {
      return ok({ parsed: null, hackathons: [], teams: [], people: [] });
    }

    const parsed = parseSearchQuery(q);
    const filters = toStructuredFilters(parsed);
    const embeddingParam = req.nextUrl.searchParams.get("embedding") ?? req.headers.get("x-semantic-embedding");
    let queryEmbedding: number[] | null = null;
    if (embeddingParam) {
      try {
        const parsedEmbedding: unknown = JSON.parse(embeddingParam);
        if (!validateEmbedding(parsedEmbedding)) {
          return fail("Invalid semantic query embedding", 422);
        }

        queryEmbedding = parsedEmbedding;
      } catch {
        return fail("Invalid semantic query embedding", 422);
      }

    }

    /* Resolve skill slugs → ids for structured filtering. */
    const allSkills = await db.select().from(schema.skills);
    const skillIdBySlug = new Map(allSkills.map((s) => [s.slug, s.id]));
    const skillIds = filters.skillSlugs.map((s) => skillIdBySlug.get(s)).filter(Boolean) as string[];
    const excludedSkillIds = parsed.excludedSkills
      .map((name) => allSkills.find((skill) => skill.name.toLowerCase() === name.toLowerCase())?.id)
      .filter(Boolean) as string[];
    const roleIds = filters.roleSlugs
      .map((slug) => ROLE_TAXONOMY.find((role) => role.slug === slug)?.slug)
      .filter(Boolean) as string[];

    const viewer = await requireUser();

    /* When the parser found structured signals (skills/roles), those carry
       the intent - leftover words like "need/for/team" would over-filter.
       Only apply free-text matching when nothing structured was found. */
    const structured = skillIds.length > 0 || filters.categories.length > 0 || roleIds.length > 0;
    const freeText = structured ? undefined : filters.q;

    const [rawHackathonList, rawTeamList, peopleList] = await Promise.all([
      listHackathons({ q: freeText }),
      listTeams({ recruiting: true }, viewer?.id ?? null),
      people({
        q: freeText,
        skillIds: skillIds.length > 0 ? skillIds : undefined,
        categories: filters.categories.length > 0 ? filters.categories : undefined,
        excludedSkillIds,
        roleSlugs: roleIds,
        openToOpportunitiesOnly: !!queryEmbedding,
        limit: 40,
      }),
    ]);
    const excludedTerms = parsed.excludedSkills.map((skill) => skill.toLowerCase());
    const hackathonList = rawHackathonList.filter((hackathon) => {
      const text = [hackathon.name, hackathon.tagline ?? "", hackathon.description ?? "", ...hackathon.themes].join(" ").toLowerCase();
      return !excludedTerms.some((term) => text.includes(term));
    });
    const teamList = rawTeamList.filter((team) => {
      const text = [team.name, team.ideaTitle ?? "", team.ideaDomain ?? "", ...team.missingSkills].join(" ").toLowerCase();
      return !excludedTerms.some((term) => text.includes(term));
    });
    const entityIds = [...hackathonList.map((item) => item.id), ...teamList.map((item) => item.id)];
    const entityEmbeddingRows = !queryEmbedding || entityIds.length === 0
      ? []
      : await db.select({
          entityType: schema.searchEmbeddings.entityType,
          entityId: schema.searchEmbeddings.entityId,
          vector: schema.searchEmbeddings.vector,
          modelVersion: schema.searchEmbeddings.modelVersion,
          taxonomyVersion: schema.searchEmbeddings.taxonomyVersion,
          preparationVersion: schema.searchEmbeddings.preparationVersion,
          sourceHash: schema.searchEmbeddings.sourceHash,
          status: schema.searchEmbeddings.status,
        }).from(schema.searchEmbeddings).where(or(
          and(eq(schema.searchEmbeddings.entityType, "team"), inArray(schema.searchEmbeddings.entityId, entityIds)),
          and(eq(schema.searchEmbeddings.entityType, "hackathon"), inArray(schema.searchEmbeddings.entityId, entityIds)),
        ));
    const entityEmbeddings = new Map(
      entityEmbeddingRows.map((row) => [`${row.entityType}:${row.entityId}`, row]),
    );
    let rankedPeople = peopleList;
    if (queryEmbedding && peopleList.length > 0) {
      const embeddingRows = await db.select({
        id: schema.users.id,
        vector: schema.users.profileEmbedding,
        modelVersion: schema.users.profileEmbeddingModel,
        taxonomyVersion: schema.users.profileEmbeddingTaxonomy,
        preparationVersion: schema.users.profileEmbeddingPreparation,
        sourceHash: schema.users.profileEmbeddingSourceHash,
        status: schema.users.profileEmbeddingStatus,
      }).from(schema.users).where(inArray(schema.users.id, peopleList.map((person) => person.id)));
      const byId = new Map(embeddingRows.map((row) => [row.id, row]));
      const requestedSkillIds = new Set(skillIds);
      const requestedRoleSlugs = new Set(filters.roleSlugs);
      rankedPeople = peopleList
        .map((person) => {
          const stored = byId.get(person.id);
          const sourceText = profileEmbeddingText({
            bio: person.bio,
            skills: person.topSkills.map((skill) => skill.slug),
            roles: person.roles.map((role) => role.slug),
            experienceLevel: person.experienceLevel,
            commitment: person.commitment,
          });
          const semantic = stored && isCurrentEmbedding({
            vector: stored.vector,
            modelVersion: stored.modelVersion,
            taxonomyVersion: stored.taxonomyVersion,
            preparationVersion: stored.preparationVersion,
            sourceHash: stored.sourceHash,
            status: stored.status,
          }, sourceText)
            ? safeSemanticScore(queryEmbedding, stored.vector)
            : null;
          const matchedSkillNames = person.topSkills
            .filter((skill) => requestedSkillIds.has(skill.id))
            .map((skill) => skill.name);
          const matchedRoleNames = person.roles
            .filter((role) => requestedRoleSlugs.has(role.slug))
            .map((role) => role.name);
          const skillScore = requestedSkillIds.size === 0 ? 0 : matchedSkillNames.length / requestedSkillIds.size;
          const roleScore = requestedRoleSlugs.size === 0 ? 0 : matchedRoleNames.length / requestedRoleSlugs.size;
          const keywordScore = normalizedKeywordScore(
            [person.name, person.bio ?? "", ...person.topSkills.map((skill) => skill.name), ...person.roles.map((role) => role.name)].join(" "),
            filters.q?.split(" ") ?? parsed.terms,
          );
          const availabilityScore = Math.min(1, person.hoursPerWeek / 40);
          const completenessScore = Math.min(1, (
            Number(Boolean(person.bio)) + Number(person.topSkills.length > 0) +
            Number(person.roles.length > 0) + Number(Boolean(person.experienceLevel))
          ) / 4);
          const explanation = explainSearchMatch({
            semanticScore: semantic,
            matchedSkills: matchedSkillNames,
            matchedRoles: matchedRoleNames,
            keywordScore,
            availabilityScore,
            completenessScore,
          });
          return {
            person,
            rank: combineScores({
              ...explanation,
              explicitSkill: skillScore,
              role: roleScore,
            }),
            explanation,
          };
        })
        .sort((left, right) => right.rank - left.rank || left.person.id.localeCompare(right.person.id))
        .map(({ person, explanation }) => ({ ...person, searchExplanation: explanation, matchScore: Math.round(explanation.semanticScore !== null ? combineScores({
          ...explanation,
          explicitSkill: requestedSkillIds.size === 0 ? 0 : explanation.matchedSkills.length / requestedSkillIds.size,
          role: requestedRoleSlugs.size === 0 ? 0 : explanation.matchedRoles.length / requestedRoleSlugs.size,
        }) * 100 : combineScores({
          ...explanation,
          explicitSkill: requestedSkillIds.size === 0 ? 0 : explanation.matchedSkills.length / requestedSkillIds.size,
          role: requestedRoleSlugs.size === 0 ? 0 : explanation.matchedRoles.length / requestedRoleSlugs.size,
        }) * 100) }));
    }

    const searchTerms = [...parsed.terms, ...parsed.explicitSkills, ...parsed.contextualConcepts];
    const skillNames = filters.skillSlugs
      .map((slug) => allSkills.find((s) => s.slug === slug)?.name ?? "")
      .filter(Boolean);
    const needles = [...parsed.roleSlugs, ...skillNames];
    const hackathons = hackathonList
      .map((hackathon) => {
        const keywordScore = normalizedKeywordScore(
          [hackathon.name, hackathon.tagline ?? "", hackathon.description ?? "", ...hackathon.themes].join(" "),
          searchTerms,
        );
        const sourceText = prepareSemanticText({
          kind: "hackathon",
          text: [hackathon.name, hackathon.tagline ?? "", hackathon.description ?? ""].join(" "),
          skills: hackathon.themes,
        });
        const stored = entityEmbeddings.get(`hackathon:${hackathon.id}`);
        const semantic = stored && isCurrentEmbedding(stored, sourceText)
          ? safeSemanticScore(queryEmbedding, stored.vector)
          : null;
        const explanation = explainSearchMatch({
          semanticScore: semantic,
          matchedSkills: skillNames.filter((skill) => hackathon.themes.some((theme) => theme.toLowerCase().includes(skill.toLowerCase()))),
          matchedRoles: needles.filter((role) => hackathon.name.toLowerCase().includes(role.toLowerCase())),
          keywordScore,
          completenessScore: Number(Boolean(hackathon.description || hackathon.tagline)),
        });
        return { hackathon, explanation, rank: combineScores({ ...explanation, explicitSkill: explanation.matchedSkills.length > 0 ? 1 : 0, role: explanation.matchedRoles.length > 0 ? 1 : 0 }) };
      })
      .sort((a, b) => b.rank - a.rank || a.hackathon.id.localeCompare(b.hackathon.id))
      .map(({ hackathon, explanation }) => ({ ...hackathon, searchExplanation: explanation }));

    /* Team size filter ("4-person team"). */
    let teams = teamList;
    if (filters.teamSize) {
      teams = teams.filter((t) => t.targetSize >= filters.teamSize! && t.memberCount < t.targetSize);
    }

    /* Intent ordering. */
    const intent = parsed.intent;
    teams = teams
      .map((team) => {
        const keywordScore = normalizedKeywordScore(
          [team.name, team.ideaTitle ?? "", team.ideaDomain ?? "", ...team.openRoles, ...team.missingSkills].join(" "),
          searchTerms,
        );
        const sourceText = prepareSemanticText({
          kind: "team",
          text: [team.name, team.ideaTitle ?? "", team.ideaDomain ?? ""].join(" "),
          skills: team.missingSkills,
          roles: team.openRoles,
        });
        const stored = entityEmbeddings.get(`team:${team.id}`);
        const semantic = stored && isCurrentEmbedding(stored, sourceText)
          ? safeSemanticScore(queryEmbedding, stored.vector)
          : null;
        const explanation = explainSearchMatch({
          semanticScore: semantic,
          matchedSkills: team.missingSkills.filter((skill) => skillNames.some((wanted) => wanted.toLowerCase() === skill.toLowerCase())),
          matchedRoles: team.openRoles.filter((role) => parsed.roleSlugs.some((wanted) => role.toLowerCase().includes(wanted.replace(/-/g, " ")))),
          keywordScore,
          completenessScore: team.completeness / 100,
        });
        return { team, explanation, rank: combineScores({ ...explanation, explicitSkill: explanation.matchedSkills.length > 0 ? 1 : 0, role: explanation.matchedRoles.length > 0 ? 1 : 0 }) };
      })
      .sort((a, b) => b.rank - a.rank || a.team.id.localeCompare(b.team.id))
      .map(({ team, explanation }) => ({ ...team, searchExplanation: explanation }));

    return ok({
      parsed: {
        raw: parsed.raw,
        intent,
        skills: parsed.skillSlugs,
        roles: parsed.roleSlugs,
        teamSize: parsed.teamSize ?? null,
        terms: parsed.terms,
        explicitSkills: parsed.explicitSkills,
        contextualConcepts: parsed.contextualConcepts,
        relatedSuggestions: parsed.relatedSuggestions,
        excludedSkills: parsed.excludedSkills,
      },
      hackathons: hackathons.slice(0, 10),
      teams: teams.slice(0, 12),
      people: rankedPeople.slice(0, 12),
      semantic: { requested: Boolean(embeddingParam), available: Boolean(queryEmbedding) },
    });
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { q?: unknown; embedding?: unknown } | null;
  if (!body || typeof body.q !== "string") return fail("Search query is required", 422);
  const forwardedHeaders = new Headers(req.headers);
  if (body.embedding !== undefined) {
    if (!validateEmbedding(body.embedding)) return fail("Invalid semantic query embedding", 422);
    forwardedHeaders.set("x-semantic-embedding", JSON.stringify(body.embedding));
  }
  const url = new URL(req.url);
  url.searchParams.set("q", body.q);
  return GET(new NextRequest(url, { headers: forwardedHeaders }));
}
