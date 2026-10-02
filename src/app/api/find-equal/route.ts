import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, fail, withPublic } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { scorePersonForTeam, type PersonMatchInput } from "@/lib/matching/engine";
import { getProfile, people } from "@/lib/queries/people";
import type { EqualCandidateDTO } from "@/lib/queries/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

function personInput(profile: Profile): PersonMatchInput {
  return {
    userId: profile.id,
    skills: profile.skills.map((skill) => ({ skillId: skill.id, level: skill.level ?? 3 })),
    primaryRoleCategory: profile.roles.find((role) => role.isPrimary)?.slug ?? null,
    roleCategories: profile.roles.map((role) => role.slug),
    availability: profile.availability ?? {
      weekends: false,
      evenings: false,
      overnight: false,
      hoursPerWeek: profile.hoursPerWeek,
    },
    commitment: profile.commitment,
    experienceLevel: profile.experienceLevel,
    emergencyAvailable: profile.emergencyAvailable,
  };
}

/** Cap on how many candidates get a full profile fetch + match scoring.
 *  Each scored candidate costs one getProfile (≈7 queries), so an
 *  unbounded loop over the whole directory was a query amplifier — a
 *  single request could fire 700+ queries. 24 karma-nearest candidates
 *  comfortably fills the top-8 response at a bounded cost. */
const MAX_SCORED_CANDIDATES = 24;

export async function GET(req: NextRequest) {
  /* Public but expensive (matching engine + profile fan-out): tight
     per-IP budget, tighter than the directory endpoints. */
  const rl = rateLimit(req, { key: "find-equal", limit: 12, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  return withPublic(async () => {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return fail("userId query parameter is required");
    if (!UUID_RE.test(userId)) return fail("userId must be a UUID");

    const [ownerRows, ownerProfile] = await Promise.all([
      db
        .select({ id: schema.users.id, reputationScore: schema.users.reputationScore })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1),
      getProfile(userId),
    ]);
    if (!ownerRows[0] || !ownerProfile) return fail("User not found", 404);

    const ownerKarma = ownerRows[0].reputationScore;
    const karmaLimit = Math.max(ownerKarma * 0.15, 10);
    const cards = await people({ limit: 100 });
    const candidateIds = cards
      .filter((person) => person.id !== userId)
      .map((person) => person.id);
    if (candidateIds.length === 0) return ok([] satisfies EqualCandidateDTO[]);

    const karmaRows = await db
      .select({ id: schema.users.id, karma: schema.users.reputationScore })
      .from(schema.users)
      .where(inArray(schema.users.id, candidateIds));
    const karmaByUser = new Map(karmaRows.map((row) => [row.id, row.karma]));
    const eligibleCards = cards.filter((person) => {
      const karma = karmaByUser.get(person.id);
      return karma !== undefined && Math.abs(karma - ownerKarma) <= karmaLimit;
    });
    if (eligibleCards.length === 0) return ok([] satisfies EqualCandidateDTO[]);

    /* Bound the fan-out: score only the karma-nearest candidates. */
    const toScore = eligibleCards
      .sort(
        (a, b) =>
          Math.abs((karmaByUser.get(a.id) ?? 0) - ownerKarma) -
          Math.abs((karmaByUser.get(b.id) ?? 0) - ownerKarma),
      )
      .slice(0, MAX_SCORED_CANDIDATES);

    const ownerInput = personInput(ownerProfile);
    const equalTeam = {
      teamId: `equal:${userId}`,
      commitment: ownerInput.commitment ?? "serious",
      hoursPerWeekExpected: ownerInput.availability.hoursPerWeek,
      memberExperience: ownerInput.experienceLevel ? [ownerInput.experienceLevel] : [],
      openRoles: ownerInput.roleCategories,
      wantedSkillIds: ownerInput.skills.map((skill) => skill.skillId),
      memberSkillIds: [],
    };

    const scored = await Promise.all(
      toScore.map(async (card) => {
        const profile = await getProfile(card.id);
        const karma = karmaByUser.get(card.id);
        if (!profile || karma === undefined) return null;
        const match = scorePersonForTeam(personInput(profile), equalTeam);
        return { ...card, matchScore: match.score, karma } satisfies EqualCandidateDTO;
      }),
    );

    return ok(
      scored
        .filter((candidate): candidate is EqualCandidateDTO => candidate !== null)
        .sort(
          (a, b) =>
            b.matchScore - a.matchScore ||
            Math.abs(a.karma - ownerKarma) - Math.abs(b.karma - ownerKarma),
        )
        .slice(0, 8),
    );
  });
}