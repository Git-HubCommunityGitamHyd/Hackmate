import { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, fail, withPublic } from "@/lib/api";
import {
  computeKarma,
  type KarmaCounts,
  type ReputationDTO,
} from "@/lib/reputation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Load the five counts karma is built from.
 *
 * Four round trips rather than five: completions and podiums are two
 * filtered aggregates over the same hackathon_result scan.
 */
async function loadKarmaCounts(userId: string): Promise<KarmaCounts> {
  const [attendanceRows, resultRows, reviewRows, cancellationRows] =
    await Promise.all([
      db
        .select({ present: sql<number>`count(*)::int` })
        .from(schema.attendance)
        .where(
          and(
            eq(schema.attendance.userId, userId),
            eq(schema.attendance.status, "present"),
          ),
        ),
      db
        .select({
          completed: sql<number>`count(*)::int`,
          podiums: sql<number>`count(*) filter (where ${schema.hackathonResults.placement} between 1 and 3)::int`,
        })
        .from(schema.hackathonResults)
        .where(eq(schema.hackathonResults.userId, userId)),
      db
        .select({
          ratingCount: sql<number>`count(*)::int`,
          /* NULL when there are no rows — mapped to null below, never 0,
             so "unrated" stays distinct from "rated badly". */
          avgRating: sql<number | null>`avg(${schema.performanceReviews.rating})::float8`,
        })
        .from(schema.performanceReviews)
        .where(eq(schema.performanceReviews.revieweeId, userId)),
      db
        .select({ lastMinute: sql<number>`count(*)::int` })
        .from(schema.cancellationHistory)
        .where(
          and(
            eq(schema.cancellationHistory.userId, userId),
            eq(schema.cancellationHistory.isLastMinute, true),
          ),
        ),
    ]);

  const ratingCount = reviewRows[0]?.ratingCount ?? 0;

  return {
    attendancePresent: attendanceRows[0]?.present ?? 0,
    hackathonsCompleted: resultRows[0]?.completed ?? 0,
    podiumFinishes: resultRows[0]?.podiums ?? 0,
    ratingCount,
    avgRating: ratingCount > 0 ? (reviewRows[0]?.avgRating ?? null) : null,
    lastMinuteCancellations: cancellationRows[0]?.lastMinute ?? 0,
  };
}

/**
 * GET /api/reputation?userId=<uuid>
 *
 * Recomputes karma from source rows on every call — a profile view is the
 * trigger, so the number is always current and no write route needs to know
 * this endpoint exists. `user.reputation_score` is then refreshed as a cache
 * for sorting only; it is never read back as the score.
 *
 * Public on purpose: karma is shown on public profiles.
 */
export async function GET(req: NextRequest) {
  return withPublic(async () => {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return fail("userId query parameter is required");
    if (!UUID_RE.test(userId)) return fail("userId must be a UUID");

    /* Confirm the user exists first: otherwise every unknown id would come
       back as a confident-looking 0 karma. */
    const [user] = await db
      .select({
        id: schema.users.id,
        cachedScore: schema.users.reputationScore,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!user) return fail("User not found", 404);

    const counts = await loadKarmaCounts(userId);
    const result = computeKarma(counts);

    /* Refresh the sort cache only when it actually moved — a profile view
       shouldn't write on every request. Failure here is non-fatal: the
       caller still gets the freshly computed score. */
    if (user.cachedScore !== result.score) {
      await db
        .update(schema.users)
        .set({ reputationScore: result.score })
        .where(eq(schema.users.id, userId))
        .catch((err) => {
          console.error("[api:reputation] score cache update failed", err);
        });
    }

    const dto: ReputationDTO = { userId, counts, ...result };
    return ok(dto);
  });
}
