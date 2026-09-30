"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, Clock, Users, MapPin, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import type { HackathonCardDTO } from "@/lib/queries/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function HackathonCard({ hackathon }: { hackathon: HackathonCardDTO }) {
  const statusColor =
    hackathon.status === "ongoing"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : hackathon.status === "completed"
        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";

  const regDays = hackathon.registrationDeadline ? daysUntil(hackathon.registrationDeadline) : null;
  const reduceMotion = useReducedMotion();

  const noActivity =
    hackathon.recruitingTeamCount === 0 && hackathon.peopleLookingCount === 0;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
    >
    <Card className="group hover:shadow-lg hover:border-primary/40 hover:shadow-primary/10 transition-all duration-300 overflow-hidden cursor-pointer focus-within:ring-2 focus-within:ring-ring/40">
      <CardContent className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Badge variant="outline" className={`text-[11px] font-semibold ${statusColor}`}>
                {hackathon.status}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {hackathon.mode}
              </Badge>
              {regDays !== null && regDays > 0 && regDays <= 14 && (
                <Badge variant="destructive" className="text-[11px] font-semibold">
                  registration closes in {regDays}d
                </Badge>
              )}
            </div>
            <Link href={`/hackathons/${hackathon.slug}`}>
              <h3 className="font-bold text-lg leading-snug hover:text-primary transition-colors">
                {hackathon.name}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 text-balance">
              {hackathon.tagline}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {hackathon.prizePool && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Trophy className="h-3 w-3" /> Prize
                </div>
                <div className="font-bold text-sm">{hackathon.prizePool}</div>
              </div>
            )}
            <BookmarkButton targetType="hackathon" targetId={hackathon.id} />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {fmtDate(hackathon.startsAt)} – {fmtDate(hackathon.endsAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            teams of {hackathon.teamSizeMin}–{hackathon.teamSizeMax}
          </span>
          {hackathon.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {hackathon.location}
            </span>
          )}
        </div>

        {hackathon.themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {hackathon.themes.slice(0, 4).map((t) => (
              <Badge key={t} variant="secondary" className="text-[11px] font-medium">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="px-5 py-3 border-t bg-muted/30 flex items-center justify-between">
        {noActivity ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Be the first to build a team here
          </span>
        ) : (
          <div className="flex items-center gap-4 text-xs">
            {hackathon.recruitingTeamCount > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                {hackathon.recruitingTeamCount} team{hackathon.recruitingTeamCount === 1 ? "" : "s"} recruiting
              </span>
            )}
            {hackathon.peopleLookingCount > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {hackathon.peopleLookingCount} looking
              </span>
            )}
          </div>
        )}
        <Button asChild variant="ghost" size="sm" className="gap-1 group-hover:text-primary">
          <Link href={`/hackathons/${hackathon.slug}`}>
            Open hub <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
    </motion.div>
  );
}
