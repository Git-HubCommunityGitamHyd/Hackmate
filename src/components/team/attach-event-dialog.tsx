"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Compass } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

/**
 * Attach an event to an idea-first team. Until this happens the team floats
 * in Discover with an "idea-first" tag and can't record results.
 */
export function AttachEventDialog({
  teamId,
  triggerClassName,
}: {
  teamId: string;
  triggerClassName?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hackathonId, setHackathonId] = useState("");

  const hackathons = useQuery({
    queryKey: ["hackathons-attach"],
    queryFn: () => api<{ id: string; name: string }[]>("/api/hackathons"),
    select: (list) => list.filter((h: any) => h.status !== "completed"),
    enabled: open,
  });

  const attach = useMutation({
    mutationFn: () =>
      api(`/api/teams/${teamId}`, {
        method: "PATCH",
        body: JSON.stringify({ hackathonId }),
      }),
    onSuccess: () => {
      toast.success("Event attached. The team is now part of it");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["my-team"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["hackathon-hub"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn("font-semibold", triggerClassName)}>
          <Compass className="h-4 w-4 mr-2" /> Attach an event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pick your event</DialogTitle>
          <DialogDescription>
            The idea led, the team clicked. Now anchor it to a hackathon. Everyone&apos;s
            schedules, deadlines and the submission checklist light up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Hackathon</Label>
          <Select value={hackathonId} onValueChange={setHackathonId}>
            <SelectTrigger><SelectValue placeholder="Choose an event" /></SelectTrigger>
            <SelectContent>
              {(hackathons.data ?? []).map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(hackathons.data ?? []).length === 0 && !hackathons.isLoading && (
            <p className="text-xs text-muted-foreground">
              No upcoming events posted yet. Check back soon.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Not yet
          </Button>
          <Button
            onClick={() => {
              if (!hackathonId) return toast.error("Choose an event first");
              attach.mutate();
            }}
            disabled={attach.isPending || !hackathonId}
            className="font-semibold"
          >
            {attach.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Compass className="h-4 w-4 mr-2" />}
            Attach event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
