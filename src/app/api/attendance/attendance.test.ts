import assert from "node:assert/strict";
import test from "node:test";
import { attendancePostSchema, attendanceStatusSchema } from "@/lib/validations";
import {
  calculateAttendanceRate,
  recordAttendance,
  getAttendance,
  type RecordAttendanceDeps,
  type QueryAttendanceDeps,
} from "./route";
import type { Attendance, AttendanceStatus } from "@/lib/db/schema";

const callerTeammate = { id: "11111111-1111-4111-8111-111111111111", email: "teammate@example.com" };
const targetUser = { id: "22222222-2222-4222-8222-222222222222", email: "target@example.com" };
const unrelatedUser = { id: "33333333-3333-4333-8333-333333333333", email: "stranger@example.com" };
const hackathonId = "44444444-4444-4444-8444-444444444444";
const teamId = "55555555-5555-4555-8555-555555555555";

/** Helper mock attendance record generator */
function mockAttendanceRecord(overrides: Partial<Attendance> = {}): Attendance {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    userId: targetUser.id,
    hackathonId,
    teamId,
    markedByUserId: callerTeammate.id,
    status: "present",
    createdAt: new Date("2026-09-27T10:00:00Z"),
    updatedAt: new Date("2026-09-27T10:00:00Z"),
    ...overrides,
  };
}

// 1. Valid attendance creation
test("1. valid attendance creation creates record with markedByUserId", async () => {
  let createdPayload: any = null;
  const deps: RecordAttendanceDeps = {
    findSharedActiveTeam: async () => ({ teamId }),
    upsertAttendance: async (data) => {
      createdPayload = data;
      return mockAttendanceRecord(data);
    },
  };

  const res = await recordAttendance(
    callerTeammate,
    { userId: targetUser.id, hackathonId, status: "present" },
    deps,
  );

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.success, true);
  assert.equal(res.data.attendance.status, "present");
  assert.equal(createdPayload.markedByUserId, callerTeammate.id);
  assert.equal(createdPayload.teamId, teamId);
});

// 2. Updating an existing attendance record (upsert)
test("2. updating an existing attendance record updates status and markedByUserId", async () => {
  const secondCaller = { id: "77777777-7777-4777-8777-777777777777", email: "lead@example.com" };
  let updatedPayload: any = null;

  const deps: RecordAttendanceDeps = {
    findSharedActiveTeam: async () => ({ teamId }),
    upsertAttendance: async (data) => {
      updatedPayload = data;
      return mockAttendanceRecord({
        ...data,
        updatedAt: new Date("2026-09-27T12:00:00Z"),
      });
    },
  };

  const res = await recordAttendance(
    secondCaller,
    { userId: targetUser.id, hackathonId, status: "late" },
    deps,
  );

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.attendance.status, "late");
  assert.equal(updatedPayload.markedByUserId, secondCaller.id);
});

// 3. Invalid status
test("3. invalid status is rejected by Zod schema and returns 422", async () => {
  const deps: RecordAttendanceDeps = {
    findSharedActiveTeam: async () => ({ teamId }),
    upsertAttendance: async (data) => mockAttendanceRecord(data),
  };

  const res = await recordAttendance(
    callerTeammate,
    { userId: targetUser.id, hackathonId, status: "excused" },
    deps,
  );

  assert.equal(res.status, 422);
  assert.ok("error" in res);
});

// 4. Unauthenticated POST
test("4. unauthenticated POST returns 401 Unauthorized", async () => {
  const deps: RecordAttendanceDeps = {
    findSharedActiveTeam: async () => ({ teamId }),
    upsertAttendance: async (data) => mockAttendanceRecord(data),
  };

  const res = await recordAttendance(
    null,
    { userId: targetUser.id, hackathonId, status: "present" },
    deps,
  );

  assert.equal(res.status, 401);
  assert.ok("error" in res);
  assert.equal(res.error, "Unauthorized");
});

// 5. Self-marking rejection
test("5. self-marking rejection returns 400 Bad Request", async () => {
  const deps: RecordAttendanceDeps = {
    findSharedActiveTeam: async () => ({ teamId }),
    upsertAttendance: async (data) => mockAttendanceRecord(data),
  };

  const res = await recordAttendance(
    callerTeammate,
    { userId: callerTeammate.id, hackathonId, status: "present" },
    deps,
  );

  assert.equal(res.status, 400);
  assert.ok("error" in res);
  assert.equal(res.error, "You cannot mark your own attendance; a teammate must mark it");
});

