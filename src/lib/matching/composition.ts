/**
 * Team Composition Intelligence — gap analysis over the role taxonomy.
 *
 * Instead of "Rahul – 92% match", we tell teams:
 *   "Your team has strong ML and frontend coverage. You have no member with
 *    backend/cloud experience. Arjun knows FastAPI, PostgreSQL and AWS and
 *    is available for the entire hackathon."
 */

import type { SkillCategory } from "@/lib/db/schema";
import { ROLE_TAXONOMY } from "@/lib/constants";

export interface MemberSignal {
  userId: string;
  name: string;
  roleSlugs: string[]; // roles this member fills
  skillCategories: Set<SkillCategory>;
  availableAllThrough: boolean;
  commitment?: string | null;
}

export interface CandidateSignal {
  userId: string;
  name: string;
  roleSlugs: string[];
  topSkills: string[]; // skill names for the narrative
  skillCategories: Set<SkillCategory>;
  availableAllThrough: boolean;
  emergencyAvailable: boolean;
  matchScore: number;
}

export type Coverage = "strong" | "covered" | "none" | "partial";

export interface RoleCoverage {
  roleSlug: string;
  roleName: string;
  icon: string;
  coverage: Coverage;
  memberNames: string[];
  needed: boolean; // team explicitly listed this role
  priority: "must" | "nice" | null;
}

export interface CompositionReport {
  coverages: RoleCoverage[];
  completenessPercent: number; // filled must-roles / must-roles
  summary: string; // the narrative sentence
  gaps: RoleCoverage[]; // roles with none/partial coverage
  recommendations: {
    userId: string;
    name: string;
    matchScore: number;
    topSkills: string[];
    availableAllThrough: boolean;
    emergencyAvailable: boolean;
    why: string;
  }[];
}

/**
 * Analyze a team's composition. `neededRoles`: roles the team declared
 * (slug + priority). Members contribute coverage via explicit roles AND
 * via the categories of their skills.
 */
export function analyzeComposition(
  members: MemberSignal[],
  neededRoles: { roleSlug: string; priority: "must" | "nice" }[],
  candidates: CandidateSignal[] = [],
  hackathonLabel = "the hackathon",
): CompositionReport {
  const roleMemberMap = new Map<string, string[]>();

  // Count coverage: explicit roles first, then skill categories.
  const counts = new Map<string, number>();
  for (const m of members) {
    for (const slug of m.roleSlugs) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
      roleMemberMap.set(slug, [...(roleMemberMap.get(slug) ?? []), m.name]);
    }
  }
  for (const m of members) {
    for (const role of ROLE_TAXONOMY) {
      const overlaps = role.skillCategories.some((c) => m.skillCategories.has(c));
      if (overlaps && !m.roleSlugs.includes(role.slug)) {
        // A member with backend skills but no explicit backend role still
        // counts as partial coverage — skills are real signal.
        counts.set(role.slug, (counts.get(role.slug) ?? 0) + 0.5);
        roleMemberMap.set(role.slug, [
          ...(roleMemberMap.get(role.slug) ?? []),
          m.name,
        ]);
      }
    }
  }

  const neededMap = new Map(neededRoles.map((r) => [r.roleSlug, r.priority]));

  const coverages: RoleCoverage[] = ROLE_TAXONOMY.map((role) => {
    const count = counts.get(role.slug) ?? 0;
    const coverage: Coverage =
      count >= 2 ? "strong" : count >= 1 ? "covered" : count >= 0.5 ? "partial" : "none";
    return {
      roleSlug: role.slug,
      roleName: role.name,
      icon: role.icon,
      coverage,
      memberNames: [...new Set(roleMemberMap.get(role.slug) ?? [])],
      needed: neededMap.has(role.slug),
      priority: neededMap.get(role.slug) ?? null,
    };
  });

  const mustRoles = coverages.filter((c) => c.priority === "must");
  const filledMust = mustRoles.filter(
    (c) => c.coverage === "covered" || c.coverage === "strong",
  );
  const completenessPercent =
    mustRoles.length === 0
      ? 100
      : Math.round((filledMust.length / mustRoles.length) * 100);

  /* --- narrative summary ---------------------------------------- */
  const strong = coverages.filter((c) => c.coverage === "strong");
  const missing = coverages.filter((c) => c.coverage === "none" && c.needed);
  const parts: string[] = [];
  if (strong.length > 0) {
    parts.push(`Your team has strong ${strong.map((s) => s.roleName).join(" and ")} coverage`);
  }
  if (missing.length > 0) {
    parts.push(
      `You have no member with ${missing.map((m) => m.roleName).join(" or ")} experience`,
    );
  }
  const partial = coverages.filter((c) => c.coverage === "partial");
  if (missing.length === 0 && partial.length > 0) {
    parts.push(
      `${partial.map((p) => p.roleName).join(" and ")} is only partially covered by skills — consider making it explicit`,
    );
  }
  if (parts.length === 0) parts.push("Your team covers every role it needs. Go build.");
  const summary = parts.join(". ") + ".";

  /* --- gap-driven recommendations -------------------------------- */
  const gapSlugs = new Set([
    ...coverages
      .filter((c) => (c.coverage === "none" || c.coverage === "partial") && (c.needed || c.priority === "must"))
      .map((c) => c.roleSlug),
  ]);

  const recommendations = candidates
    .map((cand) => {
      // Does the candidate fill one of the gaps (role or skill category)?
      const fillsRoleGap = cand.roleSlugs.some((r) => gapSlugs.has(r));
      const fillsSkillGap = [...cand.skillCategories].some((cat) =>
        [...gapSlugs].some((slug) => {
          const role = ROLE_TAXONOMY.find((r) => r.slug === slug);
          return role?.skillCategories.includes(cat);
        }),
      );
      if (!fillsRoleGap && !fillsSkillGap) return null;

      const avail = cand.availableAllThrough
        ? `is available for the entire ${hackathonLabel}`
        : "is looking for this event";
      const why = `${cand.name} knows ${cand.topSkills.slice(0, 3).join(", ")} and ${avail}.`;
      return {
        userId: cand.userId,
        name: cand.name,
        matchScore: cand.matchScore,
        topSkills: cand.topSkills,
        availableAllThrough: cand.availableAllThrough,
        emergencyAvailable: cand.emergencyAvailable,
        why,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 4);

  return {
    coverages,
    completenessPercent,
    summary,
    gaps: coverages.filter(
      (c) => c.coverage === "none" && (c.needed || c.priority === "must"),
    ),
    recommendations,
  };
}
