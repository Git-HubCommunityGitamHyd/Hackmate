"use client";

import { cn } from "@/lib/utils";

/** Circular match-score ring (used instead of "% match" text walls). */
export function MatchRing({
  score,
  size = 56,
  className,
  label,
}: {
  score: number;
  size?: number;
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = clamped >= 80 ? "#059669" : clamped >= 60 ? "#d97706" : "#a1a1aa";
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Match score ${clamped}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/40"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-xs font-bold" style={{ color: stroke }}>
          {clamped}%
        </span>
      </div>
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}
