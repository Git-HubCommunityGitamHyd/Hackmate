"use client";

import { BadgeCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function VerifiedBadge({
  compact = true,
}: {
  compact?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label="ID verified"
          tabIndex={0}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
            compact ? "h-5 w-5 justify-center" : "text-xs font-medium",
          )}
        >
          <BadgeCheck aria-hidden="true" className="h-4 w-4" />
          {!compact && <span>ID verified</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        This person has verified their college ID.
      </TooltipContent>
    </Tooltip>
  );
}
