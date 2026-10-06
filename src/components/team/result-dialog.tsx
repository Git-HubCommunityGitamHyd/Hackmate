"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trophy, PartyPopper } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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

const PLACEMENTS: { value: string; label: string; numeric: number | null }[] = [
  { value: "none", label: "Participated · no placement", numeric: null },
  { value: "1", label: "1st · Winner", numeric: 1 },
  { value: "2", label: "2nd place", numeric: 2 },
  { value: "3", label: "3rd place", numeric: 3 },
  { value: "5", label: "Top 5", numeric: 5 },
  { value: "10", label: "Top 10", numeric: 10 },
  { value: "20", label: "Top 20", numeric: 20 },
];

/**
 * Record what the team shipped - the post-hackathon write path.
 * One submission writes result rows, attendance, badges and karma for
 * every member (see POST /api/teams/:id/result).
 */
export function ResultDialog({
  teamId,
  teamName,
  hackathonName,
  triggerClassName,
}: {
  teamId: string;
  teamName: string;
  hackathonName: string | null;
  triggerClassName?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [devpostUrl, setDevpostUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [placement, setPlacement] = useState("none");
  const [technologies, setTechnologies] = useState("");

  const record = useMutation({
    mutationFn: () => {
      const numeric = PLACEMENTS.find((p) => p.value === placement)?.numeric ?? null;
      return api<{ recorded: number; badgesAwarded: number }>(`/api/teams/${teamId}/result`, {
        method: "POST",
        body: JSON.stringify({
          projectName: projectName.trim(),
          projectUrl: projectUrl.trim(),
          devpostUrl: devpostUrl.trim(),
          repoUrl: repoUrl.trim(),
          placement: numeric,
          technologies: technologies
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 12),
        }),
      });
    },
    onSuccess: (data) => {
      toast.success(
        `Result recorded: ${data.recorded} teammates got history, ${data.badgesAwarded} badges awarded`,
        { icon: <PartyPopper className="h-4 w-4 text-primary" /> },
      );
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["my-team"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (projectName.trim().length < 2) return toast.error("What did you call the project?");
    record.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("font-semibold", triggerClassName)}>
          <Trophy className="h-4 w-4 mr-2 text-amber-500" /> Record result
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>What did {teamName} ship?</DialogTitle>
          <DialogDescription>
            {hackathonName ? `Closing out ${hackathonName}. ` : ""}This writes everyone&apos;s
            hackathon history, marks attendance, awards badges (Completed, Built Project,
            Finalist, Winner, Worked Together) and updates karma. One shot, make it count.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Driftwave"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Placement</Label>
              <Select value={placement} onValueChange={setPlacement}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLACEMENTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="repo-url">GitHub repo (optional)</Label>
              <Input
                id="repo-url"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/team/driftwave"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-url">Live demo / Devpost (optional)</Label>
              <Input
                id="project-url"
                type="url"
                value={projectUrl || devpostUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.includes("devpost.com")) {
                    setDevpostUrl(v);
                    setProjectUrl("");
                  } else {
                    setProjectUrl(v);
                    setDevpostUrl("");
                  }
                }}
                placeholder="https://devpost.com/software/driftwave"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tech">Technologies (comma-separated)</Label>
            <Input
              id="tech"
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
              placeholder="Next.js, Postgres, TensorFlow, Figma"
            />
            <p className="text-xs text-muted-foreground">
              Ships a link? Everyone also earns the Built Project badge.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={record.isPending} className="font-semibold">
              {record.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trophy className="h-4 w-4 mr-2" />}
              Record for the whole team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
