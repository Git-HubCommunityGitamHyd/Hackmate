import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { getTeamDetail, getPeopleMatchesForTeam } from "@/lib/queries/teams";
import { teamPatchSchema } from "@/lib/validations";
import { ok, fail, withPublic, requireUser } from "@/lib/api";

/**
 * GET /api/teams/:id - full team detail with composition intelligence,
 * viewer context (member? admin? pending request?) and gap-driven
 * people recommendations for leaders.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPublic(async () => {
    const { id } = await params;
    const viewer = await requireUser();
    const detail = await getTeamDetail(id, viewer?.id ?? null);
    if (!detail) return fail("Team not found", 404);

    /* Gap-driven candidate recommendations (admin view). */
    let recommendations: Awaited<ReturnType<typeof getPeopleMatchesForTeam>> = [];
    if (viewer?.id && detail.viewer.isAdmin && detail.status === "recruiting") {
      recommendations = await getPeopleMatchesForTeam(id);
    }

    return ok({ ...detail, recommendations });
  });
}

/** PATCH /api/teams/:id - admin updates (status, links, idea reveal, event). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  const detail = await getTeamDetail(id, user.id);
  if (!detail) return fail("Team not found", 404);
  if (!detail.viewer.isAdmin) return fail("Only team admins can update the team", 403);

  const body = await req.json().catch(() => ({}));
  const parsed = teamPatchSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");
  const data = parsed.data;

  /* Attaching an event: validate it exists, isn't ended, and no member
   * is already on another team for it. */
  if (data.hackathonId) {
    const [hackathon] = await db
      .select({ id: schema.hackathons.id, status: schema.hackathons.status })
      .from(schema.hackathons)
      .where(eq(schema.hackathons.id, data.hackathonId))
      .limit(1);
    if (!hackathon) return fail("Hackathon not found", 404);
    if (hackathon.status === "completed") return fail("This hackathon has ended");

    const memberIds = detail.members.map((m) => m.userId);
    if (memberIds.length > 0) {
      const conflicts = await db
        .select({ userId: schema.teamMembers.userId })
        .from(schema.teamMembers)
        .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
        .where(
          and(
            eq(schema.teams.hackathonId, data.hackathonId),
            eq(schema.teams.status, "recruiting"),
          ),
        );
      const conflictSet = new Set(conflicts.map((c) => c.userId));
      const clashing = detail.members.filter((m) => conflictSet.has(m.userId));
      if (clashing.length > 0) {
        return fail(
          `${clashing[0].name} is already on another team for this event`,
          409,
        );
      }
    }
  }

  const patch: Record<string, unknown> = {};
  if (data.hackathonId !== undefined) patch.hackathonId = data.hackathonId;
  if (data.name !== undefined) patch.name = data.name;
  if (data.ideaTitle !== undefined) patch.ideaTitle = data.ideaTitle || null;
  if (data.ideaDomain !== undefined) patch.ideaDomain = data.ideaDomain || null;
  if (data.ideaDescription !== undefined) patch.ideaDescription = data.ideaDescription || null;
  if (data.ideaAnonymous !== undefined) patch.ideaAnonymous = data.ideaAnonymous;
  if (data.targetSize !== undefined) patch.targetSize = data.targetSize;
  if (data.lookingForIdea !== undefined) patch.lookingForIdea = data.lookingForIdea;
  if (data.commitment !== undefined) patch.commitment = data.commitment;
  if (data.status !== undefined) patch.status = data.status;
  if (data.chatUrl !== undefined) patch.chatUrl = data.chatUrl || null;
  if (data.repoUrl !== undefined) patch.repoUrl = data.repoUrl || null;
  if (Object.keys(patch).length === 0) return fail("Nothing to update");

  await db.update(schema.teams).set(patch).where(eq(schema.teams.id, id));
  const updated = await getTeamDetail(id, user.id);
  return ok(updated);
}
