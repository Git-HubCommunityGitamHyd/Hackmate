import { NextRequest } from "next/server";
import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { getTeamDetail } from "@/lib/queries/teams";
import { inviteSchema } from "@/lib/validations";
import { ok, fail, requireUser } from "@/lib/api";

/** GET /api/teams/:id/invites - outgoing invite history for team admins. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;
  const detail = await getTeamDetail(id, user.id);
  if (!detail) return fail("Team not found", 404);
  if (!detail.viewer.isAdmin) return fail("Only team admins can view invite history", 403);
  const rows = await db
    .select({
      id: schema.invites.id,
      userId: schema.invites.userId,
      name: schema.users.name,
      image: schema.users.image,
      status: schema.invites.status,
      roleId: schema.invites.roleId,
      expiresAt: schema.invites.expiresAt,
      createdAt: schema.invites.createdAt,
    })
    .from(schema.invites)
    .innerJoin(schema.users, eq(schema.invites.userId, schema.users.id))
    .where(eq(schema.invites.teamId, id));
  return ok(rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  })));
}

/** POST /api/teams/:id/invites - direct invite from a team admin. */
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
  if (!target.openToOpportunities || target.recruitmentStatus === "not_looking" || target.recruitmentStatus === "team_full") {
    return fail("This candidate is not currently available for team invitations", 409);
  }

  /* Target must not be on another team in this hackathon (idea-first
   * teams occupy their own slot). */
  const [busy] = await db
    .select({ teamId: schema.teamMembers.teamId })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
    .where(
      and(
        eq(schema.teamMembers.userId, target.id),
        detail.hackathonId
          ? eq(schema.teams.hackathonId, detail.hackathonId)
          : isNull(schema.teams.hackathonId),
        ne(schema.teams.status, "disbanded"),
      ),
    )
    .limit(1);
  if (busy)
    return fail(
      detail.hackathonId
        ? `${target.name ?? "They"} already has a team for this hackathon`
        : `${target.name ?? "They"} already has an idea-first team`,
      409,
    );

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
      .set({
        status: "pending",
        inviterId: user.id,
        message: parsed.data.message || null,
        roleId,
        expiresAt: new Date(Date.now() + Number(process.env.INVITE_EXPIRY_DAYS ?? 7) * 24 * 60 * 60 * 1000),
        digestClaimedAt: null,
        digestSentAt: null,
      })
      .where(and(eq(schema.invites.teamId, id), eq(schema.invites.userId, target.id)));
  } else {
    const [createdInvite] = await db.insert(schema.invites).values({
      teamId: id,
      userId: target.id,
      inviterId: user.id,
      roleId,
      message: parsed.data.message || null,
      expiresAt: new Date(Date.now() + Number(process.env.INVITE_EXPIRY_DAYS ?? 7) * 24 * 60 * 60 * 1000),
    }).returning();
    await db.insert(schema.notifications).values({
      userId: target.id,
      inviteId: createdInvite.id,
      type: "invite",
      title: `${user.name ?? "Someone"} invited you to join "${detail.name}"`,
      body:
        parsed.data.message?.slice(0, 140) ??
        (detail.hackathonName
          ? `Team for ${detail.hackathonName}`
          : "Idea-first team, event still being picked"),
      link: "/notifications",
    });
    return ok({ status: "sent" }, { status: 201 });
  }

  const [refreshedInvite] = await db
    .select({ id: schema.invites.id })
    .from(schema.invites)
    .where(and(eq(schema.invites.teamId, id), eq(schema.invites.userId, target.id)))
    .limit(1);
  await db.insert(schema.notifications).values({
    userId: target.id,
    inviteId: refreshedInvite?.id,
    type: "invite",
    title: `${user.name ?? "Someone"} invited you to join "${detail.name}"`,
    body: parsed.data.message?.slice(0, 140) ?? `Team for ${detail.hackathonName ?? "an upcoming event"}`,
    link: "/notifications",
  });
  return ok({ status: "sent" }, { status: 201 });
}

/** PATCH /api/teams/:id/invites - respond to an invite I received. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json();
  const action = body.action as "accepted" | "declined" | "revoked";
  if (!["accepted", "declined", "revoked"].includes(action)) return fail("action must be accepted|declined|revoked");

  const targetUserId = action === "revoked" && typeof body.userId === "string" ? body.userId : user.id;
  const [invite] = await db
    .select()
    .from(schema.invites)
    .where(and(eq(schema.invites.teamId, id), eq(schema.invites.userId, targetUserId)))
    .limit(1);
  if (!invite || invite.status !== "pending") return fail("No pending invite", 404);

  const detail = await getTeamDetail(id, user.id);
  if (!detail) return fail("Team not found", 404);

  if (invite.expiresAt && invite.expiresAt <= new Date()) {
    await db.update(schema.invites).set({ status: "expired" }).where(eq(schema.invites.id, invite.id));
    await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.inviteId, invite.id));
    return fail("Invite has expired", 409);
  }

  if (action === "revoked") {
    if (!detail.viewer.isAdmin) return fail("Only team admins can revoke invites", 403);
    await db.update(schema.invites).set({ status: "revoked" }).where(eq(schema.invites.id, invite.id));
    await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.inviteId, invite.id));
    return ok({ status: "revoked" });
  }

  if (action === "declined") {
    await db.update(schema.invites).set({ status: "declined" }).where(eq(schema.invites.id, invite.id));
    await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.inviteId, invite.id));
    return ok({ status: "declined" });
  }

  if (detail.memberCount >= detail.targetSize) return fail("Team is now full", 409);
  if (detail.status !== "recruiting") return fail("Team isn't recruiting anymore", 409);

  await db.transaction(async (tx) => {
    const [lockedTeam] = await tx
      .select({ status: schema.teams.status, targetSize: schema.teams.targetSize })
      .from(schema.teams)
      .where(eq(schema.teams.id, id))
      .for("update");
    if (!lockedTeam || lockedTeam.status !== "recruiting") throw new Error("Team isn't recruiting anymore");
    const memberRows = await tx
      .select({ userId: schema.teamMembers.userId })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, id));
    if (memberRows.length >= lockedTeam.targetSize) throw new Error("Team is now full");
    const [locked] = await tx
      .select()
      .from(schema.invites)
      .where(and(eq(schema.invites.id, invite.id), eq(schema.invites.status, "pending")))
      .for("update");
    if (!locked) throw new Error("Invite is no longer pending");
    if (memberRows.some((member) => member.userId === user.id)) throw new Error("You are already on this team");
    await tx.update(schema.invites).set({ status: "accepted" }).where(eq(schema.invites.id, invite.id));
    await tx.insert(schema.teamMembers).values({
      teamId: id,
      userId: user.id,
      roleId: invite.roleId ?? null,
    });
    await tx.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.inviteId, invite.id));
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
