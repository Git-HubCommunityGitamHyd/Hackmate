"use client";

import Link from "next/link";
import { Github, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  SkillBadge,
  RecruitmentBadge,
  CommitmentBadge,
  ExperienceBadge,
  EmergencyBadge,
} from "@/components/shared/badges";
import { MatchRing } from "@/components/shared/match-ring";
import type { PersonCardDTO } from "@/lib/queries/types";

export function PersonCard({
  person,
  showMatch,
  action,
}: {
  person: PersonCardDTO;
  showMatch?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Card className="group hover:shadow-md hover:border-primary/40 transition-all">
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
              {person.roles[0] && (
                <span className="text-[11px] text-muted-foreground">
                  · {person.roles[0].name}
                </span>
              )}
            </div>

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
            {action ?? (
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link href={`/profile/${person.id}`}>View profile</Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
