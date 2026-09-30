"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserCheck, Lightbulb } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/hooks/use-api";
import { ROLE_TAXONOMY } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * "I'm looking for a team" — the hackathon-specific profile form.
 *
 * Collects what the person wants for THIS event (role, motivation, whether
 * they're carrying an idea) instead of silently marking them as looking.
 * Those answers surface on the hub's People and Ideas tabs.
 */
export function LookingDialog({
  hackathonIdOrSlug,
  hackathonName,
  triggerClassName,
}: {
  hackathonIdOrSlug: string;
  hackathonName: string;
  triggerClassName?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [roleSlug, setRoleSlug] = useState("");
  const [motivation, setMotivation] = useState("");
  const [hasIdea, setHasIdea] = useState(false);
  const [ideaBlurb, setIdeaBlurb] = useState("");

  const save = useMutation({
    mutationFn: () =>
      api("/api/hackathons/" + hackathonIdOrSlug, {
        method: "POST",
        body: JSON.stringify({
          roleSlug: roleSlug || undefined,
          motivation,
          hasIdea,
          ideaBlurb: hasIdea ? ideaBlurb : "",
        }),
      }),
    onSuccess: () => {
      toast.success("You're visible to teams for this event");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["hackathon-hub"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (motivation.trim().length > 0 && motivation.trim().length < 10) {
      toast.error("Give teams a bit more context (10+ chars), or leave motivation empty");
      return;
    }
    if (hasIdea && ideaBlurb.trim().length < 10) {
      toast.error("Describe the idea in at least 10 characters — that's the teaser");
      return;
    }
    save.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("font-medium", triggerClassName)}>
          <UserCheck className="h-4 w-4 mr-2" /> I&apos;m looking for a team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Looking for a team at {hackathonName}?</DialogTitle>
          <DialogDescription>
            Teams recruiting for this event will see you in the People tab — tell
            them what you want to do here. Your general profile stays untouched.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Role you want for this event</Label>
            <Select value={roleSlug || "__any"} onValueChange={(v) => setRoleSlug(v === "__any" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Open to anything</SelectItem>
                {ROLE_TAXONOMY.map((r) => (
                  <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Maybe you&apos;re usually frontend, but want to try ML this time. That&apos;s the point.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivation">Why this event? (optional)</Label>
            <Textarea
              id="motivation"
              rows={3}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="First offline hackathon, want to ship hardware. I've done two web projects before."
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                I&apos;m carrying an idea
              </span>
              <Switch checked={hasIdea} onCheckedChange={setHasIdea} />
            </label>
            {hasIdea && (
              <div className="space-y-1.5">
                <Label htmlFor="idea-blurb">Idea teaser (shown on the Ideas tab)</Label>
                <Textarea
                  id="idea-blurb"
                  rows={2}
                  value={ideaBlurb}
                  onChange={(e) => setIdeaBlurb(e.target.value)}
                  placeholder="AI campus navigation that works offline — looking for a backend + a designer."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending} className="font-semibold">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
              List me for this event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
