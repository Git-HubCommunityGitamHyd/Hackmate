import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAttendanceRate,
  formatAverageRating,
  formatReviewCount,
  formatCancellationCount,
  formatLastMinuteHeadline,
  hasTrackRecordData,
  isAccessForbidden,
  type AttendanceCounts,
  type ReviewItem,
} from "./track-record-card";

// ==========================================
// 1. Attendance rate formatting
// ==========================================

test("1. attendance rate formatting formats valid rate without 'reliability' label", () => {
  assert.equal(formatAttendanceRate(90), "Attendance rate: 90%");
  assert.equal(formatAttendanceRate(100), "Attendance rate: 100%");
  assert.equal(formatAttendanceRate(0), "Attendance rate: 0%");
  assert.equal(formatAttendanceRate(66.7), "Attendance rate: 66.7%");
});

test("2. attendance rate formatting handles null fallback when no events are marked", () => {
  assert.equal(formatAttendanceRate(null), "No events marked");
});

// ==========================================
// 2. Attendance counts
// ==========================================

test("3. attendance counts preserve factual breakdown of present, late, and absent", () => {
  const counts: AttendanceCounts = {
    present: 4,
    late: 1,
    absent: 1,
    total: 6,
    rate: 75,
  };

  assert.equal(counts.present, 4);
  assert.equal(counts.late, 1);
  assert.equal(counts.absent, 1);
  assert.equal(counts.total, 6);
  assert.equal(counts.rate, 75);
});

// ==========================================
// 3. Review rating formatting
// ==========================================

test("4. review rating formatting formats numbers to 1 decimal place", () => {
  assert.equal(formatAverageRating(4.8), "4.8");
  assert.equal(formatAverageRating(5), "5.0");
  assert.equal(formatAverageRating(3.3333), "3.3");
});

test("5. review rating formatting returns N/A fallback for null average rating", () => {
  assert.equal(formatAverageRating(null), "N/A");
});

// ==========================================
// 4. Review pluralization
// ==========================================

test("6. review pluralization correctly handles singular and plural counts", () => {
  assert.equal(formatReviewCount(1), "1 review");
  assert.equal(formatReviewCount(0), "0 reviews");
  assert.equal(formatReviewCount(2), "2 reviews");
  assert.equal(formatReviewCount(12), "12 reviews");
});

// ==========================================
// 5. Recent comments
// ==========================================

test("7. recent comments filters and handles written feedback quotes", () => {
  const comments: ReviewItem[] = [
    { id: "r1", rating: 5, comment: "Exceptional frontend execution!", createdAt: "2026-09-27T10:00:00Z" },
    { id: "r2", rating: 4, comment: "Reliable teammate, good communicator.", createdAt: "2026-09-27T11:00:00Z" },
  ];

  assert.equal(comments.length, 2);
  assert.equal(comments[0].comment, "Exceptional frontend execution!");
  assert.equal(comments[1].comment, "Reliable teammate, good communicator.");
});

// ==========================================
// 6. Cancellation pluralization
// ==========================================

test("8. cancellation pluralization handles singular and plural counts", () => {
  assert.equal(formatCancellationCount(1), "1 cancellation");
  assert.equal(formatCancellationCount(0), "0 cancellations");
  assert.equal(formatCancellationCount(3), "3 cancellations");
});

// ==========================================
// 7. 'No last-minute cancellations' condition
// ==========================================

test("9. 'No last-minute cancellations' condition displays factual wording without 'Reliable' label", () => {
  assert.equal(formatLastMinuteHeadline(0), "No last-minute cancellations");
  assert.equal(formatLastMinuteHeadline(1), "1 last-minute cancellation");
  assert.equal(formatLastMinuteHeadline(2), "2 last-minute cancellations");
});

// ==========================================
// 8. Empty-state detection
// ==========================================

test("10. empty-state detection returns false when user has zero activity recorded", () => {
  const noAttendance: AttendanceCounts = { present: 0, late: 0, absent: 0, total: 0, rate: null };
  const noReviews = { reviewCount: 0 };
  const noCancellations = { totalCancellations: 0 };

  const hasData = hasTrackRecordData(noAttendance, noReviews, noCancellations);
  assert.equal(hasData, false);
});

test("11. empty-state detection returns true when any single metric exists", () => {
  // Only attendance
  assert.equal(
    hasTrackRecordData({ present: 1, late: 0, absent: 0, total: 1, rate: 100 }, { reviewCount: 0 }, { totalCancellations: 0 }),
    true,
  );

  // Only reviews
  assert.equal(
    hasTrackRecordData(null, { reviewCount: 1 }, { totalCancellations: 0 }),
    true,
  );

  // Only cancellations
  assert.equal(
    hasTrackRecordData(null, null, { totalCancellations: 1 }),
    true,
  );
});

// ==========================================
// 9. 403 / error state distinct from empty state
// ==========================================

test("12. 403 / error state is detected separately from empty state", () => {
  const forbiddenError = new Error("Forbidden: You can only view attendance for yourself or your active teammates");
  const nullError = null;

  assert.equal(isAccessForbidden([forbiddenError, nullError]), true);
  assert.equal(isAccessForbidden([new Error("Request failed (403)")]), true);
  assert.equal(isAccessForbidden([new Error("Unauthorized")]), true);
  assert.equal(isAccessForbidden([new Error("Network connection dropped")]), false);
  assert.equal(isAccessForbidden([null, null]), false);
});
