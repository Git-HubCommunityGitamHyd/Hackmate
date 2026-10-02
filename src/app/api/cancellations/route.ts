import { NextRequest } from "next/server";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { ok, fail, isUuid, requireUser, type SessionUser } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Calculates exact cancellation timing:
 * - diffMs = startsAt - leaveTime
 * - hoursBeforeStart = Math.floor(diffMs / (1000 * 60 * 60))
 * - isLastMinute = diffMs >= 0 && diffMs <= 48 hours (in ms)
 */
export function calculateCancellationTiming(startsAt: Date, leaveTime: Date) {
  const diffMs = startsAt.getTime() - leaveTime.getTime();
  const hoursBeforeStart = Math.floor(diffMs / (1000 * 60 * 60));
  const isLastMinute = diffMs >= 0 && diffMs <= FORTY_EIGHT_HOURS_MS;
  return { diffMs, hoursBeforeStart, isLastMinute };
}

/** Dependencies for recording a cancellation on member leave.
 *  hackathonId is nullable: idea-first teams (posted before choosing
 *  an event) have no hackathon, and the inner join below simply won't
 *  match them — no event, no cancellation timing. */
export interface RecordCancellationDeps {
  getTeamWithHackathon: (teamId: string) => Promise<{ hackathonId: string | null; startsAt: Date } | null>;
  insertCancellation: (data: {
    userId: string;
    teamId: string;
    hackathonId: string;
    hoursBeforeStart: number;
    isLastMinute: boolean;
    createdAt: Date;
  }) => Promise<void>;
}

export const defaultRecordDeps: RecordCancellationDeps = {
  getTeamWithHackathon: async (teamId) => {
    const [teamWithHackathon] = await db
      .select({
        hackathonId: schema.teams.hackathonId,
        startsAt: schema.hackathons.startsAt,
      })
      .from(schema.teams)
      .innerJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
      .where(eq(schema.teams.id, teamId))
      .limit(1);
    return teamWithHackathon ?? null;
  },
  insertCancellation: async (data) => {
    await db.insert(schema.cancellationHistory).values(data);
  },
};

/**
 * Records cancellation history when a user leaves a team:
 * - Only voluntary self-leave (callerId === targetUserId) creates a record.
 * - Admin removal (callerId !== targetUserId) does NOT create a cancellation record.
 */
export async function recordCancellationOnLeave(
  callerId: string,
  targetUserId: string,
  teamId: string,
  leaveTime: Date = new Date(),
  deps: RecordCancellationDeps = defaultRecordDeps,
) {
  if (callerId !== targetUserId) {
    return { created: false, reason: "admin_removal" as const };
  }

  const team = await deps.getTeamWithHackathon(teamId);
  if (!team) {
    return { created: false, reason: "team_not_found" as const };
  }
  /* Idea-first team with no event attached yet — nothing to time a
     cancellation against (the join already filters these; this guard
     keeps the contract explicit for the test doubles). */
  if (!team.hackathonId) {
    return { created: false, reason: "no_hackathon" as const };
  }

  const { hoursBeforeStart, isLastMinute } = calculateCancellationTiming(team.startsAt, leaveTime);

  const record = {
    userId: targetUserId,
    teamId,
    hackathonId: team.hackathonId,
    hoursBeforeStart,
    isLastMinute,
    createdAt: leaveTime,
  };

  await deps.insertCancellation(record);

  return {
    created: true,
    cancellation: record,
  };
}

/** Dependencies for querying cancellations (enables clean unit testing). */
export interface QueryCancellationsDeps {
  findSharedActiveTeamAnyHackathon: (callerId: string, targetUserId: string) => Promise<{ teamId: string } | null>;
  getUserCancellations: (userId: string) => Promise<Array<{
    id: string;
    hackathonId: string;
    hackathonName: string;
    hackathonStartsAt: Date;
    teamId: string;
    hoursBeforeStart: number;
    isLastMinute: boolean;
    createdAt: Date;
  }>>;
}

const defaultQueryDeps: QueryCancellationsDeps = {
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
  getUserCancellations: async (userId) => {
    return db
      .select({
        id: schema.cancellationHistory.id,
        hackathonId: schema.cancellationHistory.hackathonId,
        hackathonName: schema.hackathons.name,
        hackathonStartsAt: schema.hackathons.startsAt,
        teamId: schema.cancellationHistory.teamId,
        hoursBeforeStart: schema.cancellationHistory.hoursBeforeStart,
        isLastMinute: schema.cancellationHistory.isLastMinute,
        createdAt: schema.cancellationHistory.createdAt,
      })
      .from(schema.cancellationHistory)
      .innerJoin(schema.hackathons, eq(schema.cancellationHistory.hackathonId, schema.hackathons.id))
      .where(eq(schema.cancellationHistory.userId, userId))
      .orderBy(desc(schema.cancellationHistory.createdAt));
  },
};

/**
 * Core business logic for querying cancellations.
 */
export async function getCancellations(
  caller: SessionUser | null,
  targetUserId: string,
  deps: QueryCancellationsDeps = defaultQueryDeps,
): Promise<{
  status: 200;
  data: {
    userId: string;
    totalCancellations: number;
    lastMinuteCount: number;
    cancellations: Array<{
      id: string;
      hackathonId: string;
      hackathonName: string;
      hackathonStartsAt: string;
      teamId: string;
      hoursBeforeStart: number;
      isLastMinute: boolean;
      createdAt: string;
    }>;
  };
} | { status: number; error: string }> {
  if (!caller) return { status: 401, error: "Unauthorized" };

  const isSelf = targetUserId === caller.id;

  /* Strict privacy rule: if viewing another user's cancellations, must share an active team */
  if (!isSelf) {
    const sharedActiveTeam = await deps.findSharedActiveTeamAnyHackathon(caller.id, targetUserId);
    if (!sharedActiveTeam) {
      return {
        status: 403,
        error: "Forbidden: You can only view cancellation history for yourself or your active teammates",
      };
    }
  }

  const rows = await deps.getUserCancellations(targetUserId);
  const totalCancellations = rows.length;
  const lastMinuteCount = rows.filter((r) => r.isLastMinute).length;

  const cancellations = rows.map((r) => ({
    id: r.id,
    hackathonId: r.hackathonId,
    hackathonName: r.hackathonName,
    hackathonStartsAt: r.hackathonStartsAt.toISOString(),
    teamId: r.teamId,
    hoursBeforeStart: r.hoursBeforeStart,
    isLastMinute: r.isLastMinute,
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    status: 200,
    data: {
      userId: targetUserId,
      totalCancellations,
      lastMinuteCount,
      cancellations,
    },
  };
}

/**
 * GET /api/cancellations?userId=...
 * Next.js App Router entrypoint. Rate-limited, UUID-guarded and
 * error-sanitized like every other route.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, { key: "cancellations-get", limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);
  const caller = await requireUser();
  if (!caller) return fail("Unauthorized", 401);
  const targetUserId = req.nextUrl.searchParams.get("userId") || caller.id;
  /* Malformed ids must 404 here — a bad uuid would otherwise surface as a
     Postgres "invalid input syntax" 500 (found by the pentest suite). */
  if (!isUuid(targetUserId)) return fail("User not found", 404);
  try {
    const result = await getCancellations(caller, targetUserId);
    if ("error" in result) {
      return fail(result.error, result.status);
    }
    return ok(result.data);
  } catch (err) {
    console.error("[api:error]", err);
    return fail("Internal server error", 500);
  }
}
