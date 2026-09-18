import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { getTeamDetail, getPeopleMatchesForTeam } from "@/lib/queries/teams";
import { ok, fail, withPublic, requireUser } from "@/lib/api";

/**
 * GET /api/teams/:id — full team detail with composition intelligence,
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

/** PATCH /api/teams/:id — admin updates (status, links, idea reveal). */
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
  const patch: Record<string, unknown> = {};
  if (typeof body.status === "string" && ["recruiting", "full", "disbanded"].includes(body.status)) {
    patch.status = body.status;
  }
  if (typeof body.chatUrl === "string") patch.chatUrl = body.chatUrl || null;
  if (typeof body.repoUrl === "string") patch.repoUrl = body.repoUrl || null;
  if (typeof body.ideaAnonymous === "boolean") patch.ideaAnonymous = body.ideaAnonymous;
  if (typeof body.targetSize === "number") patch.targetSize = body.targetSize;
  if (typeof body.lookingForIdea === "boolean") patch.lookingForIdea = body.lookingForIdea;

  if (Object.keys(patch).length === 0) return fail("Nothing to update");

  await db.update(schema.teams).set(patch).where(eq(schema.teams.id, id));
  const updated = await getTeamDetail(id, user.id);
  return ok(updated);
}
