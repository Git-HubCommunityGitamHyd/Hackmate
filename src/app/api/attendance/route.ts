import { NextRequest } from "next/server";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { ok, fail, requireUser, type SessionUser } from "@/lib/api";
import { attendancePostSchema } from "@/lib/validations";
import type { Attendance, AttendanceStatus } from "@/lib/db/schema";

/**
 * Calculates attendance reliability rate as a percentage: (present + late) / total * 100.
 * Returns null if total is 0.
 */
export function calculateAttendanceRate(present: number, late: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round(((present + late) / total) * 100);
}

/** Dependencies for attendance recording logic (allows clean unit testing). */
export interface RecordAttendanceDeps {
  findSharedActiveTeam: (callerId: string, targetUserId: string, hackathonId: string) => Promise<{ teamId: string } | null>;
  upsertAttendance: (data: {
    userId: string;
    hackathonId: string;
    teamId: string;
    markedByUserId: string;
    status: AttendanceStatus;
  }) => Promise<Attendance>;
}

/** Default database dependencies using real Drizzle ORM queries. */
const defaultRecordDeps: RecordAttendanceDeps = {
  findSharedActiveTeam: async (callerId, targetUserId, hackathonId) => {
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
              .where(eq(schema.teamMembers.userId, targetUserId)),
          ),
        ),
      )
      .limit(1);
    return sharedTeam ?? null;
  },
  upsertAttendance: async (data) => {
    const [saved] = await db
      .insert(schema.attendance)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.attendance.userId, schema.attendance.hackathonId],
        set: {
          teamId: data.teamId,
          markedByUserId: data.markedByUserId,
          status: data.status,
          updatedAt: new Date(),
        },
      })
      .returning();
    return saved;
  },
};

/**
 * Core business logic for recording attendance.
 */
export async function recordAttendance(
  caller: SessionUser | null,
  body: unknown,
  deps: RecordAttendanceDeps = defaultRecordDeps,
): Promise<{ status: 200; data: { success: true; attendance: Attendance } } | { status: number; error: string }> {
  if (!caller) return { status: 401, error: "Unauthorized" };

  const parsed = attendancePostSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 422, error: parsed.error.issues[0]?.message ?? "Invalid attendance payload" };
  }

  const { userId, hackathonId, status } = parsed.data;

  /* Rule: Self-marking is strictly rejected — only a peer teammate can mark attendance */
  if (caller.id === userId) {
    return { status: 400, error: "You cannot mark your own attendance; a teammate must mark it" };
  }

  /* Verify caller and target user share an active (non-disbanded) team for this hackathon */
  const sharedTeam = await deps.findSharedActiveTeam(caller.id, userId, hackathonId);
  if (!sharedTeam) {
    return { status: 403, error: "You must share an active team with this member for this hackathon" };
  }

  const saved = await deps.upsertAttendance({
    userId,
    hackathonId,
    teamId: sharedTeam.teamId,
    markedByUserId: caller.id,
    status,
  });

  return { status: 200, data: { success: true, attendance: saved } };
}

/** Dependencies for attendance query logic (allows clean unit testing). */
export interface QueryAttendanceDeps {
  findSharedActiveTeamAnyHackathon: (callerId: string, targetUserId: string) => Promise<{ teamId: string } | null>;
  getUserAttendanceRecords: (userId: string) => Promise<Array<{
    id: string;
    hackathonId: string;
    teamId: string;
    status: AttendanceStatus;
    createdAt: Date;
    updatedAt: Date;
  }>>;
}

const defaultQueryDeps: QueryAttendanceDeps = {
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
  getUserAttendanceRecords: async (userId) => {
    return db
      .select({
        id: schema.attendance.id,
        hackathonId: schema.attendance.hackathonId,
        teamId: schema.attendance.teamId,
        status: schema.attendance.status,
        createdAt: schema.attendance.createdAt,
        updatedAt: schema.attendance.updatedAt,
      })
      .from(schema.attendance)
      .where(eq(schema.attendance.userId, userId))
      .orderBy(desc(schema.attendance.updatedAt));
  },
};

/**
 * Core business logic for querying attendance.
 */
export async function getAttendance(
  caller: SessionUser | null,
  targetUserId: string,
  deps: QueryAttendanceDeps = defaultQueryDeps,
): Promise<{ status: 200; data: { userId: string; counts: { present: number; late: number; absent: number; total: number; rate: number | null }; records: any[] } } | { status: number; error: string }> {
  if (!caller) return { status: 401, error: "Unauthorized" };

  const isSelf = targetUserId === caller.id;

  /* Strict privacy check: if requesting another user's data, verify shared active team */
  if (!isSelf) {
    const sharedActiveTeam = await deps.findSharedActiveTeamAnyHackathon(caller.id, targetUserId);
    if (!sharedActiveTeam) {
      return { status: 403, error: "Forbidden: You can only view attendance for yourself or your active teammates" };
    }
  }

  const rows = await deps.getUserAttendanceRecords(targetUserId);

  const present = rows.filter((r) => r.status === "present").length;
  const late = rows.filter((r) => r.status === "late").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const total = rows.length;
  const rate = calculateAttendanceRate(present, late, total);

  return {
    status: 200,
    data: {
      userId: targetUserId,
      counts: { present, late, absent, total, rate },
      records: rows,
    },
  };
}

/**
 * POST /api/attendance
 * Next.js App Router entrypoint.
 */
export async function POST(req: NextRequest) {
  const caller = await requireUser();
  const body = await req.json().catch(() => ({}));
  const result = await recordAttendance(caller, body);
  if ("error" in result) {
    return fail(result.error, result.status);
  }
  return ok(result.data);
}

/**
 * GET /api/attendance?userId=...
 * Next.js App Router entrypoint.
 */
export async function GET(req: NextRequest) {
  const caller = await requireUser();
  if (!caller) return fail("Unauthorized", 401);
  const targetUserId = req.nextUrl.searchParams.get("userId") || caller.id;
  const result = await getAttendance(caller, targetUserId);
  if ("error" in result) {
    return fail(result.error, result.status);
  }
  return ok(result.data);
}
