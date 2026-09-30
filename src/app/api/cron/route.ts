import { NextRequest } from "next/server";
import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { ok, fail } from "@/lib/api";

/**
 * Vercel Cron endpoint (Hobby plan: 2 jobs/day — see vercel.json).
 * Secured by the CRON_SECRET bearer token that Vercel injects.
 *
 * Jobs:
 *   1. deadline reminders  — registration/submission deadlines within 48h
 *   2. emergency expiry    — expire emergency availability windows
 *   3. keep-alive ping     — SELECT 1 against CockroachDB
 */
async function runDailyJobs() {
  const results: Record<string, unknown> = {};

  /* --- 1. Deadline reminders -------------------------------------- */
  const soon = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const upcoming = await db
    .select()
    .from(schema.hackathons)
    .where(
      and(
        ne(schema.hackathons.status, "completed"),
        lt(schema.hackathons.registrationDeadline, soon),
      ),
    );

  let remindersSent = 0;
  for (const hackathon of upcoming) {
    const deadline = hackathon.registrationDeadline ?? hackathon.startsAt;
    const when = deadline.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    /* Notify members of active teams that still have open checklist items. */
    const teams = await db
      .select({ teamId: schema.teams.id, name: schema.teams.name })
      .from(schema.teams)
      .where(and(eq(schema.teams.hackathonId, hackathon.id), ne(schema.teams.status, "disbanded")));

    for (const team of teams) {
      const openTasks = await db
        .select({ id: schema.tasks.id })
        .from(schema.tasks)
        .where(and(eq(schema.tasks.teamId, team.teamId), eq(schema.tasks.done, false)));
      if (openTasks.length === 0) continue;

      const members = await db
        .select({ userId: schema.teamMembers.userId, email: schema.users.email })
        .from(schema.teamMembers)
        .innerJoin(schema.users, eq(schema.teamMembers.userId, schema.users.id))
        .where(eq(schema.teamMembers.teamId, team.teamId));

      if (members.length === 0) continue;

      await db.insert(schema.notifications).values(
        members.map((m) => ({
          userId: m.userId,
          type: "deadline" as const,
          title: `${hackathon.name}: deadline in <48h`,
          body: `${team.name} still has ${openTasks.length} unfinished checklist items. Deadline: ${when}.`,
          link: "/my-team",
        })),
      );
      remindersSent += 1;

      /* Best-effort email to the first member (keeps Resend quota healthy). */
      const tpl = emailTemplates.deadline(hackathon.name, when);
      sendEmail({ to: members[0].email, ...tpl });
    }
  }
  results.deadlineReminders = { hackathons: upcoming.length, teams: remindersSent };

  /* --- 2. Emergency mode expiry ------------------------------------ */
  const expired = await db
    .update(schema.users)
    .set({ emergencyAvailableUntil: null })
    .where(
      and(
        sql`${schema.users.emergencyAvailableUntil} is not null`,
        lt(schema.users.emergencyAvailableUntil, new Date()),
      ),
    )
    .returning({ id: schema.users.id });
  results.emergencyExpired = expired.length;

  /* --- 3. Keep-alive ping ------------------------------------------ */
  await db.execute(sql`select 1`);
  results.keepAlive = "ok";

  return results;
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  /* Vercel Cron sends: Authorization: Bearer <CRON_SECRET>. */
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const urlSecret = req.nextUrl.searchParams.get("secret");

  const authorized = secret
    ? authHeader === `Bearer ${secret}` || urlSecret === secret
    : process.env.NODE_ENV !== "production";

  if (!authorized) return fail("Unauthorized", 401);

  try {
    const results = await runDailyJobs();
    return ok({ ranAt: new Date().toISOString(), ...results });
  } catch (err: any) {
    console.error("[cron:error]", err);
    return fail(err?.message ?? "Cron job failed", 500);
  }
}
