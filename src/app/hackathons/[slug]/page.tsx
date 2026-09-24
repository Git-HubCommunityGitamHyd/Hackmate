"use client";

import { use } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Trophy,
  Users2,
  Compass,
  Lightbulb,
  ExternalLink,
  TrendingUp,
  Plus,
  UserCheck,
} from "lucide-react";
import { PersonCard } from "@/components/discover/person-card";
import { TeamCard } from "@/components/discover/team-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useHackathonHub, useCurrentUser } from "@/hooks/use-api";

export default function HackathonHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading, error } = useHackathonHub(slug);
  const { isAuthenticated } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="pt-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="pt-16">
        <EmptyState
          icon={Trophy}
          title="Hackathon not found"
          description="This event may have been removed. Browse Discover for upcoming hackathons."
          action={
            <Button asChild>
              <Link href="/">Back to Discover</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { hackathon, peopleLooking, teamsRecruiting, roleDemand, myTeam } = data;
  const regDays = hackathon.registrationDeadline
    ? Math.ceil((new Date(hackathon.registrationDeadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="pt-8 pb-4 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> All hackathons
          </Link>
        </Button>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="font-semibold">{hackathon.status}</Badge>
              <Badge variant="outline">{hackathon.mode}</Badge>
              {regDays !== null && regDays > 0 && (
                <Badge variant="destructive" className="font-semibold">registration closes in {regDays}d</Badge>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-balance">{hackathon.name}</h1>
            {hackathon.tagline && <p className="text-muted-foreground mt-2 text-lg text-balance">{hackathon.tagline}</p>}
            {hackathon.description && (
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl leading-relaxed">{hackathon.description}</p>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(hackathon.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                {" – "}
                {new Date(hackathon.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users2 className="h-4 w-4" /> teams of {hackathon.teamSizeMin}–{hackathon.teamSizeMax}
              </span>
              {hackathon.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {hackathon.location}
                </span>
              )}
              {hackathon.prizePool && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <Trophy className="h-4 w-4 text-primary" /> {hackathon.prizePool}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {hackathon.themes.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              {isAuthenticated && (
                <>
                  {myTeam ? (
                    <Button asChild className="font-semibold">
                      <Link href="/my-team">
                        <Users2 className="h-4 w-4 mr-2" /> Open my team: {myTeam.name}
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild className="font-semibold">
                        <Link href={`/teams/new?hackathon=${hackathon.id}`}>
                          <Plus className="h-4 w-4 mr-2" /> Create a team for this event
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="font-medium"
                        onClick={() =>
                          fetch(`/api/hackathons/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
                            .then((r) => (r.ok ? import("sonner").then((m) => m.toast.success("You're now visible to teams for this event")) : null))
                            .catch(() => {})
                        }
                      >
                        <UserCheck className="h-4 w-4 mr-2" /> I&apos;m looking for a team
                      </Button>
                    </>
                  )}
                </>
              )}
              {hackathon.websiteUrl && (
                <Button asChild variant="outline">
                  <a href={hackathon.websiteUrl} target="_blank" rel="noopener noreferrer">
                    Event website <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {roleDemand.length > 0 && (
            <Card className="lg:w-72 h-fit bg-muted/30">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" /> Roles in demand
                </h3>
                <div className="space-y-2">
                  {roleDemand.slice(0, 6).map((r) => (
                    <div key={r.role} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.role}</span>
                      <Badge variant="outline" className="text-xs">{r.count} team{r.count > 1 ? "s" : ""}</Badge>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  Gap analysis across all recruiting teams at this event. Fill a gap, get matched faster.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Tabs defaultValue="teams">
        <TabsList className="h-11 bg-muted">
          <TabsTrigger value="teams" className="gap-1.5 px-4 data-[state=active]:bg-background">
            <Users2 className="h-4 w-4" /> Teams recruiting
            <span className="text-xs text-muted-foreground ml-1">{teamsRecruiting.length}</span>
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-1.5 px-4 data-[state=active]:bg-background">
            <Compass className="h-4 w-4" /> People looking
            <span className="text-xs text-muted-foreground ml-1">{peopleLooking.length}</span>
          </TabsTrigger>
          <TabsTrigger value="ideas" className="gap-1.5 px-4 data-[state=active]:bg-background">
            <Lightbulb className="h-4 w-4" /> Ideas floating
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-5">
          {teamsRecruiting.length === 0 ? (
            <EmptyState
              icon={Users2}
              title="No teams recruiting yet"
              description="Be the first — post your idea and let compatible people find you."
              action={isAuthenticated ? (
                <Button asChild>
                  <Link href={`/teams/new?hackathon=${hackathon.id}`}>Create a team</Link>
                </Button>
              ) : undefined}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teamsRecruiting.map((t) => (
                <TeamCard key={t.id} team={t} showMatch={isAuthenticated} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-5">
          {peopleLooking.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="Nobody's listed yet"
              description="Students marked 'looking for a team' for this event appear here."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {peopleLooking.map((p) => (
                <PersonCard key={p.id} person={p} showMatch={isAuthenticated} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ideas" className="mt-5">
          <div className="grid gap-4 md:grid-cols-2">
            {peopleLooking
              .filter((p) => (p as any).ideaBlurb)
              .map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Compass className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{p.name} is carrying an idea</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{(p as any).ideaBlurb}</p>
                  </CardContent>
                </Card>
              ))}
            {teamsRecruiting
              .filter((t) => t.lookingForIdea)
              .map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold">{t.name} has skills, wants an idea</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Team of {t.memberCount} with {t.memberNames.slice(0, 3).join(", ")} — bring your idea to them.
                    </p>
                  </CardContent>
                </Card>
              ))}
            {peopleLooking.filter((p) => (p as any).ideaBlurb).length === 0 &&
              teamsRecruiting.filter((t) => t.lookingForIdea).length === 0 && (
                <EmptyState
                  icon={Lightbulb}
                  title="No open ideas posted"
                  description="Post an idea when creating a team (or mark 'looking for idea') and it shows up here."
                />
              )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
