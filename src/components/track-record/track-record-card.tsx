"use client";

import { useQuery } from "@tanstack/react-query";
import { Star, CheckCircle, Clock, XCircle, AlertCircle, Quote, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/hooks/use-api";

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  total: number;
  rate: number | null;
}

export interface AttendanceData {
  userId: string;
  counts: AttendanceCounts;
  records?: Array<{
    id: string;
    hackathonId: string;
    teamId: string;
    status: "present" | "late" | "absent";
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewsData {
  userId: string;
  averageRating: number | null;
  reviewCount: number;
  recentComments: ReviewItem[];
}

export interface CancellationItem {
  id: string;
  hackathonId: string;
  hackathonName: string;
  hackathonStartsAt: string;
  teamId: string;
  hoursBeforeStart: number;
  isLastMinute: boolean;
  createdAt: string;
}

export interface CancellationsData {
  userId: string;
  totalCancellations: number;
  lastMinuteCount: number;
  cancellations: CancellationItem[];
}

/* ------------------------------------------------------------------ */
/* Pure formatting and presentation logic helpers (unit-testable)     */
/* ------------------------------------------------------------------ */

/** Formats the attendance rate percentage string */
export function formatAttendanceRate(rate: number | null): string {
  if (rate === null) return "No events marked";
  return `Attendance rate: ${rate}%`;
}

/** Formats average rating to 1 decimal place or fallback */
export function formatAverageRating(averageRating: number | null): string {
  if (averageRating === null) return "N/A";
  return averageRating.toFixed(1);
}

/** Formats review count label with proper pluralization */
export function formatReviewCount(count: number): string {
  if (count === 1) return "1 review";
  return `${count} reviews`;
}

/** Formats cancellation count label with proper pluralization */
export function formatCancellationCount(count: number): string {
  if (count === 1) return "1 cancellation";
  return `${count} cancellations`;
}

/** Formats last-minute cancellation headline */
export function formatLastMinuteHeadline(lastMinuteCount: number): string {
  if (lastMinuteCount === 0) return "No last-minute cancellations";
  if (lastMinuteCount === 1) return "1 last-minute cancellation";
  return `${lastMinuteCount} last-minute cancellations`;
}

/** Determines whether any factual track-record activity has been recorded */
export function hasTrackRecordData(
  attendance?: AttendanceCounts | null,
  reviews?: { reviewCount: number } | null,
  cancellations?: { totalCancellations: number } | null,
): boolean {
  const hasAttendance = Boolean(attendance && attendance.total > 0);
  const hasReviews = Boolean(reviews && reviews.reviewCount > 0);
  const hasCancellations = Boolean(cancellations && cancellations.totalCancellations > 0);
  return hasAttendance || hasReviews || hasCancellations;
}

/** Determines whether any error indicates a 403 / permission restriction */
export function isAccessForbidden(errors: Array<Error | null | undefined>): boolean {
  return errors.some(
    (err) =>
      Boolean(err) &&
      (err!.message.includes("Forbidden") ||
        err!.message.includes("permission") ||
        err!.message.includes("403") ||
        err!.message.includes("Unauthorized")),
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export interface TrackRecordCardProps {
  userId: string;
  className?: string;
  initialAttendance?: AttendanceData | null;
  initialReviews?: ReviewsData | null;
  initialCancellations?: CancellationsData | null;
}

/**
 * Pure signal component displaying factual student track-record data.
 *
 * Strict Constraints:
 * - Deterministic facts only.
 * - No composite trust scores or letter grades.
 * - No ranking, percentiles, or leaderboards.
 * - No AI scoring or algorithmic weighting.
 * - No punitive user blocking or access denial.
 * - Non-punitive empty state for new members.
 * - Separate access-denied state on 403 without data exposure.
 */
export function TrackRecordCard({
  userId,
  className,
  initialAttendance,
  initialReviews,
  initialCancellations,
}: TrackRecordCardProps) {
  const attendanceQuery = useQuery({
    queryKey: ["attendance", userId],
    queryFn: () => api<AttendanceData>(`/api/attendance?userId=${userId}`),
    enabled: Boolean(userId) && !initialAttendance,
    initialData: initialAttendance ?? undefined,
  });

  const reviewsQuery = useQuery({
    queryKey: ["reviews", userId],
    queryFn: () => api<ReviewsData>(`/api/reviews?userId=${userId}`),
    enabled: Boolean(userId) && !initialReviews,
    initialData: initialReviews ?? undefined,
  });

  const cancellationsQuery = useQuery({
    queryKey: ["cancellations", userId],
    queryFn: () => api<CancellationsData>(`/api/cancellations?userId=${userId}`),
    enabled: Boolean(userId) && !initialCancellations,
    initialData: initialCancellations ?? undefined,
  });

  const isLoading =
    attendanceQuery.isLoading || reviewsQuery.isLoading || cancellationsQuery.isLoading;

  const forbidden = isAccessForbidden([
    attendanceQuery.error as Error | null,
    reviewsQuery.error as Error | null,
    cancellationsQuery.error as Error | null,
  ]);

  /* 1. Loading Skeleton State */
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  /* 2. Access Restricted (403) State: Never display "No track record recorded yet" */
  if (forbidden) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Track Record Unavailable
            </CardTitle>
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              Restricted
            </Badge>
          </div>
          <CardDescription className="text-xs">
            You don&apos;t have permission to view this history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Attendance, feedback, and cancellation records are only visible to the member and their active teammates.
          </div>
        </CardContent>
      </Card>
    );
  }

  const attendance = attendanceQuery.data?.counts;
  const reviews = reviewsQuery.data;
  const cancellations = cancellationsQuery.data;

  const hasData = hasTrackRecordData(attendance, reviews, cancellations);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Track Record</CardTitle>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            Teammate history
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Factual summary of past attendance, teammate feedback, and cancellations.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 3. Empty State for new members */}
        {!hasData && (
          <p className="text-xs text-muted-foreground py-2 text-center">
            No track record recorded yet. History appears here as hackathons are completed.
          </p>
        )}

        {/* 4. Attendance Metric */}
        {attendance && attendance.total > 0 && (
          <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Attendance
              </span>
              <span className="text-xs font-medium">
                {formatAttendanceRate(attendance.rate)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs pt-1">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle className="h-3.5 w-3.5" />
                {attendance.present} Present
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="h-3.5 w-3.5" />
                {attendance.late} Late
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                <XCircle className="h-3.5 w-3.5" />
                {attendance.absent} Absent
              </span>
            </div>
          </div>
        )}

        {/* 5. Teammate Feedback Metric */}
        {reviews && reviews.reviewCount > 0 && (
          <div className="p-3 rounded-lg border bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Teammate Feedback
              </span>
              <div className="flex items-center gap-1 font-semibold text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {formatAverageRating(reviews.averageRating)}
                <span className="text-xs font-normal text-muted-foreground">
                  ({formatReviewCount(reviews.reviewCount)})
                </span>
              </div>
            </div>

            {reviews.recentComments && reviews.recentComments.length > 0 ? (
              <div className="space-y-2 pt-1">
                {reviews.recentComments.map((rc) => (
                  <div
                    key={rc.id}
                    className="text-xs p-2 rounded bg-background/80 border text-muted-foreground flex gap-2 items-start"
                  >
                    <Quote className="h-3 w-3 shrink-0 text-primary/60 mt-0.5" />
                    <span className="italic leading-snug">{rc.comment}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No written comments yet.</p>
            )}
          </div>
        )}

        {/* 6. Cancellation History Metric */}
        {cancellations && (
          <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle
                className={`h-4 w-4 ${
                  cancellations.lastMinuteCount > 0 ? "text-amber-500" : "text-muted-foreground"
                }`}
              />
              <div className="text-xs">
                <div className="font-semibold">
                  {formatLastMinuteHeadline(cancellations.lastMinuteCount)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {cancellations.lastMinuteCount === 0
                    ? "No voluntary departures within 48h of start"
                    : "Left team ≤48h before hackathon start"}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {cancellations.lastMinuteCount} in &le;48h
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
