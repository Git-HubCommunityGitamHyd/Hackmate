"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  Users2,
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
      {/* Compact header: actions only — project details live on the login screen */}
      <section className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-extrabold tracking-tight">Discover</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {!isAuthenticated && (
              <Button asChild size="sm" className="font-semibold">
                <Link href="/login">
                  <UserPlus className="h-4 w-4 mr-1.5" /> Sign in
                </Link>
              </Button>
            )}
            {isAuthenticated && (
              <>
                <Button asChild size="sm" variant="outline" className="font-medium">
                  <Link href="/teams/new">
                    <Plus className="h-4 w-4 mr-1.5" /> Create a team
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="font-medium text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950">
                  <Link href="/emergency">
                    <ShieldAlert className="h-4 w-4 mr-1.5" /> Emergency
                  </Link>
                </Button>
              </>
            )}
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
              description={isSearching ? "Try different keywords, or clear the search to browse everything." : "Organizers haven't posted any events yet. Check back soon, or post one yourself if you're an admin."}
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
              description={isSearching ? "No teams match that search yet. Try posting your own idea and let people find you." : "No recruiting teams yet. Create the first one!"}
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
