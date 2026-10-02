"use client";

import Link from "next/link";
import { Github, Clock, MapPin, Compass, Lightbulb, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { CardPeek, PeekRow } from "@/components/shared/card-peek";
import { SplineReveal } from "@/components/ui/spline-reveal";
import {
  SkillBadge,
  RecruitmentBadge,
  CommitmentBadge,
  ExperienceBadge,
  EmergencyBadge,
} from "@/components/shared/badges";
import { MatchRing } from "@/components/shared/match-ring";
import { ROLE_TAXONOMY } from "@/lib/constants";
import type { PersonCardDTO } from "@/lib/queries/types";

/** Render a discovery profile card with skills, verification status, and optional match and action controls. */
export function PersonCard({
  person,
  showMatch,
  showKarma,
  action,
  delay = 0,
}: {
  person: PersonCardDTO;
  showMatch?: boolean;
  showKarma?: boolean;
  action?: React.ReactNode;
  /** Seconds to wait before the spring entrance (list stagger). */
  delay?: number;
}) {
  return (
    <SplineReveal delay={delay} className="h-full">
    <Card className="group relative hover:border-primary/40 transition-all duration-300">
      {/* Peep window — hover the card to peek at its components. */}
      <CardPeek label="peek · person">
        {person.topSkills.length > 0 && (
          <PeekRow icon={<Zap className="text-primary" />}>
            {person.topSkills
              .slice(0, 3)
              .map((s) => `${s.name} L${s.level ?? "?"}`)
              .join(" · ")}
          </PeekRow>
        )}
        {person.roles.length > 0 && (
          <PeekRow icon={<Compass />}>
            {person.roles
              .slice(0, 2)
              .map((r) => r.name)
              .join(" · ")}
          </PeekRow>
        )}
        <PeekRow icon={<Clock />}>
          {person.hoursPerWeek ? `${person.hoursPerWeek}h/week · ` : ""}
          {(person.commitment ?? "commitment unset").replace(/_/g, " ")}
        </PeekRow>
        {person.collegeName && (
          <PeekRow icon={<MapPin />}>{person.collegeName}</PeekRow>
        )}
      </CardPeek>

      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Link href={`/profile/${person.id}`} className="shrink-0">
            <UserAvatar name={person.name} image={person.image} emergency={person.emergencyAvailable} className="h-12 w-12" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/profile/${person.id}`}>
                <h3 className="font-bold text-base leading-tight hover:text-primary transition-colors">
                  {person.name}
                </h3>
                {person.idVerified && <VerifiedBadge compact />}
              </Link>
              {person.emergencyAvailable && <EmergencyBadge />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              {person.collegeName && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {person.collegeName}
                </span>
              )}
              {person.hoursPerWeek && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {person.hoursPerWeek}h/week
                </span>
              )}
              {person.githubUsername && (
                <a
                  href={`https://github.com/${person.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <Github className="h-3 w-3" /> {person.githubUsername}
                </a>
              )}
            </p>

            {person.bio && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{person.bio}</p>
            )}

            {person.topSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {person.topSkills.slice(0, 5).map((s) => (
                  <SkillBadge key={s.slug} name={s.name} category={s.category} level={s.level} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <RecruitmentBadge status={person.recruitmentStatus} />
              <CommitmentBadge commitment={person.commitment} />
              <ExperienceBadge level={person.experienceLevel} />
              {showKarma && person.karma !== undefined && (
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  {person.karma} karma
                </span>
              )}
              {person.roles[0] && (
                <span className="text-[11px] text-muted-foreground">
                  · {person.roles[0].name}
                </span>
              )}
            </div>

            {person.hackathonProfile && (
              <div className="mt-3 rounded-lg border border-primary/35 bg-primary/[0.08] px-3 py-2">
                <p className="text-xs flex items-center gap-1.5 font-medium text-primary">
                  <Compass className="h-3.5 w-3.5 shrink-0" />
                  For this event:
                  {person.hackathonProfile.preferredRoleSlug
                    ? ` building as ${ROLE_TAXONOMY.find((r) => r.slug === person.hackathonProfile?.preferredRoleSlug)?.name ?? person.hackathonProfile.preferredRoleSlug}`
                    : " open to any role"}
                </p>
                {person.hackathonProfile.motivation && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {person.hackathonProfile.motivation}
                  </p>
                )}
                {person.hackathonProfile.ideaBlurb && (
                  <p className="text-xs text-primary/90 mt-1 flex items-start gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-px" />
                    <span className="line-clamp-2">{person.hackathonProfile.ideaBlurb}</span>
                  </p>
                )}
              </div>
            )}

            {person.matchReasons && person.matchReasons.length > 0 && (
              <ul className="mt-3 space-y-0.5">
                {person.matchReasons.slice(0, 2).map((r) => (
                  <li key={r} className="text-[11px] text-muted-foreground flex items-start gap-1">
                    <span className="text-primary mt-0.5">✓</span> {r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0">
            {showMatch && person.matchScore !== undefined && (
              <MatchRing score={person.matchScore} />
            )}
            <div className="flex items-center gap-1">
              <BookmarkButton targetType="person" targetId={person.id} />
              {action ?? (
                <Button asChild size="sm" variant="outline" className="text-xs">
                  <Link href={`/profile/${person.id}`}>View profile</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </SplineReveal>
  );
}
