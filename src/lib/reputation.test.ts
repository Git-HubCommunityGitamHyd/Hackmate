import assert from "node:assert/strict";
import test from "node:test";
import {
  computeKarma,
  formatKarma,
  ratingPoints,
  KARMA_WEIGHTS,
  MAX_RATING_POINTS,
  type KarmaCounts,
} from "./reputation";

/** A user with no history at all. */
const zero: KarmaCounts = {
  attendancePresent: 0,
  hackathonsCompleted: 0,
  podiumFinishes: 0,
  ratingCount: 0,
  avgRating: null,
  lastMinuteCancellations: 0,
};

function counts(overrides: Partial<KarmaCounts>): KarmaCounts {
  return { ...zero, ...overrides };
}

function pointsFor(c: KarmaCounts, factor: string): number {
  const entry = computeKarma(c).breakdown.find((b) => b.factor === factor);
  assert.ok(entry, `breakdown is missing "${factor}"`);
  return entry.points;
}

test("a user with no history scores 0", () => {
  const result = computeKarma(zero);
  assert.equal(result.score, 0);
  assert.equal(result.rawScore, 0);
  assert.equal(result.breakdown.length, 5);
  assert.ok(result.breakdown.every((b) => b.points === 0));
});

test("each factor applies its documented weight", () => {
  assert.equal(pointsFor(counts({ attendancePresent: 3 }), "attendance"), 6);
  assert.equal(pointsFor(counts({ hackathonsCompleted: 4 }), "completions"), 32);
  assert.equal(pointsFor(counts({ podiumFinishes: 2 }), "podiums"), 50);
  assert.equal(
    pointsFor(counts({ lastMinuteCancellations: 1 }), "cancellations"),
    -30,
  );
});

test("weights stay in sync with the exported constants", () => {
  assert.equal(KARMA_WEIGHTS.attendancePresent, 2);
  assert.equal(KARMA_WEIGHTS.hackathonCompleted, 8);
  assert.equal(KARMA_WEIGHTS.podiumFinish, 25);
  assert.equal(KARMA_WEIGHTS.avgRating, 10);
  assert.equal(KARMA_WEIGHTS.lastMinuteCancellation, -30);
});

test("the rating component spans 0–50 and rounds to a whole number", () => {
  /* No reviews yet ⇒ neutral, not penalised. */
  assert.equal(ratingPoints(null, 0), 0);
  assert.equal(ratingPoints(4.8, 0), 0, "ignores an average with no reviews");
  assert.equal(ratingPoints(1, 3), 10, "the floor of the 1–5 scale");
  assert.equal(ratingPoints(5, 3), MAX_RATING_POINTS, "a perfect average caps at 50");
  assert.equal(ratingPoints(4.33, 3), 43, "rounds 43.3 down");
  assert.equal(ratingPoints(4.37, 3), 44, "rounds 43.7 up");
  /* Out-of-range input (a corrupt aggregate) is clamped, never extrapolated. */
  assert.equal(ratingPoints(9, 2), MAX_RATING_POINTS);
  assert.equal(ratingPoints(-3, 2), 0);
});

test("factors sum into the total", () => {
  const result = computeKarma(
    counts({
      attendancePresent: 5, //  +10
      hackathonsCompleted: 3, // +24
      podiumFinishes: 1, //      +25
      ratingCount: 4,
      avgRating: 4.5, //         +45
      lastMinuteCancellations: 1, // −30
    }),
  );
  assert.equal(result.rawScore, 74);
  assert.equal(result.score, 74);
  assert.equal(
    result.breakdown.reduce((sum, b) => sum + b.points, 0),
    result.score,
  );
});

test("the score is floored at 0 while rawScore keeps the deficit", () => {
  const result = computeKarma(
    counts({ attendancePresent: 1, lastMinuteCancellations: 3 }),
  );
  assert.equal(result.rawScore, -88, "2 − 90");
  assert.equal(result.score, 0, "never negative");
});

test("hostile counts degrade to 0 instead of poisoning the total", () => {
  const result = computeKarma({
    attendancePresent: -5,
    hackathonsCompleted: 2.7, // truncated to 2
    podiumFinishes: Number.NaN,
    ratingCount: 3,
    avgRating: Number.NaN,
    lastMinuteCancellations: -1,
  });
  assert.equal(result.score, 16, "only the two valid completions count");
  assert.ok(result.breakdown.every((b) => Number.isFinite(b.points)));
});

test("computeKarma is pure — same input, same output, no mutation", () => {
  const input = counts({ attendancePresent: 2, ratingCount: 1, avgRating: 3 });
  const snapshot = { ...input };
  assert.deepEqual(computeKarma(input), computeKarma(input));
  assert.deepEqual(input, snapshot, "the input object is left untouched");
});

test("formatKarma reads like Reddit", () => {
  assert.equal(formatKarma(0), "0");
  assert.equal(formatKarma(999), "999");
  assert.equal(formatKarma(1_000), "1k");
  assert.equal(formatKarma(1_249), "1.2k");
  assert.equal(formatKarma(12_500), "12.5k");
  assert.equal(formatKarma(1_500_000), "1.5M");
});
