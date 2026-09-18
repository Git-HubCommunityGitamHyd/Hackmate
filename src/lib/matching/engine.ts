/**
 * Deterministic matching engine — NO AI in v1, by design.
 *
 * Pipeline: SQL prefilter (narrow to plausible candidates) → TypeScript
 * weighted scoring (below) over ~50 candidates.
 *
 * Weights (product decision, easy to tune):
 *   skill overlap      40%
 *   availability       20%
 *   commitment         15%
 *   experience delta   15%
 *   role fit           10%
 */

import type { Commitment, ExperienceLevel } from "@/lib/db/schema";

const COMMITMENT_ORDER: Commitment[] = [
  "casual",
  "serious",
  "aiming_to_qualify",
  "aiming_to_win",
];
const EXPERIENCE_ORDER: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

export interface PersonMatchInput {
  userId: string;
  skills: { skillId: string; level: number }[];
  primaryRoleCategory?: string | null; // role slug e.g. "backend"
  roleCategories: string[]; // slugs of all their roles
  availability: {
    weekends: boolean;
    evenings: boolean;
    overnight: boolean;
    hoursPerWeek: number;
  };
  commitment?: Commitment | null;
  experienceLevel?: ExperienceLevel | null;
  emergencyAvailable?: boolean;
}

export interface TeamMatchInput {
  teamId: string;
  commitment: Commitment;
  hoursPerWeekExpected: number; // derived from commitment
  memberExperience: ExperienceLevel[]; // experience levels of current members
  openRoles: string[]; // role slugs still unfilled
  wantedSkillIds: string[]; // skills the team explicitly wants
  memberSkillIds: string[]; // skills already covered by members
}

export interface MatchBreakdown {
  skillFit: number;
  availabilityFit: number;
  commitmentFit: number;
  experienceFit: number;
  roleFit: number;
}

export interface MatchResult {
  score: number; // 0..100
  breakdown: MatchBreakdown;
  reasons: string[]; // human explanation for UI transparency
}

const WEIGHTS = { skill: 0.4, availability: 0.2, commitment: 0.15, experience: 0.15, role: 0.1 };

export const HOURS_BY_COMMITMENT: Record<Commitment, number> = {
  casual: 8,
  serious: 20,
  aiming_to_qualify: 30,
  aiming_to_win: 40,
};

/** Score one person against one team's open slot. Deterministic. */
export function scorePersonForTeam(
  person: PersonMatchInput,
  team: TeamMatchInput,
): MatchResult {
  /* --- 1. Skill fit (40%) --------------------------------------- */
  // How many explicitly-wanted skills does this person bring, weighted by level?
  const wanted = new Set(team.wantedSkillIds);
  const covered = new Set(team.memberSkillIds);
  const personSkillMap = new Map(person.skills.map((s) => [s.skillId, s.level]));

  let skillPoints = 0;
  let skillMax = 0;
  const broughtSkills: string[] = [];
  for (const wantedId of wanted) {
    skillMax += 5;
    if (covered.has(wantedId)) continue; // team already has it → no credit
    const level = personSkillMap.get(wantedId);
    if (level) {
      skillPoints += level;
      if (level >= 4) broughtSkills.push(wantedId);
    }
  }
  const skillFit = skillMax === 0 ? 0.5 : skillPoints / skillMax;

  /* --- 2. Availability fit (20%) -------------------------------- */
  // Hours compatibility (60% of this block) + time-of-day overlap (40%).
  const expected = team.hoursPerWeekExpected;
  const offered = person.availability.hoursPerWeek;
  const hoursRatio =
    offered >= expected ? 1 : offered / Math.max(expected, 1);
  const personWindows = [
    person.availability.weekends,
    person.availability.evenings,
    person.availability.overnight,
  ];
  const windowScore = personWindows.filter(Boolean).length / 3;
  const availabilityFit = 0.6 * hoursRatio + 0.4 * windowScore;

  /* --- 3. Commitment alignment (15%) ----------------------------- */
  let commitmentFit = 0.5;
  if (person.commitment && team.commitment) {
    const pIdx = COMMITMENT_ORDER.indexOf(person.commitment);
    const tIdx = COMMITMENT_ORDER.indexOf(team.commitment);
    const delta = Math.abs(pIdx - tIdx);
    commitmentFit = delta === 0 ? 1 : delta === 1 ? 0.6 : 0.2;
  }

  /* --- 4. Experience delta (15%) --------------------------------- */
  let experienceFit = 0.5;
  if (person.experienceLevel && team.memberExperience.length > 0) {
    const pIdx = EXPERIENCE_ORDER.indexOf(person.experienceLevel);
    const avg =
      team.memberExperience.reduce(
        (sum, e) => sum + EXPERIENCE_ORDER.indexOf(e),
        0,
      ) / team.memberExperience.length;
    experienceFit = Math.max(0, 1 - Math.abs(pIdx - avg) / 2);
  }

  /* --- 5. Role fit (10%) ------------------------------------------ */
  const openRoles = new Set(team.openRoles);
  let roleFit = 0.2; // baseline: unspecified
  if (person.primaryRoleCategory && openRoles.has(person.primaryRoleCategory)) {
    roleFit = 1;
  } else if (person.roleCategories.some((r) => openRoles.has(r))) {
    roleFit = 0.7;
  }

  const total =
    WEIGHTS.skill * skillFit +
    WEIGHTS.availability * availabilityFit +
    WEIGHTS.commitment * commitmentFit +
    WEIGHTS.experience * experienceFit +
    WEIGHTS.role * roleFit;

  /* --- Human-readable reasons ------------------------------------ */
  const reasons: string[] = [];
  if (skillFit > 0.6) reasons.push("Has the skills this team is missing");
  else if (skillFit > 0.25) reasons.push("Partially covers the skills wanted");
  if (hoursRatio >= 1) reasons.push("Available for the hours this team needs");
  else if (hoursRatio >= 0.6) reasons.push("Close to the team's expected hours");
  if (commitmentFit === 1) reasons.push("Same commitment level as the team");
  if (roleFit === 1) reasons.push("Fills an open role");
  if (person.emergencyAvailable) reasons.push("Emergency available — can join now");
  if (broughtSkills.length > 0) {
    reasons.push(`Brings ${broughtSkills.length} strong skill${broughtSkills.length > 1 ? "s" : ""} the team listed`);
  }

  return {
    score: Math.round(total * 100),
    breakdown: {
      skillFit: round2(skillFit),
      availabilityFit: round2(availabilityFit),
      commitmentFit: round2(commitmentFit),
      experienceFit: round2(experienceFit),
      roleFit: round2(roleFit),
    },
    reasons: reasons.slice(0, 4),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
