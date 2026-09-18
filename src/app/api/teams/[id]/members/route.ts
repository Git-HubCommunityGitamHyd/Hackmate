import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { ok, fail, requireUser } from "@/lib/api";

/**
 * DELETE /api/teams/:id/members — leave team (self) or remove member (admin).
 * Body: { userId?: string } — defaults to self.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const targetUserId = (body.userId as string) ?? user.id;

  const [membership] = await db
    .select()
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.teamId, id), eq(schema.teamMembers.userId, targetUserId)))
    .limit(1);
  if (!membership) return fail("Not a member", 404);

  const isSelf = targetUserId === user.id;
  const [me] = await db
    .select()
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.teamId, id), eq(schema.teamMembers.userId, user.id)))
    .limit(1);
  if (!isSelf && !me?.isAdmin) {
    return fail("Only admins can remove members", 403);
  }

  await db
    .delete(schema.teamMembers)
    .where(and(eq(schema.teamMembers.teamId, id), eq(schema.teamMembers.userId, targetUserId)));

  const remaining = await db
    .select({ isAdmin: schema.teamMembers.isAdmin, userId: schema.teamMembers.userId })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.teamId, id));

  if (remaining.length === 0) {
    /* Last member left → disband. */
    await db.update(schema.teams).set({ status: "disbanded" }).where(eq(schema.teams.id, id));
  } else {
    /* Promote the earliest remaining member if admin left. */
    const hasAdmin = remaining.some((m) => m.isAdmin);
    if (!hasAdmin) {
      await db
        .update(schema.teamMembers)
        .set({ isAdmin: true })
        .where(and(eq(schema.teamMembers.teamId, id), eq(schema.teamMembers.userId, remaining[0].userId)));
    }
    /* Reopen recruitment if capacity freed up. */
    const [team] = await db.select().from(schema.teams).where(eq(schema.teams.id, id)).limit(1);
    if (team && team.status === "full" && remaining.length < team.targetSize) {
      await db.update(schema.teams).set({ status: "recruiting" }).where(eq(schema.teams.id, id));
    }
  }

  await db
    .update(schema.users)
    .set({ recruitmentStatus: "looking", updatedAt: new Date() })
    .where(eq(schema.users.id, targetUserId));

  if (!isSelf) {
    await db.insert(schema.notifications).values({
      userId: targetUserId,
      type: "team_update",
      title: "You were removed from a team",
      body: "You can browse other recruiting teams in Discover.",
      link: "/discover",
    });
  }

  return ok({ status: "left", teamDisbanded: remaining.length === 0 });
}
