"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  UserPlus,
  CheckCheck,
  Inbox,
  Clock,
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { api, useNotifications, useCurrentUser } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { isAuthenticated } = useCurrentUser();
  const { data, isLoading } = useNotifications(isAuthenticated);
  const qc = useQueryClient();

  const markAll = useMutation({
    mutationFn: () => api("/api/notifications", { method: "PATCH", body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const respondInvite = useMutation({
    mutationFn: ({ teamId, action }: { teamId: string; action: "accepted" | "declined" }) =>
      api(`/api/teams/${teamId}/invites`, { method: "PATCH", body: JSON.stringify({ action }) }),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "accepted" ? "Invite accepted — welcome to the team! 🎉" : "Invite declined");
      qc.invalidateQueries();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="pt-16">
        <EmptyState
          icon={Bell}
          title="Sign in to see notifications"
          description="Join requests, invites and deadline reminders land here."
          action={<Button asChild><Link href="/login">Sign in</Link></Button>}
        />
      </div>
    );
  }

  const invites = data?.invites ?? [];
  const myRequests = data?.myRequests ?? [];
  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="pt-8 pb-4 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="h-4 w-4 mr-1.5" /> Mark all read ({unread})
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {/* Invites */}
      {invites.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Team invites ({invites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.map((i) => (
              <div key={i.id} className="flex items-start gap-3 p-3 rounded-lg border bg-primary/[0.03]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {i.inviterName} invited you to join <span className="text-primary">{i.teamName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {i.hackathonName} · {new Date(i.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  {i.message && <p className="text-sm text-muted-foreground mt-1.5 italic">&ldquo;{i.message}&rdquo;</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => respondInvite.mutate({ teamId: i.teamId, action: "accepted" })}>
                    <Check className="h-4 w-4 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondInvite.mutate({ teamId: i.teamId, action: "declined" })}
                  >
                    <X className="h-4 w-4 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My outgoing requests */}
      {myRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Pending join requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myRequests.map((r) => (
              <Link
                key={r.id}
                href={`/teams/${r.teamId}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors"
              >
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{r.teamName}</span>
                  <span className="text-xs text-muted-foreground block truncate">{r.message}</span>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">pending</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {notifications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nothing yet"
              description="Join requests, invites and deadline reminders will show up here."
            />
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-muted/40",
                  !n.read && "bg-primary/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full mt-1.5 shrink-0",
                    !n.read ? "bg-primary" : "bg-transparent",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", n.read ? "font-medium" : "font-semibold")}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {n.link && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
