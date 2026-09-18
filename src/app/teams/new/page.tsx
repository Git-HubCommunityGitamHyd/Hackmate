"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Rocket, Lock, Lightbulb } from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/hooks/use-api";
import { ROLE_TAXONOMY, SKILLS, COMMITMENT_LEVELS, SKILL_CATEGORY_META } from "@/lib/constants";
import type { SkillCategory } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import type { TeamDetailDTO } from "@/lib/queries/types";

export default function NewTeamPage() {
  return (
    <Suspense>
      <NewTeamForm />
    </Suspense>
  );
}

function NewTeamForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselected = searchParams.get("hackathon");

  const hackathons = useQuery({
    queryKey: ["hackathons-create"],
    queryFn: () => api<{ id: string; name: string; teamSizeMin: number; teamSizeMax: number }[]>("/api/hackathons"),
    select: (list) => list.filter((h) => (h as any).status !== "completed"),
  });

  const [form, setForm] = useState({
    hackathonId: preselected ?? "",
    name: "",
    ideaTitle: "",
    ideaDomain: "",
    ideaDescription: "",
    ideaAnonymous: true,
    commitment: "serious",
    targetSize: 4,
    lookingForIdea: false,
  });
  const [roleSlugs, setRoleSlugs] = useState<string[]>([]);
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);

  /* Default-select the first hackathon once data arrives (render-time fallback). */
  const effectiveHackathonId =
    form.hackathonId || (hackathons.data && hackathons.data.length > 0 ? hackathons.data[0].id : "");

  const create = useMutation({
    mutationFn: () =>
      api<TeamDetailDTO>("/api/teams", {
        method: "POST",
        body: JSON.stringify({ ...form, hackathonId: effectiveHackathonId, roleSlugs, skillSlugs }),
      }),
    onSuccess: (team) => {
      toast.success("Team created! Your workspace is ready.");
      router.push("/my-team");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const skillsByCategory = useMemo(() => {
    const map = new Map<SkillCategory, typeof SKILLS>();
    for (const s of SKILLS) map.set(s.category, [...(map.get(s.category) ?? []), s]);
    return map;
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveHackathonId) return toast.error("Pick a hackathon");
    if (form.name.trim().length < 2) return toast.error("Team name is required");
    if (roleSlugs.length === 0) return toast.error("Pick at least one role you need — this powers your completeness meter");
    create.mutate();
  }

  return (
    <div className="pt-8 pb-4 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" /> Create a team
        </h1>
        <p className="text-muted-foreground mt-1 text-balance">
          Post your idea (anonymously if you want), declare the roles you need, and let the
          composition engine tell you what&apos;s missing.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Event & identity</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Hackathon</Label>
              <Select value={effectiveHackathonId} onValueChange={(v) => setForm({ ...form, hackathonId: v })}>
                <SelectTrigger><SelectValue placeholder="Pick an event" /></SelectTrigger>
                <SelectContent>
                  {(hackathons.data ?? []).map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Team Driftwave"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Team size target</Label>
              <Select value={String(form.targetSize)} onValueChange={(v) => setForm({ ...form, targetSize: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} people</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Commitment</Label>
              <Select value={form.commitment} onValueChange={(v) => setForm({ ...form, commitment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMITMENT_LEVELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label} — {c.hint}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> The idea
            </CardTitle>
            <CardDescription>
              Anonymous preview shows only the domain until someone joins or gets accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="idea-title">Idea title</Label>
                <Input
                  id="idea-title"
                  value={form.ideaTitle}
                  onChange={(e) => setForm({ ...form, ideaTitle: e.target.value })}
                  placeholder="Driftwave — campus event intelligence"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idea-domain">Domain (always visible)</Label>
                <Input
                  id="idea-domain"
                  value={form.ideaDomain}
                  onChange={(e) => setForm({ ...form, ideaDomain: e.target.value })}
                  placeholder="AI + Campus Tech"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idea-desc">Full description (members only)</Label>
              <Textarea
                id="idea-desc"
                rows={3}
                value={form.ideaDescription}
                onChange={(e) => setForm({ ...form, ideaDescription: e.target.value })}
                placeholder="What are you building? What does winning look like?"
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <Switch
                checked={form.ideaAnonymous}
                onCheckedChange={(v) => setForm({ ...form, ideaAnonymous: v })}
              />
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              Keep the idea anonymous until someone joins
            </label>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <Checkbox
                checked={form.lookingForIdea}
                onCheckedChange={(v) => setForm({ ...form, lookingForIdea: !!v })}
              />
              We have skills but no idea — open to people bringing theirs
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Roles you need</CardTitle>
            <CardDescription>Powers the Team Completeness Meter and gap analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ROLE_TAXONOMY.map((r) => {
                const sel = roleSlugs.includes(r.slug);
                return (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() =>
                      setRoleSlugs((prev) => (sel ? prev.filter((s) => s !== r.slug) : [...prev, r.slug]))
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                      sel
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-muted/40 border-border text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Specific skills wanted</CardTitle>
            <CardDescription>Optional — sharpens match scores for joiners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...skillsByCategory.entries()].map(([cat, list]) => (
              <div key={cat}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {SKILL_CATEGORY_META[cat].label}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((s) => {
                    const sel = skillSlugs.includes(s.slug);
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() =>
                          setSkillSlugs((prev) =>
                            sel ? prev.filter((x) => x !== s.slug) : [...prev, s.slug],
                          )
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
                          sel
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "bg-muted/40 border-border text-muted-foreground hover:border-primary/30",
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button asChild variant="outline" type="button">
            <Link href="/">Cancel</Link>
          </Button>
          <Button type="submit" disabled={create.isPending} className="font-semibold min-w-36">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
            Create team
          </Button>
        </div>
      </form>
    </div>
  );
}
