"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Users, Loader2 } from "lucide-react";
import { api, type PersonCardDTO } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";

export interface BuilderMember extends PersonCardDTO {
  matchScore: number;
  matchReasons: string[];
}

export interface BuilderRecommendation {
  requester: PersonCardDTO;
  members: BuilderMember[];
  missingSlots: number;
  coveredRoles: string[];
  coveredSkills: string[];
  uncoveredRoles: string[];
  uncoveredSkills: string[];
  explanation: string;
  hackathon: { id: string; slug: string; name: string };
}

export function BuilderPanel({
  hackathon,
  initialSelectedIds,
  onSelectionChange,
}: {
  hackathon: string;
  initialSelectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[] | null>(initialSelectedIds ?? null);
  const recommendation = useQuery({
    queryKey: ["team-builder", hackathon],
    queryFn: () => api<BuilderRecommendation>(`/api/teams/builder?hackathon=${encodeURIComponent(hackathon)}`),
  });

  if (recommendation.isLoading) {
    return <Card><CardHeader><CardTitle className="text-base">Build my team</CardTitle></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>;
  }
  if (recommendation.isError) {
    return (
      <Card role="alert">
        <CardHeader><CardTitle className="text-base">Build my team</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{(recommendation.error as Error).message}</p>
          <Button type="button" size="sm" onClick={() => recommendation.refetch()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }
  const data = recommendation.data;
  if (!data) return null;
  const selectedIds = selected ?? initialSelectedIds ?? data.members.map((member) => member.id);
  const selectedSet = new Set(selectedIds);
  const ids = selectedIds.join(",");

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Build my team</CardTitle>
        <p className="text-xs text-muted-foreground">{data.explanation}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">You</Badge>
          {data.members.map((member) => (
            <label key={member.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-xs">
              <input type="checkbox" checked={selectedSet.has(member.id)} onChange={() => setSelected((current) => {
                const next = new Set(current ?? data.members.map((item) => item.id));
                if (next.has(member.id)) next.delete(member.id); else next.add(member.id);
                const ids = [...next];
                onSelectionChange?.(ids);
                return ids;
              })} />
              <UserAvatar name={member.name} image={member.image} className="h-5 w-5" />
              <span>{member.name}</span><span className="text-primary">{member.matchScore}%</span>
            </label>
          ))}
        </div>
        {data.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No eligible teammates are available yet. Refresh later or complete more profile details.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{data.members.map((member) => `${member.name}: ${member.matchReasons.join("; ")}`).join(" · ")}</p>
            <p className="text-xs text-muted-foreground">
              Roles covered: {data.coveredRoles.join(", ") || "none"}.
              {data.uncoveredRoles.length > 0 && ` Still needed: ${data.uncoveredRoles.slice(0, 3).join(", ")}.`}
            </p>
            <p className="text-xs text-muted-foreground">
              Skills covered: {data.coveredSkills.slice(0, 6).join(", ") || "none"}.
              {data.uncoveredSkills.length > 0 && ` Other available gaps: ${data.uncoveredSkills.slice(0, 3).join(", ")}.`}
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => recommendation.refetch()} disabled={recommendation.isFetching}>
            {recommendation.isFetching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />} Refresh
          </Button>
          <Button asChild size="sm" disabled={selectedIds.length === 0}><Link href={`/teams/new?hackathon=${data.hackathon.id}&builderHackathon=${encodeURIComponent(data.hackathon.slug)}&builderCandidates=${ids}`}><Users className="mr-1.5 h-4 w-4" /> Review and create team</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}
