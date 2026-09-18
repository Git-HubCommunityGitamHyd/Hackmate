"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users2,
  Lock,
  Github,
  Lightbulb,
  Bookmark,
  BookmarkCheck,
  Hourglass,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CommitmentBadge, SkillBadge } from "@/components/shared/badges";
import { MatchRing } from "@/components/shared/match-ring";
import { EmptyState } from "@/components/shared/empty-state";
import { GapAnalysisPanel } from "@/components/team/gap-analysis";
import { JoinRequestDialog } from "@/components/team/join-request-dialog";
import { useTeamDetail, useJoinTeam, useCurrentUser, useToggleBookmark } from "@/hooks/use-api";
import { api } from "@/hooks/use-api";

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useCurrentUser();
  const { data: team, isLoading, error } = useTeamDetail(id);
  const joinTeam = useJoinTeam();
  const toggleBookmark = useToggleBookmark();
  const [joinOpen, setJoinOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  if (isLoading) {
    return (
      <div className="pt-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="pt-16">
        <EmptyState
          icon={Users2}
          title="Team not found"
          description="This team may have disbanded or the link is wrong."
          action={<Button asChild><Link href="/">Back to Discover</Link></Button>}
        />
      </div>
    );
  }

  const isMember = team.viewer.isMember;
  const canJoin =
    isAuthenticated && !isMember && team.status === "recruiting" && team.memberCount < team.targetSize;

  async function handleJoin(message: string, roleSlug?: string) {
    await joinTeam.mutateAsync({ teamId: team!.id, message, roleSlug });
  }

  async function handleBookmark() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const res = await api<{ bookmarked: boolean }>("/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ targetType: "team", targetId: team!.id }),
    });
    setBookmarked(res.bookmarked);
  }

  return (
    <div className="pt-8 pb-4">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
        <Link href={`/hackathons/${team.hackathonSlug}`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {team.hackathonName}
        </Link>
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Badge variant="outline" className={
                      team.status === "recruiting"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold"
                        : "text-zinc-500"
                    }>
                      {team.status === "recruiting" ? `${team.targetSize - team.memberCount} spot${team.targetSize - team.memberCount > 1 ? "s" : ""} left` : team.status}
                    </Badge>
                    <CommitmentBadge commitment={team.commitment} />
                    {team.lookingForIdea && (
                      <Badge variant="outline" className="gap-1">
                        <Lightbulb className="h-3 w-3" /> open to ideas
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight">{team.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {team.memberCount}/{team.targetSize} members · created{" "}
                    {new Date(team.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {team.viewer.matchScore !== null && team.viewer.matchScore !== undefined && (
                    <div className="flex flex-col items-center">
                      <MatchRing score={team.viewer.matchScore} size={64} />
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-1">
                        your match
                      </span>
                    </div>
                  )}
                  <Button variant="outline" size="icon" onClick={handleBookmark} aria-label="Bookmark team">
                    {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Separator className="my-5" />

              {/* The idea */}
              <div className="bg-muted/40 rounded-lg p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  The idea
                </h3>
                {team.ideaAnonymous && !isMember ? (
                  <div className="flex items-start gap-3">
                    <Lock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{team.ideaTitle ?? "Anonymous idea"}</p>
                      <p className="text-sm text-muted-foreground italic mt-0.5">
                        Domain: {team.ideaDomain ?? "undisclosed"} — full details revealed to members and
                        accepted requesters.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-sm">{team.ideaTitle}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {team.ideaDescription ?? "No description yet."}
                    </p>
                  </div>
                )}
              </div>

              {team.viewer.matchReasons.length > 0 && !isMember && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Why you fit
                  </h4>
                  <ul className="space-y-1">
                    {team.viewer.matchReasons.map((r) => (
                      <li key={r} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">✓</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-6">
                {isMember ? (
                  <Button asChild className="font-semibold">
                    <Link href="/my-team">Open team workspace</Link>
                  </Button>
                ) : team.viewer.hasPendingRequest ? (
                  <Button disabled variant="outline" className="gap-2">
                    <Hourglass className="h-4 w-4" /> Request pending
                  </Button>
                ) : team.viewer.hasPendingInvite ? (
                  <Button asChild className="font-semibold">
                    <Link href="/notifications">You have an invite — respond</Link>
                  </Button>
                ) : (
                  <Button
                    className="font-semibold"
                    disabled={!canJoin}
                    onClick={() => {
                      if (!isAuthenticated) {
                        router.push("/login");
                        return;
                      }
                      setJoinOpen(true);
                    }}
                  >
                    {team.status === "recruiting" && team.memberCount < team.targetSize
                      ? "Request to join"
                      : "Team is full"}
                  </Button>
                )}
                {team.repoUrl && isMember && (
                  <Button asChild variant="outline">
                    <a href={team.repoUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2" /> Repo <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" /> Members ({team.memberCount}/{team.targetSize})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {team.members.map((m) => (
                <Link
                  key={m.userId}
                  href={`/profile/${m.userId}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-muted/30 transition-all"
                >
                  <UserAvatar name={m.name} image={m.image} className="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{m.name}</span>
                      {m.isAdmin && (
                        <Badge variant="secondary" className="text-[10px] py-0">lead</Badge>
                      )}
                      {m.role && (
                        <Badge variant="outline" className="text-[10px] py-0">{m.role.name}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.topSkills.slice(0, 3).map((s) => (
                        <SkillBadge key={s.slug} name={s.name} category={s.category} className="text-[10px] py-0" />
                      ))}
                    </div>
                  </div>
                </Link>
              ))}

              {/* Empty slots */}
              {[...Array(Math.max(0, team.targetSize - team.members.length))].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-dashed text-muted-foreground"
                >
                  <div className="h-10 w-10 rounded-full border-2 border-dashed grid place-items-center text-sm">
                    +
                  </div>
                  <span className="text-sm">
                    {team.openRoles[i]
                      ? `Open: ${team.openRoles[i]}`
                      : "Open slot"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Composition Intelligence */}
        <div className="space-y-6">
          <GapAnalysisPanel composition={team.composition} />

          {team.skillsWanted.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Skills this team wants</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {team.skillsWanted.map((s) => (
                  <SkillBadge key={s.slug} name={s.name} category={s.category} />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Roles needed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {team.rolesNeeded.map((r) => (
                <div key={r.slug} className="flex items-center justify-between text-sm">
                  <span className={team.openRoles.includes(r.name) ? "font-semibold" : "text-muted-foreground line-through"}>
                    {r.name}
                  </span>
                  {team.openRoles.includes(r.name) ? (
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">{r.priority}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 dark:border-emerald-800">filled</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <JoinRequestDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        teamName={team.name}
        openRoles={team.openRoles}
        onSubmit={handleJoin}
      />
    </div>
  );
}
