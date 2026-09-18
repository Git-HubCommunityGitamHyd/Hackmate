"use client";

import { use } from "react";
import Link from "next/link";
import {
  Github,
  Linkedin,
  Globe,
  MapPin,
  Clock,
  Trophy,
  Medal,
  Award,
  CheckCircle2,
  Hammer,
  Users,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  SkillBadge,
  RecruitmentBadge,
  CommitmentBadge,
  ExperienceBadge,
  EmergencyBadge,
} from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { useProfile } from "@/hooks/use-api";
import { COMMITMENT_LEVELS, EXPERIENCE_LEVELS } from "@/lib/constants";

const BADGE_ICONS: Record<string, typeof Trophy> = {
  "completed-hackathon": CheckCircle2,
  "built-project": Hammer,
  finalist: Medal,
  winner: Trophy,
  "worked-together": Users,
};

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: profile, isLoading, error } = useProfile(id);

  if (isLoading) {
    return (
      <div className="pt-8 space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="pt-16">
        <EmptyState
          icon={Users}
          title="Profile not found"
          description="This student may have deleted their account."
          action={<Button asChild><Link href="/">Back to Discover</Link></Button>}
        />
      </div>
    );
  }

  const commitmentMeta = COMMITMENT_LEVELS.find((c) => c.value === profile.commitment);
  const expMeta = EXPERIENCE_LEVELS.find((e) => e.value === profile.experienceLevel);

  return (
    <div className="pt-8 pb-4">
      {/* Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-5">
            <UserAvatar name={profile.name} image={profile.image} emergency={profile.emergencyAvailable} className="h-20 w-20" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-extrabold tracking-tight">{profile.name}</h1>
                {profile.emergencyAvailable && <EmergencyBadge />}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground mt-1">
                {profile.collegeName && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.collegeName}</span>
                )}
                {profile.graduationYear && <span>Class of {profile.graduationYear}</span>}
                {profile.hoursPerWeek && (
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{profile.hoursPerWeek}h/week</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-3">
                <RecruitmentBadge status={profile.recruitmentStatus} />
                <CommitmentBadge commitment={profile.commitment} />
                <ExperienceBadge level={profile.experienceLevel} />
                {expMeta && <span className="text-xs text-muted-foreground">{expMeta.hint}</span>}
              </div>

              {profile.bio && <p className="text-sm mt-3 max-w-2xl leading-relaxed">{profile.bio}</p>}

              <div className="flex gap-2 mt-4 flex-wrap">
                {profile.githubUsername && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-1.5" /> {profile.githubUsername}
                    </a>
                  </Button>
                )}
                {profile.linkedinUrl && (
                  <Button asChild size="sm" variant="outline">
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4 mr-1.5" /> LinkedIn
                    </a>
                  </Button>
                )}
                {profile.portfolioUrl && (
                  <Button asChild size="sm" variant="outline">
                    <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-1.5" /> Portfolio
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Skills */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {profile.skills.length === 0 && (
                <p className="text-sm text-muted-foreground">No skills listed yet.</p>
              )}
              {profile.skills
                .slice()
                .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
                .map((s) => (
                  <SkillBadge key={s.slug} name={s.name} category={s.category} level={s.level} />
                ))}
            </CardContent>
          </Card>

          {/* GitHub verified */}
          {profile.githubData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Github className="h-4 w-4" /> GitHub — verified at sign-in
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-extrabold">{profile.githubData.publicRepos}</div>
                    <div className="text-xs text-muted-foreground">public repos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold">{profile.githubData.totalStars}★</div>
                    <div className="text-xs text-muted-foreground">stars earned</div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold">
                      {profile.githubData.activeThisYear ? "yes" : "no"}
                    </div>
                    <div className="text-xs text-muted-foreground">active this year</div>
                  </div>
                </div>
                {profile.githubData.topLanguages.length > 0 && (
                  <div className="space-y-2">
                    {profile.githubData.topLanguages.map((l) => (
                      <div key={l.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{l.name}</span>
                          <span className="text-muted-foreground">{l.percentage}%</span>
                        </div>
                        <Progress value={l.percentage} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hackathon history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Hackathon history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hackathons recorded yet — the résumé starts at the first submission.</p>
              ) : (
                profile.history.map((h, i) => (
                  <div key={i}>
                    {i > 0 && <Separator className="mb-4" />}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{h.hackathonName}</div>
                        <div className="text-sm text-muted-foreground">{h.projectName}</div>
                        {h.teammates.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            with {h.teammates.join(", ")}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {h.technologies.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {h.placement && (
                          <Badge className="gap-1 font-semibold">
                            <Medal className="h-3 w-3" /> #{h.placement}
                          </Badge>
                        )}
                        {h.repoUrl && (
                          <a
                            href={h.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-muted-foreground hover:text-primary mt-1 inline-flex items-center gap-0.5"
                          >
                            repo <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Badges */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.badges.length === 0 ? (
                <p className="text-sm text-muted-foreground">Badges appear after hackathons — Completed, Finalist, Winner, Worked Together.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {profile.badges.map((b, i) => {
                    const Icon = BADGE_ICONS[b.slug] ?? Award;
                    return (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30">
                        <Icon className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{b.name}</div>
                          {b.hackathonName && (
                            <div className="text-[10px] text-muted-foreground truncate">{b.hackathonName}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Availability */}
          {profile.availability && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {[
                  ["Weekends", profile.availability.weekends],
                  ["Evenings", profile.availability.evenings],
                  ["Overnight sprints", profile.availability.overnight],
                  ["Willing to travel", profile.availability.willingToTravel],
                  ["Remote only", profile.availability.remoteOnly],
                ].map(([label, yes]) => (
                  <div key={label as string} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${yes ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                    <span className={yes ? "" : "text-muted-foreground/70 line-through"}>{label}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hours / week</span>
                  <span className="font-semibold">{profile.availability.hoursPerWeek}h</span>
                </div>
                {profile.compat && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Work style</span>
                      <span className="font-semibold capitalize">{(profile.compat.workStyle ?? "—").replace("_", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comfortable presenting</span>
                      <span className="font-semibold">{profile.compat.comfortablePresenting ? "yes" : "no"}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Previous teammates graph */}
          {profile.previousTeammates.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Hacked together with
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.previousTeammates.map((t) => (
                  <Link
                    key={t.id}
                    href={`/profile/${t.id}`}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <UserAvatar name={t.name} image={t.image} className="h-8 w-8" />
                    <span className="text-sm font-medium flex-1 truncate">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">×{t.count}</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Roles */}
          {profile.roles.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Roles</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {profile.roles.map((r) => (
                  <Badge key={r.slug} variant={r.isPrimary ? "default" : "outline"} className="text-xs">
                    {r.name}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
