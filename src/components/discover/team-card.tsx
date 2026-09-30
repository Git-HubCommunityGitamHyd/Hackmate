"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lightbulb, Users, ArrowRight, Lock, Compass } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchRing } from "@/components/shared/match-ring";
import { CommitmentBadge } from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { TeamCardDTO } from "@/lib/queries/types";

export function TeamCard({ team, showMatch }: { team: TeamCardDTO; showMatch?: boolean }) {
  const reduceMotion = useReducedMotion();
  const spotsLeft = team.targetSize - team.memberCount;
  const full = spotsLeft <= 0 || team.status !== "recruiting";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
    >
    <Card className="group hover:shadow-lg hover:border-primary/40 hover:shadow-primary/10 transition-all duration-300">
      <CardContent className="p-5 pb-3">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {full ? (
                <Badge variant="outline" className="text-[11px] text-zinc-500">full</Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
                  {spotsLeft} spot{spotsLeft > 1 ? "s" : ""} left
                </Badge>
              )}
              {!team.hackathonId && (
                <Badge variant="outline" className="text-[11px] bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30">
                  <Compass className="h-3 w-3 mr-0.5" /> idea-first
                </Badge>
              )}
              {team.lookingForIdea && (
                <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                  <Lightbulb className="h-3 w-3 mr-0.5" /> open to ideas
                </Badge>
              )}
              <CommitmentBadge commitment={team.commitment} />
            </div>

            <Link href={`/teams/${team.id}`}>
              <h3 className="font-bold text-lg leading-snug hover:text-primary transition-colors">
                {team.name}
              </h3>
            </Link>
            {team.hackathonName ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                for{" "}
                <Link href={`/hackathons/${team.hackathonSlug}`} className="hover:text-primary font-medium">
                  {team.hackathonName}
                </Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                event not chosen yet — the idea leads, the hackathon follows
              </p>
            )}

            {team.ideaAnonymous ? (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span className="italic">{team.ideaDomain ?? "Idea under wraps"} — request to join for details</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {team.ideaTitle} · {team.ideaDomain}
              </p>
            )}

            <div className="flex items-center gap-1.5 mt-3">
              {team.memberNames.slice(0, 4).map((name) => (
                <UserAvatar key={name} name={name} className="h-7 w-7 -mr-2 [&_.h-10]:h-7" />
              ))}
              <span className="text-xs text-muted-foreground ml-3 inline-flex items-center gap-1">
                <Users className="h-3 w-3" /> {team.memberCount}/{team.targetSize}
              </span>
            </div>

            {(team.openRoles.length > 0 || team.missingSkills.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {team.openRoles.slice(0, 3).map((r) => (
                  <Badge key={r} variant="outline" className="text-[11px] font-semibold bg-primary/5 border-primary/30 text-primary">
                    needs {r}
                  </Badge>
                ))}
                {team.missingSkills.slice(0, 3).map((s) => (
                  <Badge key={s} variant="outline" className="text-[11px]">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {showMatch && team.matchScore !== undefined && (
            <div className="flex flex-col items-center gap-1 shrink-0">
              <MatchRing score={team.matchScore} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">match</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="px-5 py-3 border-t bg-muted/30 flex items-center justify-between">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
              Team completeness
            </span>
            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${team.completeness}%` }}
              />
            </div>
            <span className="text-xs font-bold">{team.completeness}%</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 group-hover:text-primary">
            <Link href={`/teams/${team.id}`}>
              View team <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
    </motion.div>
  );
}
