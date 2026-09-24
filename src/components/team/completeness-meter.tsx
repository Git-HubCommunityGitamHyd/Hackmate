"use client";

import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CompositionReport } from "@/lib/matching/composition";

/** The Team Completeness Meter: Frontend ✓ Backend ✗ ML ✓ UI/UX ✓ */
export function CompletenessMeter({
  composition,
  compact,
}: {
  composition: CompositionReport;
  compact?: boolean;
}) {
  const needed = composition.coverages.filter((c) => c.needed || c.coverage !== "none");
  const shown = compact ? needed.slice(0, 6) : needed;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              composition.completenessPercent >= 75 ? "bg-emerald-500" : composition.completenessPercent >= 40 ? "bg-amber-500" : "bg-red-400",
            )}
            style={{ width: `${composition.completenessPercent}%` }}
          />
        </div>
        <span className="text-lg font-extrabold tabular-nums">{composition.completenessPercent}%</span>
      </div>

      <div className={cn("grid gap-1.5", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        {shown.map((c) => {
          const Icon =
            c.coverage === "strong" || c.coverage === "covered"
              ? CheckCircle2
              : c.coverage === "partial"
                ? MinusCircle
                : XCircle;
          const color =
            c.coverage === "strong"
              ? "text-emerald-600"
              : c.coverage === "covered"
                ? "text-emerald-500"
                : c.coverage === "partial"
                  ? "text-amber-500"
                  : c.needed
                    ? "text-red-500"
                    : "text-muted-foreground/60";
          return (
            <div key={c.roleSlug} className="flex items-center gap-2 text-sm">
              <Icon className={cn("h-4 w-4 shrink-0", color)} />
              <span className={cn("font-medium", c.coverage === "none" && !c.needed && "text-muted-foreground/70")}>
                {c.roleName}
              </span>
              {c.priority === "must" && c.coverage === "none" && (
                <Badge variant="outline" className="text-[10px] py-0 text-red-600 border-red-200 dark:border-red-900">
                  must-have
                </Badge>
              )}
              {c.coverage === "strong" && c.memberNames.length > 1 && (
                <span className="text-[10px] text-muted-foreground">×{c.memberNames.length}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
