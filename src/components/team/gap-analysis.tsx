"use client";

import Link from "next/link";
import { Radar, Sparkles, Clock, ShieldAlert, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { MatchRing } from "@/components/shared/match-ring";
import { CompletenessMeter } from "./completeness-meter";
import type { CompositionReport } from "@/lib/matching/composition";
import type { PersonRecommendation } from "@/hooks/use-api";

/**
 * Team Composition Intelligence panel — the standout feature.
 * Narrative + coverage map + gap-driven candidate recommendations.
 */
export function GapAnalysisPanel({
  composition,
  recommendations,
  onInvite,
  canInvite,
}: {
  composition: CompositionReport;
  recommendations?: PersonRecommendation[];
  onInvite?: (userId: string) => void;
  canInvite?: boolean;
}) {
  return (
    <Card className="border-primary/25 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Radar className="h-5 w-5 text-primary" />
          Team Composition Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Narrative */}
        <p className="text-sm leading-relaxed font-medium text-balance">
          {composition.summary}
        </p>

        {/* Coverage meter */}
        <CompletenessMeter composition={composition} />

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Fills your gaps
            </h4>
            <div className="space-y-2">
              {recommendations.map(({ person, rec }) => (
                <div
                  key={rec.userId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background border"
                >
                  <UserAvatar name={person.name} image={person.image} emergency={person.emergencyAvailable} className="h-9 w-9" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${person.id}`} className="text-sm font-semibold hover:text-primary truncate">
                        {rec.name}
                      </Link>
                      {person.idVerified && <VerifiedBadge compact />}
                      {rec.emergencyAvailable && <ShieldAlert className="h-3.5 w-3.5 text-red-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{rec.why}</p>
                    {rec.availableAllThrough && (
                      <Badge variant="outline" className="mt-1 text-[10px] py-0 gap-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        <Clock className="h-2.5 w-2.5" /> available all-through
                      </Badge>
                    )}
                  </div>
                  <MatchRing score={rec.matchScore} size={44} />
                  {canInvite && onInvite && (
                    <Button size="sm" variant="outline" onClick={() => onInvite(rec.userId)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Invite
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
