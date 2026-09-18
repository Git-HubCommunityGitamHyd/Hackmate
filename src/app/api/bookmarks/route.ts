import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { getTeamDetail } from "@/lib/queries/teams";
import { getProfile } from "@/lib/queries/people";
import { listHackathons } from "@/lib/queries/hackathons";
import { ok, fail, withUser } from "@/lib/api";

/** GET /api/bookmarks — saved people/teams/hackathons with hydrated cards. */
export async function GET() {
  return withUser(async (user) => {
    const rows = await db
      .select()
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.userId, user.id))
      .orderBy(desc(schema.bookmarks.createdAt));

    const teamIds = rows.filter((r) => r.targetType === "team").map((r) => r.targetId);
    const personIds = rows.filter((r) => r.targetType === "person").map((r) => r.targetId);

    const teams = await Promise.all(teamIds.map((id) => getTeamDetail(id, user.id).catch(() => null)));
    const persons = await Promise.all(personIds.map((id) => getProfile(id).catch(() => null)));
    const hackathonList = await listHackathons();

    return ok({
      teams: teams.filter((t): t is NonNullable<typeof t> => !!t),
      people: persons.filter((p): p is NonNullable<typeof p> => !!p),
      hackathons: rows
        .filter((r) => r.targetType === "hackathon")
        .map((r) => hackathonList.find((h) => h.id === r.targetId))
        .filter(Boolean),
    });
  });
}

/** POST /api/bookmarks — toggle a bookmark. Body: { targetType, targetId }. */
export async function POST(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json();
    const targetType = body.targetType as "team" | "person" | "hackathon";
    const targetId = body.targetId as string;
    if (!["team", "person", "hackathon"].includes(targetType) || !targetId)
      return fail("targetType (team|person|hackathon) and targetId required");

    const [existing] = await db
      .select()
      .from(schema.bookmarks)
      .where(
        and(
          eq(schema.bookmarks.userId, user.id),
          eq(schema.bookmarks.targetType, targetType),
          eq(schema.bookmarks.targetId, targetId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .delete(schema.bookmarks)
        .where(
          and(
            eq(schema.bookmarks.userId, user.id),
            eq(schema.bookmarks.targetType, targetType),
            eq(schema.bookmarks.targetId, targetId),
          ),
        );
      return ok({ bookmarked: false });
    }

    await db.insert(schema.bookmarks).values({ userId: user.id, targetType, targetId });
    return ok({ bookmarked: true }, { status: 201 });
  });
}
