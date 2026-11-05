"use client";

import Link from "next/link";
import { Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveMatches, useCurrentUser } from "@/hooks/use-api";

export default function MatchesPage() {
  const { isAuthenticated } = useCurrentUser();
  const { data, isLoading } = useActiveMatches(isAuthenticated);

  if (!isAuthenticated) {
    return <div className="pt-16"><EmptyState icon={Sparkles} title="Sign in to see your matches" description="HackMate will surface recruiting teams that fit your profile." action={<Button asChild><Link href="/login">Sign in</Link></Button>} /></div>;
  }

  return (
    <div className="pt-8 pb-4 max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Your matches</h1><p className="text-sm text-muted-foreground mt-1">All currently eligible team opportunities suggested for your profile.</p></div>
      {isLoading && <Skeleton className="h-48 w-full rounded-xl" />}
      {!isLoading && data?.length === 0 && <EmptyState icon={Users} title="No active matches yet" description="Turn on “Open to team opportunities” in your profile and keep your skills and roles up to date." action={<Button asChild variant="outline"><Link href="/profile/edit">Update preferences</Link></Button>} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((match) => (
          <Card key={match.id}>
            <CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><CardTitle className="text-base">{match.teamName}</CardTitle><Badge variant="secondary">{match.score}% fit</Badge></div><p className="text-xs text-muted-foreground">{match.hackathonName ?? "Idea-first team"} · {match.roleName}</p></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{match.reasons.length > 0 ? match.reasons.join(" ") : "Your profile aligns with this team's open role."}</p><Button asChild size="sm" className="mt-4"><Link href={`/teams/${match.teamId}`}>View team</Link></Button></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
