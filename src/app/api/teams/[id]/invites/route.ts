import { NextRequest } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { getTeamDetail } from "@/lib/queries/teams";
import { inviteSchema } from "@/lib/validations";
import { sendEmail, emailTemplates } from "@/lib/email";
import { ok, fail, requireUser } from "@/lib/api";

/** GET /api/teams/:id/invites — invites I received (for workspace view). */

/** POST /api/teams/:id/invites — direct invite from a team admin. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  const detail = await getTeamDetail(id, user.id);
  if (!detail) return fail("Team not found", 404);
  if (!detail.viewer.isAdmin) return fail("Only team admins can invite", 403);
  if (detail.status !== "recruiting") return fail("Team isn't recruiting", 409);
  if (detail.memberCount >= detail.targetSize) return fail("Team is full", 409);

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const [target] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, parsed.data.userId))
    .limit(1);
  if (!target) return fail("User not found", 404);

  /* Target must not be on another team in this hackathon. */
  const [busy] = await db
    .select({ teamId: schema.teamMembers.teamId })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
    .where(
      and(
        eq(schema.teamMembers.userId, target.id),
        eq(schema.teams.hackathonId, detail.hackathonId),
        ne(schema.teams.status, "disbanded"),
      ),
    )
    .limit(1);
  if (busy) return fail(`${target.name ?? "They"} already has a team for this hackathon`, 409);

  const [existing] = await db
    .select({ status: schema.invites.status })
    .from(schema.invites)
    .where(and(eq(schema.invites.teamId, id), eq(schema.invites.userId, target.id)))
    .limit(1);
  if (existing?.status === "pending") return fail("Invite already pending", 409);

  let roleId: string | null = null;
  if (parsed.data.roleSlug) {
    const [role] = await db
      .select({ id: schema.roleTaxonomy.id })
      .from(schema.roleTaxonomy)
      .where(eq(schema.roleTaxonomy.slug, parsed.data.roleSlug))
      .limit(1);
    roleId = role?.id ?? null;
  }

  if (existing) {
    await db
      .update(schema.invites)
      .set({ status: "pending", inviterId: user.id, message: parsed.data.message || null, roleId })
      .where(and(eq(schema.invites.teamId, id), eq(schema.invites.userId, target.id)));
  } else {
    await db.insert(schema.invites).values({
      teamId: id,
      userId: target.id,
      inviterId: user.id,
      roleId,
      message: parsed.data.message || null,
    });
  }

  await db.insert(schema.notifications).values({
    userId: target.id,
    type: "invite",
    title: `${user.name ?? "Someone"} invited you to join "${detail.name}"`,
    body: parsed.data.message?.slice(0, 140) ?? `Team for ${detail.hackathonName}`,
    link: "/notifications",
  });

  const tpl = emailTemplates.invite(detail.name, detail.hackathonName, user.name ?? "A team lead");
  sendEmail({ to: target.email, ...tpl });

  return ok({ status: "sent" }, { status: 201 });
}

/** PATCH /api/teams/:id/invites — respond to an invite I received. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json();
  const action = body.action as "accepted" | "declined";
  if (!["accepted", "declined"].includes(action)) return fail("action must be accepted|declined");

  const [invite] = await db
    .select()
    .from(schema.invites)
    .where(and(eq(schema.invites.teamId, id), eq(schema.invites.userId, user.id)))
    .limit(1);
  if (!invite || invite.status !== "pending") return fail("No pending invite", 404);

  const detail = await getTeamDetail(id, user.id);
  if (!detail) return fail("Team not found", 404);

  if (action === "declined") {
    await db.update(schema.invites).set({ status: "declined" }).where(eq(schema.invites.id, invite.id));
    return ok({ status: "declined" });
  }

  if (detail.memberCount >= detail.targetSize) return fail("Team is now full", 409);
  if (detail.status !== "recruiting") return fail("Team isn't recruiting anymore", 409);

  await db.update(schema.invites).set({ status: "accepted" }).where(eq(schema.invites.id, invite.id));
  await db.insert(schema.teamMembers).values({
    teamId: id,
    userId: user.id,
    roleId: invite.roleId ?? null,
  });

  if (detail.memberCount + 1 >= detail.targetSize) {
    await db.update(schema.teams).set({ status: "full" }).where(eq(schema.teams.id, id));
  }
  await db
    .update(schema.users)
    .set({ recruitmentStatus: "team_full", updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  await db.insert(schema.notifications).values({
    userId: invite.inviterId,
    type: "team_update",
    title: `${user.name ?? "Someone"} accepted your invite to ${detail.name}`,
    link: `/teams/${id}`,
  });

  return ok({ status: "accepted" });
}