// 6. Cross-team POST rejection
test("6. cross-team POST rejection returns 403 when users are not on the same team", async () => {
  const deps: RecordAttendanceDeps = {
    findSharedActiveTeam: async () => null, // No shared team found
    upsertAttendance: async (data) => mockAttendanceRecord(data),
  };

  const res = await recordAttendance(
    callerTeammate,
    { userId: unrelatedUser.id, hackathonId, status: "present" },
    deps,
  );

  assert.equal(res.status, 403);
  assert.ok("error" in res);
  assert.equal(res.error, "You must share an active team with this member for this hackathon");
});

// 7. Former/inactive team member rejection
test("7. former/inactive team member rejection returns 403 when team is disbanded", async () => {
  const deps: RecordAttendanceDeps = {
    findSharedActiveTeam: async () => null, // Disbanded teams excluded by query filter
    upsertAttendance: async (data) => mockAttendanceRecord(data),
  };

  const res = await recordAttendance(
    callerTeammate,
    { userId: targetUser.id, hackathonId, status: "present" },
    deps,
  );

  assert.equal(res.status, 403);
  assert.ok("error" in res);
});

// 8. Own GET attendance
test("8. own GET attendance returns 200 with counts and records", async () => {
  const records = [
    {
      id: "rec-1",
      hackathonId,
      teamId,
      status: "present" as AttendanceStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const deps: QueryAttendanceDeps = {
    findSharedActiveTeamAnyHackathon: async () => null,
    getUserAttendanceRecords: async () => records,
  };

  const res = await getAttendance(callerTeammate, callerTeammate.id, deps);

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.userId, callerTeammate.id);
  assert.equal(res.data.counts.present, 1);
  assert.equal(res.data.counts.total, 1);
  assert.equal(res.data.counts.rate, 100);
  assert.equal(res.data.records.length, 1);
});

// 9. Teammate GET attendance
test("9. teammate GET attendance returns 200 with records when sharing an active team", async () => {
  const records = [
    {
      id: "rec-2",
      hackathonId,
      teamId,
      status: "late" as AttendanceStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const deps: QueryAttendanceDeps = {
    findSharedActiveTeamAnyHackathon: async () => ({ teamId }),
    getUserAttendanceRecords: async () => records,
  };

  const res = await getAttendance(callerTeammate, targetUser.id, deps);

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.userId, targetUser.id);
  assert.equal(res.data.counts.late, 1);
  assert.equal(res.data.counts.total, 1);
  assert.equal(res.data.counts.rate, 100);
  assert.equal(res.data.records.length, 1);
});

// 10. Unrelated-user GET rejection
test("10. unrelated-user GET rejection returns 403 Forbidden with zero data exposure", async () => {
  const deps: QueryAttendanceDeps = {
    findSharedActiveTeamAnyHackathon: async () => null, // Not a teammate
    getUserAttendanceRecords: async () => [
      {
        id: "rec-3",
        hackathonId,
        teamId,
        status: "present" as AttendanceStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const res = await getAttendance(callerTeammate, unrelatedUser.id, deps);

  assert.equal(res.status, 403);
  assert.ok("error" in res);
  assert.equal(res.error, "Forbidden: You can only view attendance for yourself or your active teammates");
});

// 11. Attendance counts and rate calculation
test("11. attendance counts and rate calculation verifies all formula cases", () => {
  // Empty history -> null
  assert.equal(calculateAttendanceRate(0, 0, 0), null);

  // 100% Present
  assert.equal(calculateAttendanceRate(5, 0, 5), 100);

  // Present + late combined
  assert.equal(calculateAttendanceRate(3, 1, 4), 100);

  // Partial attendance (2 present, 0 late, 4 total = 50%)
  assert.equal(calculateAttendanceRate(2, 0, 4), 50);

  // All absent (0 present, 0 late, 3 absent = 0%)
  assert.equal(calculateAttendanceRate(0, 0, 3), 0);

  // Rounding precision (1 of 3 = 33%)
  assert.equal(calculateAttendanceRate(1, 0, 3), 33);
});
