"use client";

import Link from "next/link";
import {
  Lightbulb,
  Users,
  ArrowRight,
  Lock,
  Compass,
  Target,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchRing } from "@/components/shared/match-ring";
import { CommitmentBadge } from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CardPeek, PeekRow } from "@/components/shared/card-peek";
import { SplineReveal } from "@/components/ui/spline-reveal";
import type { TeamCardDTO } from "@/lib/queries/types";

export function TeamCard({ team, showMatch, delay = 0 }: { team: TeamCardDTO; showMatch?: boolean; delay?: number }) {
  const spotsLeft = team.targetSize - team.memberCount;
  const full = spotsLeft <= 0 || team.status !== "recruiting";

  return (
    <SplineReveal delay={delay} className="h-full">
    <Card className="group relative hover:border-primary/40 transition-all duration-300">
      {/* Peek window - hover the card and the hub preview covers it. */}
      <CardPeek>
        <PeekRow icon={<Users />}>
          {team.memberNames.slice(0, 3).join(", ")}
          {team.memberCount > 3 ? ` +${team.memberCount - 3} more` : ""}
        </PeekRow>
        {team.openRoles.length > 0 && (
          <PeekRow icon={<Target className="text-primary" />}>
            needs {team.openRoles.slice(0, 3).join(" · ")}
          </PeekRow>
        )}
        {team.missingSkills.length > 0 && (
          <PeekRow icon={<Wrench />}>
            missing {team.missingSkills.slice(0, 3).join(" · ")}
          </PeekRow>
        )}
        <PeekRow icon={<CheckCircle2 className="text-primary" />}>
          {team.completeness}% complete · {team.memberCount}/{team.targetSize} members
        </PeekRow>
      </CardPeek>

      <CardContent className="p-5 pb-3">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {full ? (
                <Badge variant="outline" className="text-[11px] text-muted-foreground">full</Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] font-semibold border-primary/40 bg-primary/10 text-primary">
                  {spotsLeft} spot{spotsLeft > 1 ? "s" : ""} left
                </Badge>
              )}
              {!team.hackathonId && (
                <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/30">
                  <Compass className="h-3 w-3 mr-0.5" /> idea-first
                </Badge>
              )}
              {team.lookingForIdea && (
                <Badge variant="outline" className="text-[11px] bg-secondary/60 text-foreground/80 border-border">
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
                event not chosen yet; the idea leads, the hackathon follows
              </p>
            )}

            {team.ideaAnonymous ? (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span className="italic">{team.ideaDomain ?? "Idea under wraps"} · request to join for details</span>
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
    </SplineReveal>
  );
}
