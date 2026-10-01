import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCancellationTiming,
  recordCancellationOnLeave,
  getCancellations,
  type RecordCancellationDeps,
  type QueryCancellationsDeps,
} from "./route";

const userA = { id: "11111111-1111-4111-8111-111111111111", email: "userA@example.com" };
const userB = { id: "22222222-2222-4222-8222-222222222222", email: "userB@example.com" };
const unrelatedUser = { id: "33333333-3333-4333-8333-333333333333", email: "stranger@example.com" };
const hackathonId = "44444444-4444-4444-8444-444444444444";
const teamId = "55555555-5555-4555-8555-555555555555";

const baseHackathonStart = new Date("2026-10-05T12:00:00Z");

// ==========================================
// 1. Timing calculation tests
// ==========================================

test("1. 60h before start -> not last-minute (hoursBeforeStart = 60, isLastMinute = false)", () => {
  const leaveTime = new Date("2026-10-03T00:00:00Z"); // 60h before 2026-10-05T12:00:00Z
  const { diffMs, hoursBeforeStart, isLastMinute } = calculateCancellationTiming(baseHackathonStart, leaveTime);

  assert.equal(diffMs, 60 * 60 * 60 * 1000);
  assert.equal(hoursBeforeStart, 60);
  assert.equal(isLastMinute, false);
});

test("2. 48h 30m before start -> NOT last-minute (hoursBeforeStart = 48, isLastMinute = false)", () => {
  const leaveTime = new Date("2026-10-03T11:30:00Z"); // 48h 30m before 2026-10-05T12:00:00Z
  const { diffMs, hoursBeforeStart, isLastMinute } = calculateCancellationTiming(baseHackathonStart, leaveTime);

  // Exact diff is 48.5 hours = 174,600,000 ms (greater than 48 * 3600 * 1000 = 172,800,000 ms)
  assert.equal(diffMs, 48.5 * 60 * 60 * 1000);
  assert.equal(hoursBeforeStart, 48); // Math.floor(48.5) = 48
  assert.equal(isLastMinute, false); // Crucial: must be false even though floor(hours) is 48
});

test("3. exactly 48h before start -> last-minute (hoursBeforeStart = 48, isLastMinute = true)", () => {
  const leaveTime = new Date("2026-10-03T12:00:00Z"); // exactly 48h before
  const { diffMs, hoursBeforeStart, isLastMinute } = calculateCancellationTiming(baseHackathonStart, leaveTime);

  assert.equal(diffMs, 48 * 60 * 60 * 1000);
  assert.equal(hoursBeforeStart, 48);
  assert.equal(isLastMinute, true);
});

test("4. 24h before start -> last-minute (hoursBeforeStart = 24, isLastMinute = true)", () => {
  const leaveTime = new Date("2026-10-04T12:00:00Z"); // 24h before
  const { diffMs, hoursBeforeStart, isLastMinute } = calculateCancellationTiming(baseHackathonStart, leaveTime);

  assert.equal(diffMs, 24 * 60 * 60 * 1000);
  assert.equal(hoursBeforeStart, 24);
  assert.equal(isLastMinute, true);
});

test("5. exactly at start -> last-minute (hoursBeforeStart = 0, isLastMinute = true)", () => {
  const leaveTime = new Date("2026-10-05T12:00:00Z"); // exactly at start
  const { diffMs, hoursBeforeStart, isLastMinute } = calculateCancellationTiming(baseHackathonStart, leaveTime);

  assert.equal(diffMs, 0);
  assert.equal(hoursBeforeStart, 0);
  assert.equal(isLastMinute, true);
});

test("6. 30m after start -> negative hours (-1) + NOT last-minute (isLastMinute = false)", () => {
  const leaveTime = new Date("2026-10-05T12:30:00Z"); // 30m after start
  const { diffMs, hoursBeforeStart, isLastMinute } = calculateCancellationTiming(baseHackathonStart, leaveTime);

  assert.equal(diffMs, -30 * 60 * 1000); // -1,800,000 ms
  assert.equal(hoursBeforeStart, -1); // Math.floor(-0.5) = -1
  assert.equal(isLastMinute, false);
});

test("7. 5h after start -> negative hours (-5) + NOT last-minute (isLastMinute = false)", () => {
  const leaveTime = new Date("2026-10-05T17:00:00Z"); // 5h after start
  const { diffMs, hoursBeforeStart, isLastMinute } = calculateCancellationTiming(baseHackathonStart, leaveTime);

  assert.equal(diffMs, -5 * 60 * 60 * 1000);
  assert.equal(hoursBeforeStart, -5);
  assert.equal(isLastMinute, false);
});

// ==========================================
// 2. Cancellation creation on leave tests
// ==========================================

test("8. self-leave creates cancellation record", async () => {
  let insertedRecord: any = null;
  const leaveTime = new Date("2026-10-04T12:00:00Z"); // 24h before
  const deps: RecordCancellationDeps = {
    getTeamWithHackathon: async (tid) => ({
      hackathonId,
      startsAt: baseHackathonStart,
    }),
    insertCancellation: async (data) => {
      insertedRecord = data;
    },
  };

  const res = await recordCancellationOnLeave(userA.id, userA.id, teamId, leaveTime, deps);

  assert.equal(res.created, true);
  assert.ok(insertedRecord);
  assert.equal(insertedRecord.userId, userA.id);
  assert.equal(insertedRecord.teamId, teamId);
  assert.equal(insertedRecord.hackathonId, hackathonId);
  assert.equal(insertedRecord.hoursBeforeStart, 24);
  assert.equal(insertedRecord.isLastMinute, true);
  assert.equal(insertedRecord.createdAt, leaveTime);
});

