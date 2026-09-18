"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";
import { MatchRing } from "@/components/shared/match-ring";
import { SkillBadge } from "@/components/shared/badges";
import { api, type PersonRecommendation, type PersonCardDTO } from "@/hooks/use-api";

/** Direct invite dialog for team leaders — shows gap-ranked candidates first. */
export function InviteDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  openRoles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  teamId: string;
  teamName: string;
  openRoles: string[];
}) {
  const [query, setQuery] = useState("");
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  /* Gap-driven recommendations (server: getPeopleMatchesForTeam). */
  const recs = useQuery({
    queryKey: ["invite-recs", teamId],
    queryFn: () => api<PersonRecommendation[]>(`/api/matches?type=people&teamId=${teamId}`),
    enabled: open,
  });

  /* Directory search fallback. */
  const directory = useQuery({
    queryKey: ["invite-directory", query],
    queryFn: () => api<PersonCardDTO[]>(`/api/users?q=${encodeURIComponent(query)}`),
    enabled: open && query.trim().length >= 2,
  });

  const invite = useMutation({
    mutationFn: ({ userId, roleSlug }: { userId: string; roleSlug?: string }) =>
      api(`/api/teams/${teamId}/invites`, {
        method: "POST",
        body: JSON.stringify({ userId, roleSlug, message }),
      }),
    onSuccess: (_d, vars) => {
      toast.success("Invite sent!");
      setInvited((prev) => new Set([...prev, vars.userId]));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Invite to {teamName}
          </DialogTitle>
          <DialogDescription>
            {openRoles.length > 0
              ? `Smart picks fill your gaps (${openRoles.join(", ")}). Or search everyone.`
              : "Search students and send direct invites."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional note — e.g. 'We need someone who can own the backend for the last 24h. You in?'"
            rows={2}
            maxLength={300}
          />

          {recs.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {recs.data && recs.data.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Smart picks — fill your gaps
              </h4>
              <div className="space-y-2">
                {recs.data.map(({ person, rec }) => (
                  <CandidateRow
                    key={person.id}
                    person={person}
                    matchScore={rec.matchScore}
                    why={rec.why}
                    invited={invited.has(person.id)}
                    onInvite={() => invite.mutate({ userId: person.id })}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, bio, GitHub…"
                className="pl-9 text-sm"
              />
            </div>
            {directory.data && (
              <div className="mt-2 space-y-2 max-h-56 overflow-y-auto scrollbar-slim">
                {directory.data
                  .filter((p) => !recs.data?.some((r) => r.person.id === p.id))
                  .map((p) => (
                    <CandidateRow
                      key={p.id}
                      person={p}
                      invited={invited.has(p.id)}
                      onInvite={() => invite.mutate({ userId: p.id })}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CandidateRow({
  person,
  matchScore,
  why,
  invited,
  onInvite,
}: {
  person: PersonCardDTO;
  matchScore?: number;
  why?: string;
  invited: boolean;
  onInvite: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border">
      <UserAvatar name={person.name} image={person.image} emergency={person.emergencyAvailable} className="h-9 w-9" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold truncate block">{person.name}</span>
        {why ? (
          <p className="text-[11px] text-muted-foreground line-clamp-1">{why}</p>
        ) : (
          <div className="flex gap-1 flex-wrap mt-0.5">
            {person.topSkills.slice(0, 3).map((s) => (
              <SkillBadge key={s.slug} name={s.name} category={s.category} className="text-[10px] py-0" />
            ))}
          </div>
        )}
      </div>
      {matchScore !== undefined && <MatchRing score={matchScore} size={40} />}
      <Button size="sm" variant={invited ? "outline" : "default"} disabled={invited} onClick={onInvite}>
        {invited ? "Sent" : "Invite"}
      </Button>
    </div>
  );
}
