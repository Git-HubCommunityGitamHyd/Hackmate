import { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { messageSchema } from "@/lib/validations";
import { triggerTeamMessage } from "@/lib/pusher-server";
import { ok, fail, requireUser } from "@/lib/api";
import { createHmac } from "crypto";

/** GET /api/teams/:id/chat — message history (members only). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  if (!(await isTeamMember(id, user.id))) return fail("Only team members can read chat", 403);

  const rows = await db
    .select({
      id: schema.messages.id,
      content: schema.messages.content,
      createdAt: schema.messages.createdAt,
      userId: schema.users.id,
      userName: schema.users.name,
      userImage: schema.users.image,
    })
    .from(schema.messages)
    .innerJoin(schema.users, eq(schema.messages.userId, schema.users.id))
    .where(eq(schema.messages.teamId, id))
    .orderBy(asc(schema.messages.createdAt))
    .limit(200);

  return ok(
    rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      userId: r.userId,
      userName: r.userName ?? "Anonymous",
      userImage: r.userImage,
    })),
  );
}

/** POST /api/teams/:id/chat — send a message (members only, triggers Pusher). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  if (!(await isTeamMember(id, user.id))) return fail("Only team members can chat", 403);

  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return fail("Message required");

  const [msg] = await db
    .insert(schema.messages)
    .values({ teamId: id, userId: user.id, content: parsed.data.content })
    .returning();

  const payload = {
    id: msg.id,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
    userId: user.id,
    userName: user.name ?? "Anonymous",
    userImage: user.image,
  };
  await triggerTeamMessage(id, payload);

  return ok(payload, { status: 201 });
}

/**
 * PUT /api/teams/:id/chat — Pusher private-channel auth endpoint.
 * pusher-js POSTs form-encoded socket_id + channel_name; members only.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  if (!(await isTeamMember(id, user.id))) return fail("Not a team member", 403);

  const body = new URLSearchParams(await req.text());
  const socketId = body.get("socket_id");
  const channelName = body.get("channel_name");
  if (!socketId || !channelName) return fail("socket_id and channel_name required", 422);

  const appKey = process.env.PUSHER_APP_KEY;
  const appSecret = process.env.PUSHER_APP_SECRET;
  if (!appKey || !appSecret) return fail("Pusher not configured", 500);

  const signature = createHmac("sha256", appSecret)
    .update(`${socketId}:${channelName}`)
    .digest("hex");

  return ok({ auth: `${appKey}:${signature}` });
}

async function isTeamMember(teamId: string, userId: string) {
  const rows = await db
    .select({ userId: schema.teamMembers.userId })
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)));
  return rows.length > 0;
}
