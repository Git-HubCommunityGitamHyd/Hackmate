"use client";

import { ReputationBadge } from "@/components/shared/badges";
import { useProfile } from "@/hooks/use-api";

export function BadgeRow({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId);

  if (!profile || profile.badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Badges">
      {profile.badges.map((badge) => (
        <ReputationBadge key={badge.slug} {...badge} />
      ))}
    </div>
  );
}