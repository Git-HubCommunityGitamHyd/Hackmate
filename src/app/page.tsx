"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  Users2,
  Sparkles,
  Radar,
  UserPlus,
  Plus,
  ShieldAlert,
  Compass,
} from "lucide-react";
import { SearchBar } from "@/components/discover/search-bar";
import { HackathonCard } from "@/components/discover/hackathon-card";
import { TeamCard } from "@/components/discover/team-card";
import { PersonCard } from "@/components/discover/person-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentUser, useHackathons, useTeams, usePeople, useSearch } from "@/hooks/use-api";

export default function DiscoverPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [tab, setTab] = useState("hackathons");

  const isSearching = submittedQuery.trim().length >= 2;
  const search = useSearch(isSearching ? submittedQuery : "");
  const hackathons = useHackathons();
  const teams = useTeams();
  const people = usePeople();

  const parsed = search.data?.parsed ?? null;

  /* When the parser detects intent, auto-switch to the most relevant tab. */
  const effectiveTab = useMemo(() => {
    if (!parsed || parsed.intent === "any") return tab;
    if (parsed.intent === "people") return "people";
    if (parsed.intent === "teams") return "teams";
    return tab;
  }, [parsed, tab]);

  const hackathonList = isSearching ? (search.data?.hackathons ?? []) : (hackathons.data ?? []);
  const teamList = isSearching ? (search.data?.teams ?? []) : (teams.data ?? []);
  const peopleList = isSearching ? (search.data?.people ?? []) : (people.data ?? []);
  const loading = isSearching ? search.isLoading : hackathons.isLoading || teams.isLoading || people.isLoading;

  return (
    <div className="pt-8 pb-4">
      {/* Hero */}
      <section className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
          <div className="flex-1">
            <p className="label-harsh mb-3">Hackathon team finder</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-balance">
              Find your people.{" "}
              <span className="text-primary">Win your hackathon.</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-balance">
              HackMate matches teams by skills, idea, commitment and working style — and tells you
              what your team is <em>missing</em> before it&apos;s too late.
            </p>
            {!isAuthenticated && (
              <div className="flex items-center gap-3 mt-5">
                <Button asChild size="lg" className="font-semibold">
                  <Link href="/login">
                    <UserPlus className="h-4 w-4 mr-2" /> Join with GitHub or email
                  </Link>
                </Button>
                <span className="text-xs text-muted-foreground">Free forever · built by students</span>
              </div>
            )}
            {isAuthenticated && (
              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <Button asChild variant="outline" className="font-medium">
                  <Link href="/teams/new">
                    <Plus className="h-4 w-4 mr-2" /> Create a team
                  </Link>
                </Button>
                <Button asChild variant="outline" className="font-medium text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950">
                  <Link href="/emergency">
                    <ShieldAlert className="h-4 w-4 mr-2" /> Emergency teammate mode
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div className="fluted-panel lg:w-80">
            <div className="p-4 flex items-start gap-3 relative z-10">
              <Radar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="label-harsh text-primary/90">Team Composition Intelligence</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  &ldquo;Your team has strong ML and frontend coverage. You have no member with
                  backend/cloud experience.&rdquo; — not just a % match.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="mb-6" aria-label="Search">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={(v) => setSubmittedQuery(v.trim())}
          loading={isSearching ? search.isFetching : false}
          parsed={parsed ?? undefined}
        />
      </section>

      {/* Tabs */}
      <Tabs value={effectiveTab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="h-11 bg-muted">
            <TabsTrigger value="hackathons" className="gap-1.5 px-4 data-[state=active]:bg-background">
              <Trophy className="h-4 w-4" /> Hackathons
              <span className="text-xs text-muted-foreground ml-1">{hackathonList.length}</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1.5 px-4 data-[state=active]:bg-background">
              <Users2 className="h-4 w-4" /> Teams
              <span className="text-xs text-muted-foreground ml-1">{teamList.length}</span>
            </TabsTrigger>
            <TabsTrigger value="people" className="gap-1.5 px-4 data-[state=active]:bg-background">
              <Compass className="h-4 w-4" /> People
              <span className="text-xs text-muted-foreground ml-1">{peopleList.length}</span>
            </TabsTrigger>
          </TabsList>
          {isSearching && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubmittedQuery("");
                setQuery("");
              }}
              className="text-xs text-muted-foreground"
            >
              Clear search results
            </Button>
          )}
        </div>

        <TabsContent value="hackathons" className="mt-5">
          {loading ? (
            <SkeletonList />
          ) : hackathonList.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No hackathons found"
              description={isSearching ? "Try different keywords — or clear the search to browse everything." : "Organizers haven't posted any events yet. Check back soon — or post one yourself if you're an admin."}
              action={
                !isSearching && user?.role === "admin" ? (
                  <Button asChild variant="outline">
                    <Link href="/hackathons/new">
                      <Plus className="h-4 w-4 mr-2" /> Post a hackathon
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {hackathonList.map((h) => (
                <HackathonCard key={h.id} hackathon={h} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-5">
          {loading ? (
            <SkeletonList />
          ) : teamList.length === 0 ? (
            <EmptyState
              icon={Users2}
              title="No teams found"
              description={isSearching ? "No teams match that search yet. Try posting your own idea and let people find you." : "No recruiting teams yet — create the first one!"}
              action={
                !isSearching && isAuthenticated ? (
                  <Button asChild>
                    <Link href="/teams/new">
                      <Plus className="h-4 w-4 mr-2" /> Create a team
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teamList.map((t) => (
                <TeamCard key={t.id} team={t} showMatch={isAuthenticated && !isSearching} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-5">
          {loading ? (
            <SkeletonList />
          ) : peopleList.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No people found"
              description={isSearching ? "Nobody matches those skills yet. Save this search and check back." : "Students will show up here as they join."}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {peopleList.map((p) => (
                <PersonCard key={p.id} person={p} showMatch={isAuthenticated && !isSearching} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* How matching works */}
      {!isSearching && (
        <section className="mt-12 border-t pt-8">
          <h2 className="label-harsh mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> How HackMate matches you
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Skill overlap", weight: "40%", hint: "What you know vs what they need" },
              { label: "Availability", weight: "20%", hint: "Hours and time windows line up" },
              { label: "Commitment", weight: "15%", hint: "Casual to win-at-all-costs" },
              { label: "Experience delta", weight: "15%", hint: "Neither carrying nor carried" },
              { label: "Role fit", weight: "10%", hint: "Fills an open role, not a duplicate" },
            ].map((w) => (
              <Card key={w.label} className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <div className="text-2xl font-extrabold text-primary">{w.weight}</div>
                  <div className="text-sm font-semibold mt-1">{w.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{w.hint}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 max-w-2xl">
            Deterministic scoring — SQL prefilter + TypeScript weighted ranking over ~50 candidates.
            No black box: every match card shows the exact reasons. Emergency-available students
            are boosted and shown with a red pulse.
          </p>
        </section>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <Skeleton className="h-5 w-2/3 mb-3" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-14" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