test("9. admin removal of another member does NOT create cancellation record", async () => {
  let inserted = false;
  const leaveTime = new Date("2026-10-04T12:00:00Z");
  const deps: RecordCancellationDeps = {
    getTeamWithHackathon: async () => ({
      hackathonId,
      startsAt: baseHackathonStart,
    }),
    insertCancellation: async () => {
      inserted = true;
    },
  };

  // userA (admin) removes userB
  const res = await recordCancellationOnLeave(userA.id, userB.id, teamId, leaveTime, deps);

  assert.equal(res.created, false);
  assert.equal(res.reason, "admin_removal");
  assert.equal(inserted, false);
});

// ==========================================
// 3. GET /api/cancellations queries & privacy tests
// ==========================================

test("10. unauthenticated GET returns 401 Unauthorized", async () => {
  const res = await getCancellations(null, userA.id);
  assert.equal(res.status, 401);
  assert.ok("error" in res);
  assert.equal(res.error, "Unauthorized");
});

test("11. own GET returns 200 with cancellation history and aggregate counts", async () => {
  const deps: QueryCancellationsDeps = {
    findSharedActiveTeamAnyHackathon: async () => null,
    getUserCancellations: async (userId) => [
      {
        id: "c-1",
        hackathonId,
        hackathonName: "CodeSprint 2026",
        hackathonStartsAt: baseHackathonStart,
        teamId,
        hoursBeforeStart: 24,
        isLastMinute: true,
        createdAt: new Date("2026-10-04T12:00:00Z"),
      },
    ],
  };

  const res = await getCancellations(userA, userA.id, deps);

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.userId, userA.id);
  assert.equal(res.data.totalCancellations, 1);
  assert.equal(res.data.lastMinuteCount, 1);
  assert.equal(res.data.cancellations.length, 1);
  assert.equal(res.data.cancellations[0].id, "c-1");
  assert.equal(res.data.cancellations[0].isLastMinute, true);
});

test("12. active teammate GET returns 200 when sharing an active team", async () => {
  let checkedCaller: string | null = null;
  let checkedTarget: string | null = null;

  const deps: QueryCancellationsDeps = {
    findSharedActiveTeamAnyHackathon: async (callerId, targetUserId) => {
      checkedCaller = callerId;
      checkedTarget = targetUserId;
      return { teamId };
    },
    getUserCancellations: async () => [
      {
        id: "c-2",
        hackathonId,
        hackathonName: "CodeSprint 2026",
        hackathonStartsAt: baseHackathonStart,
        teamId,
        hoursBeforeStart: 60,
        isLastMinute: false,
        createdAt: new Date("2026-10-03T00:00:00Z"),
      },
    ],
  };

  const res = await getCancellations(userB, userA.id, deps);

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(checkedCaller, userB.id);
  assert.equal(checkedTarget, userA.id);
  assert.equal(res.data.userId, userA.id);
  assert.equal(res.data.totalCancellations, 1);
  assert.equal(res.data.lastMinuteCount, 0);
});

test("13. unrelated user GET returns 403 Forbidden with zero cancellation data exposed", async () => {
  let userCancellationsQueried = false;

  const deps: QueryCancellationsDeps = {
    findSharedActiveTeamAnyHackathon: async () => null, // No shared active team
    getUserCancellations: async () => {
      userCancellationsQueried = true;
      return [];
    },
  };

  const res = await getCancellations(unrelatedUser, userA.id, deps);

  assert.equal(res.status, 403);
  assert.ok("error" in res);
  assert.equal(userCancellationsQueried, false); // Crucial: zero database data queried or leaked
  assert.equal(
    res.error,
    "Forbidden: You can only view cancellation history for yourself or your active teammates",
  );
});

test("14. aggregate counts accurately tally totalCancellations and lastMinuteCount", async () => {
  const deps: QueryCancellationsDeps = {
    findSharedActiveTeamAnyHackathon: async () => null,
    getUserCancellations: async () => [
      {
        id: "c-1",
        hackathonId,
        hackathonName: "CodeSprint 2026",
        hackathonStartsAt: baseHackathonStart,
        teamId,
        hoursBeforeStart: 60,
        isLastMinute: false,
        createdAt: new Date("2026-10-03T00:00:00Z"),
      },
      {
        id: "c-2",
        hackathonId,
        hackathonName: "CodeSprint 2026",
        hackathonStartsAt: baseHackathonStart,
        teamId,
        hoursBeforeStart: 24,
        isLastMinute: true,
        createdAt: new Date("2026-10-04T12:00:00Z"),
      },
      {
        id: "c-3",
        hackathonId,
        hackathonName: "CodeSprint 2026",
        hackathonStartsAt: baseHackathonStart,
        teamId,
        hoursBeforeStart: 0,
        isLastMinute: true,
        createdAt: new Date("2026-10-05T12:00:00Z"),
      },
      {
        id: "c-4",
        hackathonId,
        hackathonName: "CodeSprint 2026",
        hackathonStartsAt: baseHackathonStart,
        teamId,
        hoursBeforeStart: -1,
        isLastMinute: false,
        createdAt: new Date("2026-10-05T12:30:00Z"),
      },
    ],
  };

  const res = await getCancellations(userA, userA.id, deps);

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.totalCancellations, 4);
  assert.equal(res.data.lastMinuteCount, 2);
  assert.equal(res.data.cancellations.length, 4);
});
