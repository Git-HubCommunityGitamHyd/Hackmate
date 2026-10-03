"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { KineticTextReveal } from "@/components/ui/kinetic-text-reveal";
import { SortMenu, type SortOption } from "@/components/discover/sort-menu";
import type { HackathonCardDTO, TeamCardDTO, PersonCardDTO } from "@/lib/queries/types";

const DISCOVER_TABS = ["hackathons", "teams", "people"] as const;
type DiscoverTab = (typeof DISCOVER_TABS)[number];

/* ------------------------------------------------------------------ */
/* Sorting — one debossed sort control per tab, the same pill on the */
/* Emergency page. Each tab owns its keys + comparators.              */
/* ------------------------------------------------------------------ */

type HackathonSort = "starting-soon" | "prize" | "activity";
type TeamSort = "completeness" | "match" | "spots" | "newest";
type PeopleSort = "match" | "active" | "emergency" | "name";

const HACKATHON_SORTS: ReadonlyArray<SortOption<HackathonSort>> = [
  { value: "starting-soon", label: "Starting soon" },
  { value: "prize", label: "Biggest prize" },
  { value: "activity", label: "Most teams forming" },
];
const TEAM_SORTS: ReadonlyArray<SortOption<TeamSort>> = [
  { value: "completeness", label: "Most complete" },
  { value: "match", label: "Best match for me" },
  { value: "spots", label: "Most open spots" },
  { value: "newest", label: "Newest" },
];
const PEOPLE_SORTS: ReadonlyArray<SortOption<PeopleSort>> = [
  { value: "match", label: "Best match for me" },
  { value: "active", label: "Most available" },
  { value: "emergency", label: "Emergency first" },
  { value: "name", label: "A–Z" },
];

