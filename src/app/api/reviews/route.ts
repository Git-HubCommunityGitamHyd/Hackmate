import { NextRequest } from "next/server";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { ok, fail, isUuid, requireUser, type SessionUser } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { reviewPostSchema } from "@/lib/validations";
import type { PerformanceReview } from "@/lib/db/schema";

/**
 * Calculates average rating rounded to 1 decimal place.
 * Returns null if no ratings exist.
 */
export function calculateAverageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Number((sum / ratings.length).toFixed(1));
}

/** Dependencies for recording a teammate review (enables clean unit testing). */
export interface RecordReviewDeps {
  getHackathonStartTime: (hackathonId: string) => Promise<{ startsAt: Date } | null>;
  findSharedActiveTeam: (callerId: string, revieweeId: string, hackathonId: string) => Promise<{ teamId: string } | null>;
  upsertReview: (data: {
    reviewerId: string;
    revieweeId: string;
    hackathonId: string;
    teamId: string;
    rating: number;
    comment: string | null;
  }) => Promise<PerformanceReview>;
}

const defaultRecordDeps: RecordReviewDeps = {
  getHackathonStartTime: async (hackathonId) => {
    const [hackathon] = await db
      .select({ startsAt: schema.hackathons.startsAt })
      .from(schema.hackathons)
      .where(eq(schema.hackathons.id, hackathonId))
      .limit(1);
    return hackathon ?? null;
  },
  findSharedActiveTeam: async (callerId, revieweeId, hackathonId) => {
    const [sharedTeam] = await db
      .select({ teamId: schema.teamMembers.teamId })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(
        and(
          eq(schema.teamMembers.userId, callerId),
          eq(schema.teams.hackathonId, hackathonId),
          ne(schema.teams.status, "disbanded"),
          inArray(
            schema.teams.id,
            db
              .select({ teamId: schema.teamMembers.teamId })
              .from(schema.teamMembers)
              .where(eq(schema.teamMembers.userId, revieweeId)),
          ),
        ),
      )
      .limit(1);
    return sharedTeam ?? null;
  },
  upsertReview: async (data) => {
    const [saved] = await db
      .insert(schema.performanceReviews)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          schema.performanceReviews.reviewerId,
          schema.performanceReviews.revieweeId,
          schema.performanceReviews.hackathonId,
        ],
        set: {
          teamId: data.teamId,
          rating: data.rating,
          comment: data.comment,
          updatedAt: new Date(),
        },
      })
      .returning();
    return saved;
  },
};

/**
 * Core business logic for creating/updating a review.
 */
export async function recordReview(
  caller: SessionUser | null,
  body: unknown,
  deps: RecordReviewDeps = defaultRecordDeps,
  now: Date = new Date(),
): Promise<{ status: 200; data: { success: true; review: PerformanceReview } } | { status: number; error: string }> {
  if (!caller) return { status: 401, error: "Unauthorized" };

  const parsed = reviewPostSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 422, error: parsed.error.issues[0]?.message ?? "Invalid review payload" };
  }

  const { revieweeId, hackathonId, rating, comment } = parsed.data;

  /* Rule: Self-reviews are strictly rejected */
  if (caller.id === revieweeId) {
    return { status: 400, error: "You cannot review yourself" };
  }

  /* Rule: Hackathon must exist and must have started */
  const hackathon = await deps.getHackathonStartTime(hackathonId);
  if (!hackathon) {
    return { status: 404, error: "Hackathon not found" };
  }

  if (now < hackathon.startsAt) {
    return { status: 400, error: "Reviews are only allowed after the hackathon has started" };
  }

  /* Rule: Reviewer and reviewee must share an active team for this hackathon */
  const sharedTeam = await deps.findSharedActiveTeam(caller.id, revieweeId, hackathonId);
  if (!sharedTeam) {
    return { status: 403, error: "You must share an active team with this member for this hackathon" };
  }

  const saved = await deps.upsertReview({
    reviewerId: caller.id,
    revieweeId,
    hackathonId,
    teamId: sharedTeam.teamId,
    rating,
    comment: comment?.trim() ? comment.trim() : null,
  });

  return { status: 200, data: { success: true, review: saved } };
}

