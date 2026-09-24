"use client";

import Link from "next/link";
import { Bookmark, Trophy, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HackathonCard } from "@/components/discover/hackathon-card";
import { TeamCard } from "@/components/discover/team-card";
import { PersonCard } from "@/components/discover/person-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useBookmarks, useCurrentUser } from "@/hooks/use-api";

export default function SavedPage() {
  const { isAuthenticated } = useCurrentUser();
  const { data, isLoading } = useBookmarks(isAuthenticated);

  if (!isAuthenticated) {
    return (
      <div className="pt-16">
        <EmptyState
          icon={Bookmark}
          title="Sign in to use bookmarks"
          description="Save interesting people, teams and hackathons for later."
          action={<Button asChild><Link href="/login">Sign in</Link></Button>}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pt-8 space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const teams = data?.teams ?? [];
  const people = data?.people ?? [];
  const hackathons = data?.hackathons ?? [];
  const empty = teams.length + people.length + hackathons.length === 0;

  return (
    <div className="pt-8 pb-4 space-y-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Saved</h1>

      {empty && (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Tap the bookmark icon on any team or person to keep them handy."
          action={<Button asChild><Link href="/">Browse Discover</Link></Button>}
        />
      )}

      {hackathons.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-primary" /> Hackathons
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {hackathons.map((h) => (
              <HackathonCard key={h.id} hackathon={h} />
            ))}
          </div>
        </section>
      )}

      {teams.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Users2 className="h-4 w-4 text-primary" /> Teams
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        </section>
      )}

      {people.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Bookmark className="h-4 w-4 text-primary" /> People
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {people.map((p) => (
              <PersonCard key={p.id} person={p as any} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
