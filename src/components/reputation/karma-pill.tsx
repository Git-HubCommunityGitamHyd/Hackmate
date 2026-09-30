"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowBigUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { formatKarma, type ReputationDTO } from "@/lib/reputation";

/** Signed points, so a penalty reads as "−90" rather than "-90". */
function signedPoints(points: number): string {
  if (points === 0) return "0";
  return points > 0 ? `+${points}` : `−${Math.abs(points)}`;
}

/**
 * Reddit-style karma pill for a user, with the score breakdown in a tooltip.
 *
 * Fetches its own data so it can be dropped anywhere a userId is in hand
 * (profile header, person card, team roster) without the parent plumbing
 * reputation through. The query is keyed per user, so several pills for the
 * same person on one page share a single request.
 */
export function KarmaPill({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const { data, isLoading, isError } = useQuery<ReputationDTO>({
    queryKey: ["reputation", userId],
    queryFn: () =>
      api<ReputationDTO>(
        `/api/reputation?userId=${encodeURIComponent(userId)}`,
      ),
    enabled: !!userId,
    /* Karma only moves when a hackathon ends; no need to refetch eagerly. */
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return <Skeleton className={cn("h-6 w-20 rounded-full", className)} />;
  }

  /* A failed reputation lookup is not worth an error state next to someone's
     name — the pill is supplementary, so it simply doesn't render. */
  if (isError || !data) return null;

  const earned = data.breakdown.filter((entry) => entry.count > 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`${data.score} karma`}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-300 bg-orange-100 px-2 py-0.5",
            "text-xs font-semibold text-orange-700 tabular-nums",
            "dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
        >
          <ArrowBigUp aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
          {formatKarma(data.score)} karma
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">
        {earned.length === 0 ? (
          <p>No hackathon history yet — karma starts at 0.</p>
        ) : (
          <div className="space-y-1">
            <p className="font-semibold">{data.score} karma</p>
            <ul className="space-y-0.5">
              {earned.map((entry) => (
                <li key={entry.factor} className="flex justify-between gap-3">
                  <span className="opacity-80">
                    {entry.label}
                    {entry.factor !== "rating" && ` ×${entry.count}`}
                  </span>
                  <span className="tabular-nums">
                    {signedPoints(entry.points)}
                  </span>
                </li>
              ))}
            </ul>
            {data.rawScore < 0 && (
              <p className="opacity-70">Floored at 0 ({data.rawScore} raw).</p>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