/** Dependencies for querying reviews (enables clean unit testing). */
export interface QueryReviewDeps {
  findSharedActiveTeamAnyHackathon: (callerId: string, targetUserId: string) => Promise<{ teamId: string } | null>;
  getUserReviews: (userId: string) => Promise<Array<{
    id: string;
    hackathonId: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
  }>>;
}

const defaultQueryDeps: QueryReviewDeps = {
  findSharedActiveTeamAnyHackathon: async (callerId, targetUserId) => {
    const [sharedTeam] = await db
      .select({ teamId: schema.teamMembers.teamId })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(
        and(
          eq(schema.teamMembers.userId, callerId),
          ne(schema.teams.status, "disbanded"),
          inArray(
            schema.teams.id,
            db
              .select({ teamId: schema.teamMembers.teamId })
              .from(schema.teamMembers)
              .where(eq(schema.teamMembers.userId, targetUserId)),
          ),
        ),
      )
      .limit(1);
    return sharedTeam ?? null;
  },
  getUserReviews: async (userId) => {
    return db
      .select({
        id: schema.performanceReviews.id,
        hackathonId: schema.performanceReviews.hackathonId,
        rating: schema.performanceReviews.rating,
        comment: schema.performanceReviews.comment,
        createdAt: schema.performanceReviews.createdAt,
      })
      .from(schema.performanceReviews)
      .where(eq(schema.performanceReviews.revieweeId, userId))
      .orderBy(desc(schema.performanceReviews.createdAt));
  },
};

/**
 * Core business logic for querying teammate reviews.
 */
export async function getReviews(
  caller: SessionUser | null,
  targetUserId: string,
  deps: QueryReviewDeps = defaultQueryDeps,
): Promise<{
  status: 200;
  data: {
    userId: string;
    averageRating: number | null;
    reviewCount: number;
    recentComments: Array<{ id: string; rating: number; comment: string; createdAt: string }>;
  };
} | { status: number; error: string }> {
  if (!caller) return { status: 401, error: "Unauthorized" };

  const isSelf = targetUserId === caller.id;

  /* Strict privacy rule: if viewing another user's reviews, must share an active team */
  if (!isSelf) {
    const sharedActiveTeam = await deps.findSharedActiveTeamAnyHackathon(caller.id, targetUserId);
    if (!sharedActiveTeam) {
      return { status: 403, error: "Forbidden: You can only view reviews for yourself or your active teammates" };
    }
  }

  const rows = await deps.getUserReviews(targetUserId);
  const ratings = rows.map((r) => r.rating);
  const averageRating = calculateAverageRating(ratings);
  const reviewCount = rows.length;

  const recentComments = rows
    .filter((r): r is typeof r & { comment: string } => Boolean(r.comment))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }));

  return {
    status: 200,
    data: {
      userId: targetUserId,
      averageRating,
      reviewCount,
      recentComments,
    },
  };
}

/**
 * POST /api/reviews
 * Next.js App Router entrypoint. Rate-limited and error-sanitized so a
 * driver failure can never leak an internal stack to the client.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "reviews-post", limit: 20, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);
  try {
    const caller = await requireUser();
    const body = await req.json().catch(() => ({}));
    const result = await recordReview(caller, body);
    if ("error" in result) {
      return fail(result.error, result.status);
    }
    return ok(result.data);
  } catch (err) {
    console.error("[api:error]", err);
    return fail("Internal server error", 500);
  }
}

/**
 * GET /api/reviews?userId=...
 * Next.js App Router entrypoint.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, { key: "reviews-get", limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);
  const caller = await requireUser();
  if (!caller) return fail("Unauthorized", 401);
  const targetUserId = req.nextUrl.searchParams.get("userId") || caller.id;
  /* Malformed ids must 404 here — a bad uuid would otherwise surface as a
     Postgres "invalid input syntax" 500 (found by the pentest suite). */
  if (!isUuid(targetUserId)) return fail("User not found", 404);
  try {
    const result = await getReviews(caller, targetUserId);
    if ("error" in result) {
      return fail(result.error, result.status);
    }
    return ok(result.data);
  } catch (err) {
    console.error("[api:error]", err);
    return fail("Internal server error", 500);
  }
}
