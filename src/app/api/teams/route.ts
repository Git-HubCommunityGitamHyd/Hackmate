import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { listTeams, getTeamDetail } from "@/lib/queries/teams";
import { teamSchema } from "@/lib/validations";
import { DEFAULT_TASKS } from "@/lib/constants";
import { ok, fail, withUser, withPublic, requireUser } from "@/lib/api";

/** GET /api/teams — list teams (viewer-aware match scores). */
export async function GET(req: NextRequest) {
  return withPublic(async () => {
    const params = req.nextUrl.searchParams;
    const viewer = await requireUser();
    return listTeams(
      {
        hackathonId: params.get("hackathonId") ?? undefined,
        recruiting: params.get("recruiting") === "true",
      },
      viewer?.id ?? null,
    );
  });
}

/**
 * POST /api/teams — create a team with idea, needed roles, wanted skills,
 * and the default workspace checklist. Creator becomes admin member.
 */
export async function POST(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json();
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");
    const data = parsed.data;

    const [hackathon] = await db
      .select()
      .from(schema.hackathons)
      .where(eq(schema.hackathons.id, data.hackathonId))
      .limit(1);
    if (!hackathon) return fail("Hackathon not found", 404);
    if (hackathon.status === "completed") return fail("This hackathon has ended");

    /* One active team per hackathon per user. */
    const [existingMembership] = await db
      .select({ teamId: schema.teamMembers.teamId })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(
        and(
          eq(schema.teamMembers.userId, user.id),
          eq(schema.teams.hackathonId, data.hackathonId),
          eq(schema.teams.status, "recruiting"),
        ),
      )
      .limit(1);
    if (existingMembership)
      return fail("You're already on a team for this hackathon", 409);

    /* Resolve roles + skills from the taxonomy. */
    const roleRows = await db
      .select()
      .from(schema.roleTaxonomy)
      .where(eq(schema.roleTaxonomy.slug, data.roleSlugs.length ? data.roleSlugs[0] : "frontend"));
    const allRoles = await db.select().from(schema.roleTaxonomy);
    const roleBySlug = new Map(allRoles.map((r) => [r.slug, r]));
    const selectedRoles = data.roleSlugs.map((s) => roleBySlug.get(s)).filter(Boolean);

    const allSkills = await db.select().from(schema.skills);
    const skillBySlug = new Map(allSkills.map((s) => [s.slug, s]));
    const selectedSkills = data.skillSlugs.map((s) => skillBySlug.get(s)).filter(Boolean);

    /* Creator's own role for the membership row. */
    const [myPrimaryRole] = await db
      .select({ roleId: schema.userRoles.roleId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, user.id))
      .limit(1);
    void roleRows;

    const [team] = await db
      .insert(schema.teams)
      .values({
        hackathonId: data.hackathonId,
        name: data.name,
        ideaTitle: data.ideaTitle || null,
        ideaDomain: data.ideaDomain || null,
        ideaDescription: data.ideaDescription || null,
        ideaAnonymous: data.ideaAnonymous,
        commitment: data.commitment,
        targetSize: data.targetSize,
        lookingForIdea: data.lookingForIdea,
      })
      .returning();

    await db.insert(schema.teamMembers).values({
      teamId: team.id,
      userId: user.id,
      roleId: myPrimaryRole?.roleId ?? selectedRoles[0]?.id ?? null,
      isAdmin: true,
    });

    if (selectedRoles.length > 0) {
      await db
        .insert(schema.teamRolesNeeded)
        .values(selectedRoles.map((r) => ({ teamId: team.id, roleId: r!.id, priority: "must" as const })));
    }
    if (selectedSkills.length > 0) {
      await db
        .insert(schema.teamSkillsWanted)
        .values(selectedSkills.map((s) => ({ teamId: team.id, skillId: s!.id })));
    }

    /* Default workspace checklist. */
    await db.insert(schema.tasks).values(
      DEFAULT_TASKS.map((t, i) => ({
        teamId: team.id,
        title: t.title,
        category: t.category,
        position: i,
      })),
    );

    /* Update recruitment status. */
    await db
      .update(schema.users)
      .set({ recruitmentStatus: "partially_formed", updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    const detail = await getTeamDetail(team.id, user.id);
    return ok(detail, { status: 201 });
  });
}
