import { NextRequest } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { getTeamDetail } from "@/lib/queries/teams";
import { joinRequestSchema } from "@/lib/validations";
import { sendEmail, emailTemplates } from "@/lib/email";
import { ok, fail, requireUser } from "@/lib/api";

/** GET /api/teams/:id/requests — pending requests (admin only). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  const detail = await getTeamDetail(id, user.id);
  if (!detail) return fail("Team not found", 404);
  if (!detail.viewer.isAdmin) return fail("Only team admins can view requests", 403);

  const rows = await db
    .select({
      request: schema.joinRequests,
      user: {
        id: schema.users.id,
        name: schema.users.name,
        image: schema.users.image,
        bio: schema.users.bio,
        experienceLevel: schema.users.experienceLevel,
        githubUsername: schema.users.githubUsername,
        emergencyAvailableUntil: schema.users.emergencyAvailableUntil,
      },
    })
    .from(schema.joinRequests)
    .innerJoin(schema.users, eq(schema.joinRequests.userId, schema.users.id))
    .where(and(eq(schema.joinRequests.teamId, id), eq(schema.joinRequests.status, "pending")));

  return ok(rows.map((r) => ({
    id: r.request.id,
    message: r.request.message,
    createdAt: r.request.createdAt.toISOString(),
    user: r.user,
  })));
}

/** POST /api/teams/:id/requests — send a join request with a short message. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  const detail = await getTeamDetail(id, user.id);
  if (!detail) return fail("Team not found", 404);
  if (detail.viewer.isMember) return fail("You're already on this team", 409);
  if (detail.status !== "recruiting") return fail("This team isn't recruiting", 409);
  if (detail.memberCount >= detail.targetSize) return fail("This team is full", 409);

  const body = await req.json();
  const parsed = joinRequestSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  /* One pending request per team per user. */
  const [existing] = await db
    .select({ id: schema.joinRequests.id, status: schema.joinRequests.status })
    .from(schema.joinRequests)
    .where(and(eq(schema.joinRequests.teamId, id), eq(schema.joinRequests.userId, user.id)))
    .limit(1);
  if (existing?.status === "pending") return fail("You already have a pending request", 409);
  if (existing?.status === "accepted") return fail("You were already accepted to this team", 409);

  /* Can't be on two teams in the same hackathon. */
  const [busy] = await db
    .select({ teamId: schema.teamMembers.teamId })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
    .where(
      and(
        eq(schema.teamMembers.userId, user.id),
        eq(schema.teams.hackathonId, detail.hackathonId),
        ne(schema.teams.status, "disbanded"),
      ),
    )
    .limit(1);
  if (busy) return fail("You're already on another team for this hackathon", 409);

  if (existing) {
    await db
      .update(schema.joinRequests)
      .set({ status: "pending", message: parsed.data.message, createdAt: new Date() })
      .where(eq(schema.joinRequests.id, existing.id));
  } else {
    await db.insert(schema.joinRequests).values({
      teamId: id,
      userId: user.id,
      message: parsed.data.message,
    });
  }

  /* Notify all team admins. */
  const admins = await db
    .select({ userId: schema.teamMembers.userId })
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.teamId, id), eq(schema.teamMembers.isAdmin, true)));

  await db.insert(schema.notifications).values(
    admins.map((a) => ({
      userId: a.userId,
      type: "join_request" as const,
      title: `${user.name ?? "Someone"} wants to join ${detail.name}`,
      body: parsed.data.message.slice(0, 140),
      link: `/teams/${id}`,
    })),
  );

  /* Email admins (best effort). */
  const adminEmails = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(
      eq(
        schema.users.id,
        admins[0]?.userId ?? "00000000-0000-0000-0000-000000000000",
      ),
    );
  if (adminEmails[0]?.email) {
    const tpl = emailTemplates.joinRequest(user.name ?? "Someone", detail.name);
    sendEmail({ to: adminEmails[0].email, ...tpl });
  }

  return ok({ status: "sent" }, { status: 201 });
}

/** PATCH /api/teams/:id/requests — accept or decline (admin only). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  const detail = await getTeamDetail(id, user.id);
  if (!detail) return fail("Team not found", 404);
  if (!detail.viewer.isAdmin) return fail("Only team admins can respond", 403);

  const body = await req.json();
  const requestId = body.requestId as string;
  const action = body.action as "accepted" | "declined";
  if (!requestId || !["accepted", "declined"].includes(action))
    return fail("requestId and action (accepted|declined) are required");

  const [request] = await db
    .select()
    .from(schema.joinRequests)
    .where(and(eq(schema.joinRequests.id, requestId), eq(schema.joinRequests.teamId, id)))
    .limit(1);
  if (!request || request.status !== "pending") return fail("Request not found", 404);

  if (action === "declined") {
    await db.update(schema.joinRequests).set({ status: "declined" }).where(eq(schema.joinRequests.id, requestId));
    await db.insert(schema.notifications).values({
      userId: request.userId,
      type: "request_declined",
      title: `Your request to join ${detail.name} wasn't accepted`,
      body: "Keep browsing — there are more teams recruiting.",
      link: "/discover",
    });
    return ok({ status: "declined" });
  }

  /* Accept: check capacity. */
  if (detail.memberCount >= detail.targetSize) return fail("Team is now full", 409);

  await db.update(schema.joinRequests).set({ status: "accepted" }).where(eq(schema.joinRequests.id, requestId));
  await db.insert(schema.teamMembers).values({
    teamId: id,
    userId: request.userId,
    roleId: request.roleId ?? null,
  });

  /* Maybe close recruitment. */
  if (detail.memberCount + 1 >= detail.targetSize) {
    await db.update(schema.teams).set({ status: "full" }).where(eq(schema.teams.id, id));
  }
  await db
    .update(schema.users)
    .set({ recruitmentStatus: "team_full", updatedAt: new Date() })
    .where(eq(schema.users.id, request.userId));

  await db.insert(schema.notifications).values({
    userId: request.userId,
    type: "request_accepted",
    title: `You're in! Welcome to ${detail.name}`,
    body: `Your request to join ${detail.name} for ${detail.hackathonName} was accepted.`,
    link: "/my-team",
  });

  const [joiner] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, request.userId));
  if (joiner?.email) {
    const tpl = emailTemplates.accepted(detail.name);
    sendEmail({ to: joiner.email, ...tpl });
  }

  return ok({ status: "accepted" });
}
