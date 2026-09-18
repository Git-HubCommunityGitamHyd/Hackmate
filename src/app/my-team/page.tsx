"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users2,
  ArrowLeft,
  UserPlus,
  LogOut,
  ExternalLink,
  Loader2,
  Check,
  X,
  MessageSquare,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SkillBadge, CommitmentBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { GapAnalysisPanel } from "@/components/team/gap-analysis";
import { TeamChat } from "@/components/team/team-chat";
import { TaskChecklist } from "@/components/team/task-checklist";
import { InviteDialog } from "@/components/team/invite-dialog";
import { api, useMyTeam, useCurrentUser, useNotifications, type TeamDetailDTO, type NotificationsData, type PersonRecommendation } from "@/hooks/use-api";

export default function MyTeamPage() {
  const { isAuthenticated } = useCurrentUser();
  const router = useRouter();
  const { data: team, isLoading } = useMyTeam();
  const { data: notif } = useNotifications(isAuthenticated);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="pt-16">
        <EmptyState
          icon={Users2}
          title="Sign in to see your team"
          description="Your team workspace lives here once you join or create a team."
          action={<Button asChild><Link href="/login">Sign in</Link></Button>}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pt-8 space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="pt-16">
        <EmptyState
          icon={Users2}
          title="You're not on a team yet"
          description="Find a recruiting team that needs exactly your skills — or create one around your idea."
          action={
            <div className="flex gap-3">
              <Button asChild><Link href="/#teams">Browse teams</Link></Button>
              <Button asChild variant="outline"><Link href="/teams/new">Create a team</Link></Button>
            </div>
          }
        />
      </div>
    );
  }

  return <TeamWorkspace team={team} notif={notif} inviteOpen={inviteOpen} setInviteOpen={setInviteOpen} />;
}

