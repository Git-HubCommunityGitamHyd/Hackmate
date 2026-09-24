"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CheckSquare, Square, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "registration", label: "Registration" },
  { value: "ppt", label: "PPT / Deck" },
  { value: "repo", label: "GitHub repo" },
  { value: "prototype", label: "Prototype" },
  { value: "video", label: "Demo video" },
  { value: "submission", label: "Submission" },
  { value: "pitch", label: "Pitch" },
  { value: "other", label: "Other" },
];

interface TaskDTO {
  id: string;
  title: string;
  category: string;
  done: boolean;
  dueDate: string | null;
  assigneeName: string | null;
}

export function TaskChecklist({ teamId, tasks }: { teamId: string; tasks: TaskDTO[] }) {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("other");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["team", teamId] });
  };

  const toggle = useMutation({
    mutationFn: ({ taskId, done }: { taskId: string; done: boolean }) =>
      api(`/api/teams/${teamId}/tasks`, { method: "PATCH", body: JSON.stringify({ taskId, done }) }),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  const add = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/teams/${teamId}/tasks`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setNewTitle("");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" /> Submission checklist
          </span>
          <span className="text-sm font-bold tabular-nums">
            {done}/{tasks.length} · {pct}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="max-h-64 overflow-y-auto scrollbar-slim space-y-1 pr-1">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle.mutate({ taskId: t.id, done: !t.done })}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 text-left transition-colors"
              aria-label={`${t.done ? "Mark undone" : "Mark done"}: ${t.title}`}
            >
              {t.done ? (
                <CheckSquare className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <span className={cn("text-sm block", t.done && "line-through text-muted-foreground")}>
                  {t.title}
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] py-0">{t.category}</Badge>
                  {t.dueDate && (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  {t.assigneeName && (
                    <span className="text-[10px] text-muted-foreground">→ {t.assigneeName}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim().length >= 2) {
                add.mutate({ title: newTitle.trim(), category: newCategory });
              }
            }}
            placeholder="Add checklist item…"
            className="text-sm"
            aria-label="New task title"
          />
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="w-[130px]" aria-label="Task category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="outline"
            disabled={newTitle.trim().length < 2 || add.isPending}
            onClick={() => add.mutate({ title: newTitle.trim(), category: newCategory })}
            aria-label="Add task"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
