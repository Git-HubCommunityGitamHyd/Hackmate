"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const THEME_SUGGESTIONS = [
  "AI/ML",
  "FinTech",
  "HealthTech",
  "EdTech",
  "Sustainability",
  "Web3",
  "IoT",
  "Cybersecurity",
  "Open Innovation",
  "DevTools",
  "Indic Languages",
  "Agriculture",
];

export interface HackathonFormValues {
  id?: string;
  slug?: string;
  name: string;
  tagline: string;
  description: string;
  organizer: string;
  startsAt?: string | null;
  endsAt?: string | null;
  registrationDeadline?: string | null;
  teamSizeMin: number;
  teamSizeMax: number;
  prizePool: string;
  mode: string;
  location: string;
  websiteUrl: string;
  themes: string[];
}

/** datetime-local value from an ISO string (empty when null). */
function isoToLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Create/edit hackathon form — admin only (the pages that render this gate
 * access server-side; the API re-checks the role).
 */
export function HackathonForm({ initial }: { initial?: Partial<HackathonFormValues> }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    tagline: initial?.tagline ?? "",
    description: initial?.description ?? "",
    organizer: initial?.organizer ?? "",
    startsAt: isoToLocal(initial?.startsAt),
    endsAt: isoToLocal(initial?.endsAt),
    registrationDeadline: isoToLocal(initial?.registrationDeadline),
    teamSizeMin: initial?.teamSizeMin ?? 2,
    teamSizeMax: initial?.teamSizeMax ?? 4,
    prizePool: initial?.prizePool ?? "",
    mode: initial?.mode ?? "online",
    location: initial?.location ?? "",
    websiteUrl: initial?.websiteUrl ?? "",
  });
  const [themes, setThemes] = useState<string[]>(initial?.themes ?? []);

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, themes };
      return api<{ id: string; slug: string }>(
        isEdit ? `/api/hackathons/${initial!.id}` : "/api/hackathons",
        {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: (h) => {
      toast.success(isEdit ? "Hackathon updated" : "Hackathon posted!");
      router.push(`/hackathons/${h.slug}`);
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.startsAt || !form.endsAt) {
      toast.error("Name, start and end dates are required");
      return;
    }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      toast.error("End date must be after the start date");
      return;
    }
    save.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Event details</CardTitle>
          <CardDescription>Dates in your local timezone.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="h-name">Name</Label>
            <Input id="h-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="HackVerse 2026" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="h-tagline">Tagline</Label>
            <Input id="h-tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="36 hours of build" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="h-desc">Description</Label>
            <Textarea id="h-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-start">Starts</Label>
            <Input id="h-start" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-end">Ends</Label>
            <Input id="h-end" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-reg">Registration deadline</Label>
            <Input id="h-reg" type="datetime-local" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-org">Organizer</Label>
            <Input id="h-org" value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} placeholder="Olympus Coding Club" />
          </div>
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-loc">Location</Label>
            <Input id="h-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Bengaluru / Online" />
          </div>
          <div className="space-y-1.5">
            <Label>Team size</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number" min={1} max={10}
                value={form.teamSizeMin}
                onChange={(e) => setForm({ ...form, teamSizeMin: Number(e.target.value) })}
                className="w-20"
                aria-label="Minimum team size"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number" min={1} max={10}
                value={form.teamSizeMax}
                onChange={(e) => setForm({ ...form, teamSizeMax: Number(e.target.value) })}
                className="w-20"
                aria-label="Maximum team size"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-prize">Prize</Label>
            <Input
              id="h-prize"
              value={form.prizePool}
              onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
              placeholder="₹1,00,000 pool · internship offers · goodies"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Free text — prizes aren&apos;t always money. Internships, goodies, credits all welcome.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="h-url">Website URL</Label>
            <Input id="h-url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Themes</CardTitle>
          <CardDescription>Tap to toggle, or type your own below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {THEME_SUGGESTIONS.map((t) => {
              const sel = themes.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setThemes((prev) => (sel ? prev.filter((x) => x !== t) : [...prev, t]))}
                  className={cn(
                    "px-3 py-1.5 border text-sm font-medium transition-all",
                    sel
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:border-primary/30",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <Input
            placeholder="Add custom theme + press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value.trim();
                if (v && !themes.includes(v) && themes.length < 8) setThemes((p) => [...p, v]);
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
          {themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {themes.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                  <button
                    type="button"
                    onClick={() => setThemes((p) => p.filter((x) => x !== t))}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${t}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button asChild variant="outline" type="button">
          <Link href={isEdit ? `/hackathons/${initial?.slug ?? initial?.id}` : "/"}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={save.isPending} className="font-semibold min-w-36">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trophy className="h-4 w-4 mr-2" />}
          {isEdit ? "Save changes" : "Post hackathon"}
        </Button>
      </div>
    </form>
  );
}