function TeamWorkspace({
  team,
  notif,
  inviteOpen,
  setInviteOpen,
}: {
  team: TeamDetailDTO;
  notif?: NotificationsData;
  inviteOpen: boolean;
  setInviteOpen: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const isAdmin = team.viewer.isAdmin;

  /* Gap-driven candidate recommendations for the admin view. */
  const recs = useQuery({
    queryKey: ["team-recs", team.id],
    queryFn: () => api<PersonRecommendation[]>(`/api/matches?type=people&teamId=${team.id}`),
    enabled: isAdmin && team.status === "recruiting",
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const respond = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: "accepted" | "declined" }) =>
      api(`/api/teams/${team.id}/requests`, {
        method: "PATCH",
        body: JSON.stringify({ requestId, action }),
      }),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "accepted" ? "Request accepted — they're in! 🎉" : "Request declined");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setStatus = useMutation({
    mutationFn: (status: "recruiting" | "full") =>
      api(`/api/teams/${team.id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success("Recruitment status updated");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const leave = useMutation({
    mutationFn: () => api(`/api/teams/${team.id}/members`, { method: "DELETE", body: JSON.stringify({}) }),
    onSuccess: () => {
      toast.success("You left the team");
      qc.invalidateQueries();
      window.location.href = "/";
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const incoming = notif?.incomingRequests?.filter((r) => r.teamId === team.id) ?? [];

  return (
    <div className="pt-8 pb-4">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
        <Link href={`/hackathons/${team.hackathonSlug}`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {team.hackathonName}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge
              variant="outline"
              className={team.status === "recruiting" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold" : ""}
            >
              {team.status}
            </Badge>
            <CommitmentBadge commitment={team.commitment} />
            <span className="text-sm text-muted-foreground">
              {team.memberCount}/{team.targetSize} members
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{team.name}</h1>
          {team.ideaTitle && <p className="text-sm text-muted-foreground mt-0.5">{team.ideaTitle}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && team.status === "recruiting" && (
            <Button variant="outline" onClick={() => setStatus.mutate("full")} disabled={setStatus.isPending}>
              Mark team full
            </Button>
          )}
          {isAdmin && team.status === "full" && (
            <Button variant="outline" onClick={() => setStatus.mutate("recruiting")} disabled={setStatus.isPending}>
              Reopen recruitment
            </Button>
          )}
          {isAdmin && team.status === "recruiting" && (
            <Button onClick={() => setInviteOpen(true)} className="font-semibold">
              <UserPlus className="h-4 w-4 mr-2" /> Invite people
            </Button>
          )}
          {team.chatUrl && (
            <Button asChild variant="outline">
              <a href={team.chatUrl} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp/Discord <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Leave team
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave {team.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  You&apos;ll lose access to the team chat and workspace. Your badges and history stay on your profile.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Stay</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => leave.mutate()}
                >
                  {leave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Leave team"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Idea */}
          {team.ideaDescription && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">The idea</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{team.ideaDescription}</p>
                <div className="flex gap-3 mt-3">
                  {team.repoUrl && (
                    <Button asChild size="sm" variant="outline">
                      <a href={team.repoUrl} target="_blank" rel="noopener noreferrer">
                        GitHub repo <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="chat">
            <TabsList className="bg-muted">
              <TabsTrigger value="chat" className="gap-1.5 data-[state=active]:bg-background">
                <MessageSquare className="h-4 w-4" /> Chat
              </TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-background">Checklist</TabsTrigger>
              <TabsTrigger value="members" className="data-[state=active]:bg-background">Members</TabsTrigger>
              {isAdmin && incoming.length > 0 && (
                <TabsTrigger value="requests" className="gap-1.5 data-[state=active]:bg-background">
                  Requests
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{incoming.length}</Badge>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="chat" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <TeamChat teamId={team.id} teamName={team.name} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <TaskChecklist teamId={team.id} tasks={team.tasks} />
            </TabsContent>

            <TabsContent value="members" className="mt-4">
              <Card>
                <CardContent className="p-4 space-y-2">
                  {team.members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3 p-3 rounded-lg border">
                      <UserAvatar name={m.name} image={m.image} className="h-10 w-10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/profile/${m.userId}`} className="font-semibold text-sm hover:text-primary">
                            {m.name}
                          </Link>
                          {m.isAdmin && (
                            <Badge variant="secondary" className="text-[10px] py-0 gap-0.5">
                              <Crown className="h-2.5 w-2.5" /> lead
                            </Badge>
                          )}
                          {m.role && <Badge variant="outline" className="text-[10px] py-0">{m.role.name}</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.topSkills.slice(0, 4).map((s) => (
                            <SkillBadge key={s.slug} name={s.name} category={s.category} className="text-[10px] py-0" />
                          ))}
                        </div>
                      </div>
                      {isAdmin && !m.isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            api(`/api/teams/${team.id}/members`, {
                              method: "DELETE",
                              body: JSON.stringify({ userId: m.userId }),
                            })
                              .then(() => {
                                toast.success(`${m.name} was removed`);
                                invalidate();
                              })
                              .catch((e) => toast.error(e.message))
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  {[...Array(Math.max(0, team.targetSize - team.members.length))].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-dashed text-muted-foreground">
                      <div className="h-10 w-10 rounded-full border-2 border-dashed grid place-items-center">+</div>
                      <span className="text-sm">{team.openRoles[i] ? `Open: ${team.openRoles[i]}` : "Open slot"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="requests" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    {incoming.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No pending requests. Invites you send appear in their notifications.
                      </p>
                    ) : (
                      incoming.map((r) => (
                        <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border">
                          <UserAvatar name={r.userName} image={r.userImage} className="h-10 w-10" />
                          <div className="flex-1 min-w-0">
                            <Link href={`/profile/${r.userId}`} className="font-semibold text-sm hover:text-primary">
                              {r.userName}
                            </Link>
                            <p className="text-sm text-muted-foreground mt-0.5">{r.message}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => respond.mutate({ requestId: r.id, action: "accepted" })}
                              disabled={respond.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => respond.mutate({ requestId: r.id, action: "declined" })}
                              disabled={respond.isPending}
                            >
                              <X className="h-4 w-4 mr-1" /> Decline
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <GapAnalysisPanel
            composition={team.composition}
            recommendations={recs.data ?? undefined}
            canInvite={isAdmin && team.status === "recruiting"}
            onInvite={() => setInviteOpen(true)}
          />
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        teamId={team.id}
        teamName={team.name}
        openRoles={team.openRoles}
      />
    </div>
  );
}