/* "$25,000" / "₹1L" / "25000" → a comparable number. */
function parsePrize(pool: string | null): number {
  const n = Number((pool ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sortHackathons(list: HackathonCardDTO[], sort: HackathonSort): HackathonCardDTO[] {
  const out = [...list];
  if (sort === "prize") {
    out.sort((a, b) => parsePrize(b.prizePool) - parsePrize(a.prizePool));
  } else if (sort === "activity") {
    out.sort(
      (a, b) =>
        b.recruitingTeamCount + b.peopleLookingCount - (a.recruitingTeamCount + a.peopleLookingCount),
    );
  } else {
    /* Starting soon: live first (ending soonest), then upcoming
       (starting soonest), then completed (most recent first). */
    const rank = (s: HackathonCardDTO["status"]) => (s === "ongoing" ? 0 : s === "upcoming" ? 1 : 2);
    out.sort(
      (a, b) =>
        rank(a.status) - rank(b.status) ||
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }
  return out;
}

function sortTeams(list: TeamCardDTO[], sort: TeamSort): TeamCardDTO[] {
  const out = [...list];
  if (sort === "match") {
    out.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
  } else if (sort === "spots") {
    out.sort((a, b) => b.targetSize - b.memberCount - (a.targetSize - a.memberCount));
  } else if (sort === "newest") {
    out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    out.sort((a, b) => b.completeness - a.completeness);
  }
  return out;
}

function sortPeople(list: PersonCardDTO[], sort: PeopleSort): PersonCardDTO[] {
  const out = [...list];
  if (sort === "active") {
    out.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);
  } else if (sort === "emergency") {
    out.sort((a, b) => Number(b.emergencyAvailable) - Number(a.emergencyAvailable) || b.hoursPerWeek - a.hoursPerWeek);
  } else if (sort === "name") {
    out.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    out.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
  }
  return out;
}

function isDiscoverTab(value: string | null): value is DiscoverTab {
  return (DISCOVER_TABS as readonly string[]).includes(value ?? "");
}

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverContent />
    </Suspense>
  );
}

function DiscoverContent() {
  const { user, isAuthenticated } = useCurrentUser();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [tab, setTab] = useState<DiscoverTab>("hackathons");

  /* Per-tab sort — each tab remembers its own key. "Best match" leads
     for signed-in users (the matching engine fills matchScore); guests
     fall back to availability without changing the key. */
  const [hackathonSort, setHackathonSort] = useState<HackathonSort>("starting-soon");
  const [teamSort, setTeamSort] = useState<TeamSort>("completeness");
  const [peopleSort, setPeopleSort] = useState<PeopleSort>("match");

  /* Deep-linkable tabs: /?tab=teams (set by the /teams redirect) opens
     Discover with that tab pre-selected. Synced with the
     adjust-state-during-render pattern (React docs) — no effect, no
     cascading render, and the page never remounts. */
  const tabParam = searchParams.get("tab");
  const [lastTabParam, setLastTabParam] = useState(tabParam);
  if (lastTabParam !== tabParam) {
    setLastTabParam(tabParam);
    if (isDiscoverTab(tabParam)) setTab(tabParam);
  }

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

  /* Sorted views feed the grids; raw lists keep their query order. */
  const sortedHackathons = useMemo(() => sortHackathons(hackathonList, hackathonSort), [hackathonList, hackathonSort]);
  const sortedTeams = useMemo(() => sortTeams(teamList, teamSort), [teamList, teamSort]);
  const sortedPeople = useMemo(() => sortPeople(peopleList, peopleSort), [peopleList, peopleSort]);
  const loading = isSearching ? search.isLoading : hackathons.isLoading || teams.isLoading || people.isLoading;

  return (
    <div className="pt-8 pb-4">
      {/* Compact header: actions only — project details live on the login screen */}
      <section className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-extrabold tracking-tight">
            <KineticTextReveal
              text="Discover"
              splitBy="words"
              distance={8}
              stagger={0.015}
              blur={false}
            />
          </h1>
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
                {/* Emergency stays reachable but quiet: outline + icon,
                    red only on hover. It must not out-shout the primary
                    actions (Search / Create) on a calm dashboard. */}
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
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
      <Tabs value={effectiveTab} onValueChange={(v) => setTab(v as DiscoverTab)}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* max-w-full + overflow-x-auto: at phone widths the three
              triggers don't all fit — the list swipes instead of
              spilling out of the viewport (no horizontal overflow). */}
          <TabsList className="h-11 bg-muted max-w-full overflow-x-auto scrollbar-slim">
            <TabsTrigger value="hackathons" className="gap-1.5 px-3 sm:px-4 data-[state=active]:bg-background shrink-0">
              <Trophy className="h-4 w-4" /> Hackathons
              <span className="text-xs text-muted-foreground ml-1">{hackathonList.length}</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1.5 px-3 sm:px-4 data-[state=active]:bg-background shrink-0">
              <Users2 className="h-4 w-4" /> Teams
              <span className="text-xs text-muted-foreground ml-1">{teamList.length}</span>
            </TabsTrigger>
            <TabsTrigger value="people" className="gap-1.5 px-3 sm:px-4 data-[state=active]:bg-background shrink-0">
              <Compass className="h-4 w-4" /> People
              <span className="text-xs text-muted-foreground ml-1">{peopleList.length}</span>
            </TabsTrigger>
          </TabsList>
          {effectiveTab === "hackathons" && (
            <SortMenu value={hackathonSort} onChange={setHackathonSort} options={HACKATHON_SORTS} ariaLabel="Sort hackathons" />
          )}
          {effectiveTab === "teams" && (
            <SortMenu value={teamSort} onChange={setTeamSort} options={TEAM_SORTS} ariaLabel="Sort teams" />
          )}
          {effectiveTab === "people" && (
            <SortMenu value={peopleSort} onChange={setPeopleSort} options={PEOPLE_SORTS} ariaLabel="Sort people" />
          )}
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
              {sortedHackathons.map((h) => (
                <HackathonCard key={h.id} hackathon={h} delay={0.04 * Math.min(8, hackathonList.indexOf(h))} />
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
              {sortedTeams.map((t) => (
                <TeamCard key={t.id} team={t} showMatch={isAuthenticated && !isSearching} delay={0.04 * Math.min(8, teamList.indexOf(t))} />
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
              {sortedPeople.map((p) => (
                <PersonCard key={p.id} person={p} showMatch={isAuthenticated && !isSearching} delay={0.04 * Math.min(8, peopleList.indexOf(p))} />
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
