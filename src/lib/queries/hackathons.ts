import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { iso } from "./context";
import type { HackathonCardDTO } from "./types";

export interface HackathonFilters {
  q?: string;
  mode?: "online" | "offline" | "hybrid";
  status?: "upcoming" | "ongoing" | "completed";
}

export async function listHackathons(
  filters: HackathonFilters = {},
): Promise<HackathonCardDTO[]> {
  const rows = await db
    .select({
      h: schema.hackathons,
      recruitingTeamCount: sql<number>`(
        select count(*) from ${schema.teams}
        where ${schema.teams.hackathonId} = ${schema.hackathons.id}
          and ${schema.teams.status} = 'recruiting'
      )`,
      peopleLookingCount: sql<number>`(
        select count(*) from ${schema.hackathonProfiles}
        where ${schema.hackathonProfiles.hackathonId} = ${schema.hackathons.id}
          and ${schema.hackathonProfiles.isActive} = true
      )`,
    })
    .from(schema.hackathons)
    .orderBy(asc(schema.hackathons.startsAt));

  let list = rows
    .map(({ h, recruitingTeamCount, peopleLookingCount }) => ({
    id: h.id,
    slug: h.slug,
    name: h.name,
    tagline: h.tagline,
    mode: h.mode,
    location: h.location,
    themes: h.themes ?? [],
    prizePool: h.prizePool,
    startsAt: iso(h.startsAt),
    endsAt: iso(h.endsAt),
    registrationDeadline: h.registrationDeadline ? iso(h.registrationDeadline) : null,
    teamSizeMin: h.teamSizeMin,
    teamSizeMax: h.teamSizeMax,
    status: h.status,
    organizer: h.organizer,
    recruitingTeamCount: Number(recruitingTeamCount),
    peopleLookingCount: Number(peopleLookingCount),
  }));

  /* Upcoming first (soonest → latest), ongoing, then completed history. */
  const rank = (s: string) => (s === "upcoming" ? 0 : s === "ongoing" ? 1 : 2);
  list.sort((a, b) => {
    const r = rank(a.status) - rank(b.status);
    return r !== 0 ? r : new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });

  if (filters.status) list = list.filter((h) => h.status === filters.status);
  if (filters.mode) list = list.filter((h) => h.mode === filters.mode);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.tagline ?? "").toLowerCase().includes(q) ||
        h.themes.some((t) => t.toLowerCase().includes(q)),
    );
  }
  return list;
}

export async function getHackathonBySlugOrId(idOrSlug: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const [row] = await db
    .select()
    .from(schema.hackathons)
    .where(
      isUuid ? eq(schema.hackathons.id, idOrSlug) : eq(schema.hackathons.slug, idOrSlug),
    )
    .limit(1);
  return row ?? null;
}

/** Full-text search over hackathons (tsvector), with a portable fallback.
 *  CockroachDB has no tsvector support — the try/catch silently degrades
 *  to a LIKE search, so the same code runs on both databases. */
export async function searchHackathonsFTS(q: string): Promise<string[]> {
  try {
    const result: any = await db.execute(sql`
      select id from hackathon
      where to_tsvector('english', name || ' ' || coalesce(tagline, '') || ' ' || coalesce(description, ''))
        @@ websearch_to_tsquery('english', ${q})
      limit 20
    `);
    const rows = Array.isArray(result) ? result : (result.rows ?? []);
    return rows.map((r: any) => r.id as string);
  } catch {
    /* lower() LIKE lower() instead of ILIKE: runs on CockroachDB too. */
    const like = `%${q}%`;
    const rows = await db
      .select({ id: schema.hackathons.id })
      .from(schema.hackathons)
      .where(sql`lower(${schema.hackathons.name}) like lower(${like})`)
      .limit(20);
    return rows.map((r) => r.id);
  }
}
