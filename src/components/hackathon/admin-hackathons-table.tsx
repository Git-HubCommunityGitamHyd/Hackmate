"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Trophy, Users, Compass, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/shared/empty-state";
import { api, useHackathons, type HackathonCardDTO } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ongoing: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  completed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Admin hackathon management table. Mounted only after server-side admin check. */
export function AdminHackathonsTable() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: hackathons, isLoading } = useHackathons();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (h: HackathonCardDTO) =>
      api<{ deleted: string }>(`/api/hackathons/${h.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Hackathon deleted");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["hackathons"] });
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex justify-between">
              <div className="space-y-2 w-1/2">
                <div className="h-4 w-2/3 bg-muted animate-pulse" />
                <div className="h-3 w-1/3 bg-muted animate-pulse" />
              </div>
              <div className="h-8 w-24 bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const list = hackathons ?? [];

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No hackathons posted yet"
        description="You're the organizer — post the first hackathon so students can start forming teams."
        action={
          <Button asChild>
            <Link href="/hackathons/new">
              <Plus className="h-4 w-4 mr-2" /> Post the first hackathon
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {list.map((h) => {
        const deleting = deleteId === h.id && remove.isPending;
        return (
          <Card key={h.id} className={cn("transition-opacity", deleting && "opacity-50")}>
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className={cn("text-[11px] font-semibold", STATUS_STYLES[h.status])}>
                    {h.status}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">{h.mode}</Badge>
                </div>
                <Link href={`/hackathons/${h.slug}`} className="font-bold hover:text-primary transition-colors">
                  {h.name}
                </Link>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {fmtDate(h.startsAt)} – {fmtDate(h.endsAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {h.recruitingTeamCount} teams
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5" /> {h.peopleLookingCount} people
                  </span>
                  {h.prizePool && (
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <Trophy className="h-3.5 w-3.5 text-primary" /> {h.prizePool}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/hackathons/${h.slug}/edit`}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Link>
                </Button>

                <AlertDialog open={deleteId === h.id} onOpenChange={(open) => setDeleteId(open ? h.id : null)}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete “{h.name}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This also removes its {h.recruitingTeamCount} team(s), messages and bookmarks.
                        This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          remove.mutate(h);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {remove.isPending ? "Deleting…" : "Delete hackathon"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
