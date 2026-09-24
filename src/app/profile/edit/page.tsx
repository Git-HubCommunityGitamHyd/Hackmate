"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { api, useMyProfile } from "@/hooks/use-api";
import {
  ROLE_TAXONOMY,
  SKILLS,
  COMMITMENT_LEVELS,
  EXPERIENCE_LEVELS,
  RECRUITMENT_STATUSES,
  SKILL_CATEGORY_META,
} from "@/lib/constants";
import type { SkillCategory } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface SkillSel {
  slug: string;
  level: number;
  isPrimary: boolean;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading } = useMyProfile();

  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    githubUsername: "",
    linkedinUrl: "",
    portfolioUrl: "",
    graduationYear: "",
    experienceLevel: "intermediate",
    commitment: "serious",
    recruitmentStatus: "looking",
  });
  const [skills, setSkills] = useState<SkillSel[]>([]);
  const [roles, setRoles] = useState<{ slug: string; isPrimary: boolean }[]>([]);
  const [avail, setAvail] = useState({
    weekends: true,
    evenings: true,
    overnight: false,
    remoteOnly: false,
    willingToTravel: true,
    hoursPerWeek: 20,
  });
  const [compat, setCompat] = useState({
    workStyle: "hybrid",
    comfortablePresenting: false,
    openToIdeaSwaps: true,
  });

  /* Hydrate the local editable state once the profile arrives.
     (Render-time "adjust state when props change" pattern — no effect needed.) */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (profile && loadedFor !== profile.id) {
    setLoadedFor(profile.id);
    setForm({
      name: profile.name ?? "",
      username: profile.username ?? "",
      bio: profile.bio ?? "",
      githubUsername: profile.githubUsername ?? "",
      linkedinUrl: profile.linkedinUrl ?? "",
      portfolioUrl: profile.portfolioUrl ?? "",
      graduationYear: profile.graduationYear ? String(profile.graduationYear) : "",
      experienceLevel: profile.experienceLevel ?? "intermediate",
      commitment: profile.commitment ?? "serious",
      recruitmentStatus: profile.recruitmentStatus ?? "looking",
    });
    setSkills(
      (profile.skills ?? []).map((s) => ({ slug: s.slug, level: s.level ?? 3, isPrimary: !!s.isPrimary })),
    );
    setRoles((profile.roles ?? []).map((r) => ({ slug: r.slug, isPrimary: !!r.isPrimary })));
    if (profile.availability) {
      setAvail((a) => ({
        ...a,
        weekends: profile.availability!.weekends,
        evenings: profile.availability!.evenings,
        overnight: profile.availability!.overnight,
        remoteOnly: profile.availability!.remoteOnly,
        willingToTravel: profile.availability!.willingToTravel,
        hoursPerWeek: profile.availability!.hoursPerWeek,
      }));
    }
    if (profile.compat?.workStyle) {
      setCompat({
        workStyle: profile.compat!.workStyle as any,
        comfortablePresenting: profile.compat!.comfortablePresenting,
        openToIdeaSwaps: profile.compat!.openToIdeaSwaps,
      });
    }
  }

  const save = useMutation({
    mutationFn: () =>
      api("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
          collegeId: null,
          skills,
          roles,
          availability: avail,
          compat,
        }),
      }),
    onSuccess: () => {
      toast.success("Profile saved — teams can find you now");
      router.push(profile ? `/profile/${profile.id}` : "/");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const skillsByCategory = useMemo(() => {
    const map = new Map<SkillCategory, typeof SKILLS>();
    for (const s of SKILLS) {
      map.set(s.category, [...(map.get(s.category) ?? []), s]);
    }
    return map;
  }, []);

  const selected = new Set(skills.map((s) => s.slug));

  function toggleSkill(slug: string) {
    setSkills((prev) =>
      prev.some((s) => s.slug === slug)
        ? prev.filter((s) => s.slug !== slug)
        : [...prev, { slug, level: 3, isPrimary: false }],
    );
  }

  function setLevel(slug: string, level: number) {
    setSkills((prev) => prev.map((s) => (s.slug === slug ? { ...s, level } : s)));
  }

  function toggleRole(slug: string) {
    setRoles((prev) => {
      const exists = prev.some((r) => r.slug === slug);
      if (exists) {
        const next = prev.filter((r) => r.slug !== slug);
        return next.some((r) => r.isPrimary) ? next : next.map((r, i) => ({ ...r, isPrimary: i === 0 }));
      }
      const next = [...prev, { slug, isPrimary: false }];
      return next.some((r) => r.isPrimary) ? next : next.map((r, i) => ({ ...r, isPrimary: i === 0 }));
    });
  }

  function setPrimaryRole(slug: string) {
    setRoles((prev) => prev.map((r) => ({ ...r, isPrimary: r.slug === slug })));
  }

  if (isLoading) {
    return (
      <div className="pt-8 space-y-6 max-w-3xl">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="pt-8 pb-4 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Edit profile</h1>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="font-semibold min-w-28">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </div>

      {/* Basics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">The basics</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={form.username} placeholder="lowercase, numbers, - _" onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} maxLength={600} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="What do you build? What are you hunting for?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="github">GitHub username</Label>
            <Input id="github" value={form.githubUsername} onChange={(e) => setForm({ ...form, githubUsername: e.target.value })} placeholder="auto-imported if you signed in with GitHub" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gradyear">Graduation year</Label>
            <Input id="gradyear" type="number" min={2000} max={2035} value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input id="linkedin" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portfolio">Portfolio URL</Label>
            <Input id="portfolio" value={form.portfolioUrl} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roles you fill</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ROLE_TAXONOMY.map((r) => {
              const sel = roles.some((x) => x.slug === r.slug);
              const isPrimary = roles.find((x) => x.slug === r.slug)?.isPrimary;
              return (
                <button
                  key={r.slug}
                  onClick={() => toggleRole(r.slug)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (sel) setPrimaryRole(r.slug);
                  }}
                  title={sel ? "Click to remove · right-click to make primary" : "Click to add"}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                    sel
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:border-primary/30",
                  )}
                >
                  {r.name}
                  {isPrimary && <span className="ml-1 text-[10px] uppercase tracking-wide">★ primary</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Click to toggle · right-click to mark your primary role. Your primary role weighs 10% in match scoring.
          </p>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Skills <span className="text-muted-foreground font-normal text-sm">({skills.length} selected)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {[...skillsByCategory.entries()].map(([cat, list]) => (
            <div key={cat}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {SKILL_CATEGORY_META[cat].label}
              </h4>
              <div className="flex flex-wrap gap-2">
                {list.map((s) => {
                  const sel = selected.has(s.slug);
                  const level = skills.find((x) => x.slug === s.slug)?.level;
                  return (
                    <div key={s.slug} className="relative">
                      <button
                        onClick={() => toggleSkill(s.slug)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                          sel
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "bg-muted/40 border-border text-muted-foreground hover:border-primary/30",
                        )}
                      >
                        {s.name}
                      </button>
                      {sel && (
                        <div className="flex items-center gap-1 mt-1 px-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => setLevel(s.slug, n)}
                              title={`Level ${n}/5`}
                              className={cn(
                                "h-1.5 w-4 rounded-full transition-colors",
                                n <= (level ?? 3) ? "bg-primary" : "bg-muted",
                              )}
                            />
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-0.5">{level}/5</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Availability + commitment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Availability & commitment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Experience</Label>
              <Select value={form.experienceLevel} onValueChange={(v) => setForm({ ...form, experienceLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label} — {e.hint}</SelectItem>
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
            <div className="space-y-1.5">
              <Label>Recruitment status</Label>
              <Select value={form.recruitmentStatus} onValueChange={(v) => setForm({ ...form, recruitmentStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECRUITMENT_STATUSES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <Label>Hours you can put in per week</Label>
              <span className="font-bold">{avail.hoursPerWeek}h</span>
            </div>
            <Slider
              value={[avail.hoursPerWeek]}
              min={2}
              max={60}
              step={1}
              onValueChange={([v]) => setAvail({ ...avail, hoursPerWeek: v })}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ["weekends", "Weekends"],
              ["evenings", "Evenings"],
              ["overnight", "Overnight sprints"],
              ["willingToTravel", "Willing to travel to venue"],
              ["remoteOnly", "Remote only"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 text-sm cursor-pointer">
                <Checkbox
                  checked={(avail as any)[key]}
                  onCheckedChange={(v) => setAvail({ ...avail, [key]: !!v })}
                />
                {label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compatibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Dices className="h-4 w-4 text-primary" /> Working style
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Plan first or build first?</Label>
            <Select value={compat.workStyle} onValueChange={(v) => setCompat({ ...compat, workStyle: v })}>
              <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plan_first">Plan first — scope before code</SelectItem>
                <SelectItem value="build_first">Build first — prototype to think</SelectItem>
                <SelectItem value="hybrid">Hybrid — depends on the idea</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <Checkbox
                checked={compat.comfortablePresenting}
                onCheckedChange={(v) => setCompat({ ...compat, comfortablePresenting: !!v })}
              />
              Comfortable presenting / pitching to judges
            </label>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <Checkbox
                checked={compat.openToIdeaSwaps}
                onCheckedChange={(v) => setCompat({ ...compat, openToIdeaSwaps: !!v })}
              />
              Open to joining a team with a different idea
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="font-semibold min-w-32">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
