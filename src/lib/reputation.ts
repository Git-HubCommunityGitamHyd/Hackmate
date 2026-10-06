/**
 * Reputation scoring - Reddit-karma style.
 *
 * `computeKarma` is deliberately PURE: no database, no clock, no I/O. Every
 * input arrives as a plain count so the scoring rules can be read, reviewed
 * and unit-tested in one place, independent of how the counts were gathered.
 * The route (GET /api/reputation) does the loading; this file does the maths.
 *
 * Scoring rules
 *   attendance marked "present"        +2  each
 *   hackathon completed (a submission) +8  each
 *   podium finish (placement 1–3)      +25 each
 *   average peer rating                avg(1–5) × 10, clamped to 0–50
 *   last-minute cancellation           −30 each
 *
 * The total is floored at 0 - karma never goes negative, so a single rough
 * patch can't brand somebody permanently, and there's no incentive to
 * abandon an account and start over.
 */

/** Points awarded per event. Exported so UI copy and tests quote one source. */
export const KARMA_WEIGHTS = {
  attendancePresent: 2,
  hackathonCompleted: 8,
  podiumFinish: 25,
  /** Multiplier on the 1–5 average rating. */
  avgRating: 10,
  lastMinuteCancellation: -30,
} as const;

/** Upper bound on the rating component: a perfect 5.0 × 10. */
export const MAX_RATING_POINTS = 50;

export type KarmaFactor =
  | "attendance"
  | "completions"
  | "podiums"
  | "rating"
  | "cancellations";

/** The five counts the score is built from - all non-negative integers. */
export interface KarmaCounts {
  /** Attendance rows with status "present" ("late" and "absent" earn nothing). */
  attendancePresent: number;
  /** Hackathons the user has a recorded result (submission) for. */
  hackathonsCompleted: number;
  /** Results with placement 1, 2 or 3. */
  podiumFinishes: number;
  /** How many peer reviews the user has received (0 ⇒ no rating component). */
  ratingCount: number;
  /** Mean of received ratings on a 1–5 scale, or null when `ratingCount` is 0. */
  avgRating: number | null;
  /** Cancellations flagged `isLastMinute` by the cancellations route. */
  lastMinuteCancellations: number;
}

export interface KarmaBreakdownEntry {
  factor: KarmaFactor;
  /** Short human label for the tooltip. */
  label: string;
  /** Events counted (for "rating" this is the number of reviews received). */
  count: number;
  /** Points per event; null for "rating", whose points aren't a simple multiple. */
  weight: number | null;
  /** Signed contribution to the score, already rounded to a whole number. */
  points: number;
}

export interface KarmaResult {
  /** The published score - `rawScore` floored at 0. */
  score: number;
  /** Sum of every contribution before the floor; negative when trust is poor. */
  rawScore: number;
  /** Per-factor contributions, in display order. */
  breakdown: KarmaBreakdownEntry[];
}

/** Coerce anything the DB hands back (string, null, NaN, float) to a count ≥ 0. */
function count(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

/**
 * Rating contribution: the 1–5 average scaled by 10 and clamped to 0–50.
 * Returns 0 when nobody has rated the user yet, so an unrated newcomer sits
 * at neutral rather than being penalised for the absence of reviews.
 */
export function ratingPoints(
  avgRating: number | null | undefined,
  ratingCount: number,
): number {
  if (count(ratingCount) === 0) return 0;
  if (typeof avgRating !== "number" || !Number.isFinite(avgRating)) return 0;
  const scaled = avgRating * KARMA_WEIGHTS.avgRating;
  return Math.round(Math.min(MAX_RATING_POINTS, Math.max(0, scaled)));
}

/**
 * Turn the five counts into a score plus the breakdown that explains it.
 *
 * Pure: the same counts always yield the same result. Hostile inputs
 * (negatives, floats, nulls, NaN) are normalised rather than trusted, so a
 * bad aggregate query degrades to 0 for that factor instead of poisoning
 * the total.
 */
export function computeKarma(counts: KarmaCounts): KarmaResult {
  const attendancePresent = count(counts.attendancePresent);
  const hackathonsCompleted = count(counts.hackathonsCompleted);
  const podiumFinishes = count(counts.podiumFinishes);
  const ratingCount = count(counts.ratingCount);
  const lastMinuteCancellations = count(counts.lastMinuteCancellations);

  const breakdown: KarmaBreakdownEntry[] = [
    {
      factor: "attendance",
      label: "Showed up",
      count: attendancePresent,
      weight: KARMA_WEIGHTS.attendancePresent,
      points: attendancePresent * KARMA_WEIGHTS.attendancePresent,
    },
    {
      factor: "completions",
      label: "Hackathons completed",
      count: hackathonsCompleted,
      weight: KARMA_WEIGHTS.hackathonCompleted,
      points: hackathonsCompleted * KARMA_WEIGHTS.hackathonCompleted,
    },
    {
      factor: "podiums",
      label: "Podium finishes",
      count: podiumFinishes,
      weight: KARMA_WEIGHTS.podiumFinish,
      points: podiumFinishes * KARMA_WEIGHTS.podiumFinish,
    },
    {
      factor: "rating",
      label: "Teammate rating",
      count: ratingCount,
      weight: null,
      points: ratingPoints(counts.avgRating, ratingCount),
    },
    {
      factor: "cancellations",
      label: "Last-minute cancellations",
      count: lastMinuteCancellations,
      weight: KARMA_WEIGHTS.lastMinuteCancellation,
      points: lastMinuteCancellations * KARMA_WEIGHTS.lastMinuteCancellation,
    },
  ];

  const rawScore = breakdown.reduce((sum, entry) => sum + entry.points, 0);

  return { score: Math.max(0, rawScore), rawScore, breakdown };
}

/**
 * What GET /api/reputation returns: the score, the breakdown that explains
 * it, and the counts it was derived from. Declared here rather than in the
 * route so the route and the pill agree on one type - importing it is
 * type-only, so no server code follows it into the client bundle.
 */
export interface ReputationDTO extends KarmaResult {
  userId: string;
  counts: KarmaCounts;
}

/** Reddit-style compact count: 1200 → "1.2k", 1_500_000 → "1.5M". */
export function formatKarma(score: number): string {
  if (!Number.isFinite(score)) return "0";
  const n = Math.trunc(score);
  if (Math.abs(n) < 1_000) return String(n);
  if (Math.abs(n) < 1_000_000) return `${trimZero(n / 1_000)}k`;
  return `${trimZero(n / 1_000_000)}M`;
}

/** One decimal place, with a trailing ".0" dropped ("1.0k" reads as noise). */
function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}
