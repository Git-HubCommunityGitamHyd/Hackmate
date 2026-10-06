import assert from "node:assert/strict";
import test from "node:test";
import { reviewPostSchema } from "@/lib/validations";
import {
  calculateAverageRating,
  recordReview,
  getReviews,
  type RecordReviewDeps,
  type QueryReviewDeps,
} from "./route";
import type { PerformanceReview } from "@/lib/db/schema";

const reviewer = { id: "11111111-1111-4111-8111-111111111111", email: "reviewer@example.com" };
const reviewee = { id: "22222222-2222-4222-8222-222222222222", email: "reviewee@example.com" };
const unrelatedUser = { id: "33333333-3333-4333-8333-333333333333", email: "stranger@example.com" };
const hackathonId = "44444444-4444-4444-8444-444444444444";
const teamId = "55555555-5555-4555-8555-555555555555";

/** Helper mock review generator */
function mockReviewRecord(overrides: Partial<PerformanceReview> = {}): PerformanceReview {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    reviewerId: reviewer.id,
    revieweeId: reviewee.id,
    hackathonId,
    teamId,
    rating: 5,
    comment: "Great teammate!",
    createdAt: new Date("2026-09-27T10:00:00Z"),
    updatedAt: new Date("2026-09-27T10:00:00Z"),
    ...overrides,
  };
}

// 1. Valid review creation
test("1. valid review creation creates review with reviewerId and 1-5 rating", async () => {
  let createdData: any = null;
  const deps: RecordReviewDeps = {
    getHackathonStartTime: async () => ({ startsAt: new Date("2026-09-25T09:00:00Z") }), // Past start time
    findSharedActiveTeam: async () => ({ teamId }),
    upsertReview: async (data) => {
      createdData = data;
      return mockReviewRecord(data);
    },
  };

  const res = await recordReview(
    reviewer,
    { revieweeId: reviewee.id, hackathonId, rating: 5, comment: "Awesome collaborator" },
    deps,
    new Date("2026-09-27T12:00:00Z"), // now is after start
  );

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.success, true);
  assert.equal(res.data.review.rating, 5);
  assert.equal(createdData.reviewerId, reviewer.id);
  assert.equal(createdData.teamId, teamId);
});

// 2. Updating an existing review (upsert)
test("2. updating an existing review updates rating and comment without duplicates", async () => {
  let updatedData: any = null;
  const deps: RecordReviewDeps = {
    getHackathonStartTime: async () => ({ startsAt: new Date("2026-09-25T09:00:00Z") }),
    findSharedActiveTeam: async () => ({ teamId }),
    upsertReview: async (data) => {
      updatedData = data;
      return mockReviewRecord({ ...data, updatedAt: new Date() });
    },
  };

  const res = await recordReview(
    reviewer,
    { revieweeId: reviewee.id, hackathonId, rating: 4, comment: "Updated feedback" },
    deps,
    new Date("2026-09-27T12:00:00Z"),
  );

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.review.rating, 4);
  assert.equal(updatedData.rating, 4);
  assert.equal(updatedData.comment, "Updated feedback");
});

// 3. Self-review rejection
test("3. self-review rejection returns 400 Bad Request", async () => {
  const deps: RecordReviewDeps = {
    getHackathonStartTime: async () => ({ startsAt: new Date("2026-09-25T09:00:00Z") }),
    findSharedActiveTeam: async () => ({ teamId }),
    upsertReview: async (data) => mockReviewRecord(data),
  };

  const res = await recordReview(
    reviewer,
    { revieweeId: reviewer.id, hackathonId, rating: 5 },
    deps,
    new Date("2026-09-27T12:00:00Z"),
  );

  assert.equal(res.status, 400);
  assert.ok("error" in res);
  assert.equal(res.error, "You cannot review yourself");
});

// 4. Premature review rejection (hackathon not started)
test("4. premature review rejection returns 400 when hackathon has not started yet", async () => {
  const futureStart = new Date("2026-10-01T10:00:00Z");
  const now = new Date("2026-09-27T10:00:00Z"); // Before start

  const deps: RecordReviewDeps = {
    getHackathonStartTime: async () => ({ startsAt: futureStart }),
    findSharedActiveTeam: async () => ({ teamId }),
    upsertReview: async (data) => mockReviewRecord(data),
  };

  const res = await recordReview(
    reviewer,
    { revieweeId: reviewee.id, hackathonId, rating: 5 },
    deps,
    now,
  );

  assert.equal(res.status, 400);
  assert.ok("error" in res);
  assert.equal(res.error, "Reviews are only allowed after the hackathon has started");
});

// 5. Cross-team review rejection
test("5. cross-team review rejection returns 403 when users do not share a team", async () => {
  const deps: RecordReviewDeps = {
    getHackathonStartTime: async () => ({ startsAt: new Date("2026-09-25T09:00:00Z") }),
    findSharedActiveTeam: async () => null, // No shared team
    upsertReview: async (data) => mockReviewRecord(data),
  };

  const res = await recordReview(
    reviewer,
    { revieweeId: unrelatedUser.id, hackathonId, rating: 5 },
    deps,
    new Date("2026-09-27T12:00:00Z"),
  );

  assert.equal(res.status, 403);
  assert.ok("error" in res);
  assert.equal(res.error, "You must share an active team with this member for this hackathon");
});

