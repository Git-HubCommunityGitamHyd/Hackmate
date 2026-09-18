import { NextRequest } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { ok, fail, withUser } from "@/lib/api";

/** GET /api/notifications — my notifications + pending invites + join requests. */
export async function GET() {
  return withUser(async (user) => {
    const [notifRows, inviteRows, myRequestRows, myTeams] = await Promise.all([
      db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, user.id))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(50),
      db
        .select({
          invite: schema.invites,
          teamName: schema.teams.name,
          teamId: schema.teams.id,
          hackathonName: schema.hackathons.name,
          inviterName: schema.users.name,
        })
        .from(schema.invites)
        .innerJoin(schema.teams, eq(schema.invites.teamId, schema.teams.id))
        .innerJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
        .innerJoin(schema.users, eq(schema.invites.inviterId, schema.users.id))
        .where(and(eq(schema.invites.userId, user.id), eq(schema.invites.status, "pending"))),
      db
        .select({
          request: schema.joinRequests,
          teamName: schema.teams.name,
          teamId: schema.teams.id,
          hackathonName: schema.hackathons.name,
        })
        .from(schema.joinRequests)
        .innerJoin(schema.teams, eq(schema.joinRequests.teamId, schema.teams.id))
        .innerJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
        .where(and(eq(schema.joinRequests.userId, user.id), eq(schema.joinRequests.status, "pending"))),
      db
        .select({ teamId: schema.teamMembers.teamId, isAdmin: schema.teamMembers.isAdmin })
        .from(schema.teamMembers)
        .where(eq(schema.teamMembers.userId, user.id)),
    ]);

    /* Incoming join requests for teams I admin. */
    const adminTeamIds = myTeams.filter((t) => t.isAdmin).map((t) => t.teamId);
    const incomingRequests =
      adminTeamIds.length > 0
        ? await db
            .select({
              request: schema.joinRequests,
              teamName: schema.teams.name,
              teamId: schema.teams.id,
              userName: schema.users.name,
              userImage: schema.users.image,
              userBio: schema.users.bio,
              userId: schema.users.id,
            })
            .from(schema.joinRequests)
            .innerJoin(schema.teams, eq(schema.joinRequests.teamId, schema.teams.id))
            .innerJoin(schema.users, eq(schema.joinRequests.userId, schema.users.id))
            .where(
              and(
                inArray(schema.joinRequests.teamId, adminTeamIds),
                eq(schema.joinRequests.status, "pending"),
              ),
            )
        : [];

    return ok({
      notifications: notifRows.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      invites: inviteRows.map((r) => ({
        id: r.invite.id,
        teamId: r.teamId,
        teamName: r.teamName,
        hackathonName: r.hackathonName,
        inviterName: r.inviterName,
        message: r.invite.message,
        createdAt: r.invite.createdAt.toISOString(),
      })),
      myRequests: myRequestRows.map((r) => ({
        id: r.request.id,
        teamId: r.teamId,
        teamName: r.teamName,
        hackathonName: r.hackathonName,
        message: r.request.message,
        createdAt: r.request.createdAt.toISOString(),
      })),
      incomingRequests: incomingRequests.map((r) => ({
        id: r.request.id,
        teamId: r.teamId,
        teamName: r.teamName,
        userName: r.userName,
        userImage: r.userImage,
        userBio: r.userBio,
        userId: r.userId,
        message: r.request.message,
        createdAt: r.request.createdAt.toISOString(),
      })),
    });
  });
}

/** PATCH /api/notifications — mark all (or one) as read. */
export async function PATCH(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json().catch(() => ({}));
    if (body.id) {
      await db
        .update(schema.notifications)
        .set({ read: true })
        .where(and(eq(schema.notifications.id, body.id), eq(schema.notifications.userId, user.id)));
    } else {
      await db
        .update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.userId, user.id));
    }
    return ok({ read: true });
  });
}
