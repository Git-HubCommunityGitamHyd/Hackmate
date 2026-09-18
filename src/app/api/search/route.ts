import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { listHackathons } from "@/lib/queries/hackathons";
import { listTeams } from "@/lib/queries/teams";
import { people } from "@/lib/queries/people";
import { parseSearchQuery, toStructuredFilters } from "@/lib/matching/search-parser";
import { ok, withPublic, requireUser } from "@/lib/api";

/**
 * GET /api/search?q=… — natural-language search across everything.
 * "Need someone who knows Next.js and has ML experience for a 4-person team"
 *   → parses skills (next.js), category (ai_ml), team size (4), intent (people)
 * Postgres full-text (tsvector) used for hackathon text; structured filters
 * via junction tables for skills/roles.
 */
export async function GET(req: NextRequest) {
  return withPublic(async () => {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length === 0) {
      return ok({ parsed: null, hackathons: [], teams: [], people: [] });
    }

    const parsed = parseSearchQuery(q);
    const filters = toStructuredFilters(parsed);

    /* Resolve skill slugs → ids for structured filtering. */
    const allSkills = await db.select().from(schema.skills);
    const skillIdBySlug = new Map(allSkills.map((s) => [s.slug, s.id]));
    const skillIds = filters.skillSlugs.map((s) => skillIdBySlug.get(s)).filter(Boolean) as string[];

    const viewer = await requireUser();

    /* When the parser found structured signals (skills/roles), those carry
       the intent — leftover words like "need/for/team" would over-filter.
       Only apply free-text matching when nothing structured was found. */
    const structured = skillIds.length > 0 || filters.categories.length > 0;
    const freeText = structured ? undefined : filters.q;

    const [hackathonList, teamList, peopleList] = await Promise.all([
      listHackathons({ q: freeText }),
      listTeams({ recruiting: true }, viewer?.id ?? null),
      people({
        q: freeText,
        skillIds: skillIds.length > 0 ? skillIds : undefined,
        categories: filters.categories.length > 0 ? filters.categories : undefined,
        limit: 40,
      }),
    ]);

    /* Hackathon relevance when structured: match theme/name against found
       skill names + role labels ("ML" → AI/ML theme). */
    let hackathons = hackathonList;
    if (structured) {
      const needles = [
        ...parsed.skillSlugs,
        ...parsed.roleSlugs,
      ].flatMap((s) => s.split(/[-_]/));
      const skillNames = filters.skillSlugs
        .map((slug) => allSkills.find((s) => s.slug === slug)?.name ?? "")
        .filter(Boolean);
      hackathons = hackathonList.filter((h) =>
        [...needles, ...skillNames].some((n) =>
          n.length >= 2 &&
          (h.name.toLowerCase().includes(n) ||
            (h.tagline ?? "").toLowerCase().includes(n) ||
            h.themes.some((t) => t.toLowerCase().replace(/[^a-z]/g, "").includes(n.replace(/[^a-z]/g, "")))),
        ),
      );
      if (hackathons.length === 0) hackathons = hackathonList;
    }

    /* Team size filter ("4-person team"). */
    let teams = teamList;
    if (filters.teamSize) {
      teams = teams.filter((t) => t.targetSize >= filters.teamSize! && t.memberCount < t.targetSize);
    }

    /* Intent ordering. */
    const intent = parsed.intent;
    return ok({
      parsed: {
        raw: parsed.raw,
        intent,
        skills: parsed.skillSlugs,
        roles: parsed.roleSlugs,
        teamSize: parsed.teamSize ?? null,
        terms: parsed.terms,
      },
      hackathons: hackathons.slice(0, 10),
      teams: teams.slice(0, 12),
      people: peopleList.slice(0, 12),
    });
  });
}