// 6. Inactive/disbanded team review rejection
test("6. disbanded team review rejection returns 403", async () => {
  const deps: RecordReviewDeps = {
    getHackathonStartTime: async () => ({ startsAt: new Date("2026-09-25T09:00:00Z") }),
    findSharedActiveTeam: async () => null, // Disbanded teams excluded
    upsertReview: async (data) => mockReviewRecord(data),
  };

  const res = await recordReview(
    reviewer,
    { revieweeId: reviewee.id, hackathonId, rating: 5 },
    deps,
    new Date("2026-09-27T12:00:00Z"),
  );

  assert.equal(res.status, 403);
  assert.ok("error" in res);
});

// 7. Rating validation checks (out of bounds & non-integer)
test("7. rating validation rejects ratings < 1, > 5, or non-integers", () => {
  assert.equal(
    reviewPostSchema.safeParse({
      revieweeId: reviewee.id,
      hackathonId,
      rating: 0,
    }).success,
    false,
  );
  assert.equal(
    reviewPostSchema.safeParse({
      revieweeId: reviewee.id,
      hackathonId,
      rating: 6,
    }).success,
    false,
  );
  assert.equal(
    reviewPostSchema.safeParse({
      revieweeId: reviewee.id,
      hackathonId,
      rating: 4.5,
    }).success,
    false,
  );
  assert.equal(
    reviewPostSchema.safeParse({
      revieweeId: reviewee.id,
      hackathonId,
      rating: 5,
    }).success,
    true,
  );
});

// 8. Comment length constraint check
test("8. comment length validation rejects comments exceeding 1000 characters", () => {
  const over1000 = "a".repeat(1001);
  const exactly1000 = "a".repeat(1000);

  assert.equal(
    reviewPostSchema.safeParse({
      revieweeId: reviewee.id,
      hackathonId,
      rating: 5,
      comment: over1000,
    }).success,
    false,
  );
  assert.equal(
    reviewPostSchema.safeParse({
      revieweeId: reviewee.id,
      hackathonId,
      rating: 5,
      comment: exactly1000,
    }).success,
    true,
  );
});

// 9. Unauthenticated POST rejection
test("9. unauthenticated POST returns 401 Unauthorized", async () => {
  const deps: RecordReviewDeps = {
    getHackathonStartTime: async () => ({ startsAt: new Date("2026-09-25T09:00:00Z") }),
    findSharedActiveTeam: async () => ({ teamId }),
    upsertReview: async (data) => mockReviewRecord(data),
  };

  const res = await recordReview(
    null,
    { revieweeId: reviewee.id, hackathonId, rating: 5 },
    deps,
    new Date("2026-09-27T12:00:00Z"),
  );

  assert.equal(res.status, 401);
  assert.ok("error" in res);
  assert.equal(res.error, "Unauthorized");
});

// 10. Own GET reviews
test("10. own GET reviews returns 200 with review summary and comments", async () => {
  const reviews = [
    {
      id: "rev-1",
      hackathonId,
      rating: 5,
      comment: "Super helpful!",
      createdAt: new Date("2026-09-26T12:00:00Z"),
    },
    {
      id: "rev-2",
      hackathonId,
      rating: 4,
      comment: "Good code quality",
      createdAt: new Date("2026-09-25T12:00:00Z"),
    },
  ];

  const deps: QueryReviewDeps = {
    findSharedActiveTeamAnyHackathon: async () => null,
    getUserReviews: async () => reviews,
  };

  const res = await getReviews(reviewer, reviewer.id, deps);

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.reviewCount, 2);
  assert.equal(res.data.averageRating, 4.5);
  assert.equal(res.data.recentComments.length, 2);
  assert.equal(res.data.recentComments[0].comment, "Super helpful!");
});

// 11. Teammate GET reviews
test("11. teammate GET reviews returns 200 when sharing an active team", async () => {
  const reviews = [
    {
      id: "rev-3",
      hackathonId,
      rating: 5,
      comment: "Reliable lead",
      createdAt: new Date(),
    },
  ];

  const deps: QueryReviewDeps = {
    findSharedActiveTeamAnyHackathon: async () => ({ teamId }),
    getUserReviews: async () => reviews,
  };

  const res = await getReviews(reviewer, reviewee.id, deps);

  assert.equal(res.status, 200);
  assert.ok("data" in res);
  assert.equal(res.data.reviewCount, 1);
  assert.equal(res.data.averageRating, 5.0);
  assert.equal(res.data.recentComments.length, 1);
});

// 12. Unrelated user GET rejection
test("12. unrelated user GET rejection returns 403 Forbidden with zero review exposure", async () => {
  const deps: QueryReviewDeps = {
    findSharedActiveTeamAnyHackathon: async () => null, // Stranger
    getUserReviews: async () => [
      {
        id: "rev-4",
        hackathonId,
        rating: 5,
        comment: "Private comment",
        createdAt: new Date(),
      },
    ],
  };

  const res = await getReviews(reviewer, unrelatedUser.id, deps);

  assert.equal(res.status, 403);
  assert.ok("error" in res);
  assert.equal(res.error, "Forbidden: You can only view reviews for yourself or your active teammates");
});

// 13. Average rating calculation
test("13. calculateAverageRating handles empty arrays and precision rounding", () => {
  assert.equal(calculateAverageRating([]), null);
  assert.equal(calculateAverageRating([5, 5, 5]), 5.0);
  assert.equal(calculateAverageRating([5, 4]), 4.5);
  assert.equal(calculateAverageRating([5, 5, 4]), 4.7); // 14 / 3 = 4.666... -> 4.7
  assert.equal(calculateAverageRating([1, 2]), 1.5);
});
