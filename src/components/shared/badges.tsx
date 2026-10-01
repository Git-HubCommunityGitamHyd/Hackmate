"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Award, CalendarCheck, CheckCircle2, Crown, Hammer, HeartHandshake, Medal, ShieldCheck, Trophy, Users, type LucideIcon } from "lucide-react";
import {
  COMMITMENT_LEVELS,
  RECRUITMENT_STATUSES,
  EXPERIENCE_LEVELS,
  SKILL_CATEGORY_META,
} from "@/lib/constants";
import type { SkillCategory } from "@/lib/db/schema";

const BADGE_ICONS: Record<string, LucideIcon> = {
  "check-circle": CheckCircle2,
  hammer: Hammer,
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  "calendar-check": CalendarCheck,
  "shield-check": ShieldCheck,
  "heart-handshake": HeartHandshake,
  users: Users,
  award: Award,
};

export function ReputationBadge({
  name,
  description,
  icon,
}: {
  name: string;
  description?: string | null;
  icon?: string | null;
}) {
  const Icon = BADGE_ICONS[icon ?? ""] ?? Award;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={name}>
          <Badge variant="outline" className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {name}
          </Badge>
        </span>
      </TooltipTrigger>
      {description && <TooltipContent>{description}</TooltipContent>}
    </Tooltip>
  );
}

export function SkillBadge({
  name,
  category,
  level,
  className,
}: {
  name: string;
  category?: SkillCategory | string;
  level?: number;
  className?: string;
}) {
  const meta = category ? SKILL_CATEGORY_META[category as SkillCategory] : null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium text-xs gap-1",
        meta?.color ?? "bg-muted text-foreground border-border",
        className,
      )}
    >
      {name}
      {level !== undefined && (
        <span className="opacity-60" title={`Level ${level}/5`}>
          {"●".repeat(Math.min(level, 5))}
        </span>
      )}
    </Badge>
  );
}

export function RecruitmentBadge({ status }: { status?: string | null }) {
  const meta = RECRUITMENT_STATUSES.find((s) => s.value === status);
  if (!meta) return null;
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    amber: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    zinc: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  };
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", toneMap[meta.tone])}>
      {meta.label}
    </Badge>
  );
}

export function CommitmentBadge({ commitment }: { commitment?: string | null }) {
  const meta = COMMITMENT_LEVELS.find((c) => c.value === commitment);
  if (!meta) return null;
  return (
    <Badge variant="outline" className="text-xs font-medium bg-background">
      {meta.label}
    </Badge>
  );
}

export function ExperienceBadge({ level }: { level?: string | null }) {
  const meta = EXPERIENCE_LEVELS.find((e) => e.value === level);
  if (!meta) return null;
  return (
    <Badge variant="secondary" className="text-xs font-medium">
      {meta.label}
    </Badge>
  );
}

export function EmergencyBadge() {
  return (
    <Badge className="bg-red-100 text-red-700 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800 hover:bg-red-100 text-xs font-semibold gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Emergency
    </Badge>
  );
}
