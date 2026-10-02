import { NextRequest } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getTeamDetail } from "@/lib/queries/teams";
import { teamResultSchema } from "@/lib/validations";
import { computeKarma } from "@/lib/reputation";
import { ok, fail, requireUser } from "@/lib/api";

/**
 * POST /api/teams/:id/result — the post-hackathon write path.
 *
 * The team admin records what the team shipped. One call:
 *   1. inserts a hackathon_result row for every member (history + karma source)
 *   2. marks everyone present (attendance)
 *   3. awards badges: completed-hackathon, built-project (when a link ships),
 *      finalist (placement 2-3), winner (placement 1), worked-together (pairwise)
 *   4. closes the team, refreshes every member's karma cache and notifies them
 *
 * Idempotency: one result per team, ever — re-recording is rejected with 409.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;

  const detail = await getTeamDetail(id, user.id);
  if (!detail) return fail("Team not found", 404);
  if (!detail.viewer.isAdmin) return fail("Only team admins can record the result", 403);
  if (!detail.hackathonId)
    return fail("Attach a hackathon to this team before recording a result", 422);

  const body = await req.json().catch(() => ({}));
  const parsed = teamResultSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");
  const data = parsed.data;

  const members = detail.members;
  if (members.length === 0) return fail("This team has no members to record for", 422);

  /* One result per team. */
  const [existing] = await db
    .select({ id: schema.hackathonResults.id })
    .from(schema.hackathonResults)
    .where(eq(schema.hackathonResults.teamId, id))
    .limit(1);
  if (existing) return fail("A result is already recorded for this team", 409);

  const placement = data.placement ?? null;
  const shipped = !!(data.projectUrl || data.repoUrl || data.devpostUrl);

  /* 1. Result rows for every member. */
  await db.insert(schema.hackathonResults).values(
    members.map((m) => ({
      userId: m.userId,
      hackathonId: detail.hackathonId!,
      teamId: id,
      projectName: data.projectName,
      projectUrl: data.projectUrl || null,
      devpostUrl: data.devpostUrl || null,
      repoUrl: data.repoUrl || null,
      placement,
      technologies: data.technologies ?? [],
    })),
  );

  /* 2. Attendance: recording a submission means the team showed up. */
  await db
    .insert(schema.attendance)
    .values(
      members.map((m) => ({
        userId: m.userId,
        hackathonId: detail.hackathonId!,
        teamId: id,
        markedByUserId: user.id,
        status: "present" as const,
      })),
    )
    .onConflictDoNothing();

  /* 3. Badges. */
  const badgeRows = await db.select().from(schema.badges);
  const badgeBySlug = new Map(badgeRows.map((b) => [b.slug, b]));

  type Award = {
    userId: string;
    badgeId: string;
    hackathonId: string;
    awardedWithUserId?: string | null;
  };
  const awards: Award[] = [];

  const push = (slug: string, userId: string, awardedWithUserId?: string) => {
    const badge = badgeBySlug.get(slug);
    if (!badge) return;
    awards.push({
      userId,
      badgeId: badge.id,
      hackathonId: detail.hackathonId!,
      awardedWithUserId: awardedWithUserId ?? null,
    });
  };

  for (const m of members) {
    push("completed-hackathon", m.userId);
    if (shipped) push("built-project", m.userId);
    if (placement !== null && placement >= 2 && placement <= 3) push("finalist", m.userId);
    if (placement === 1) push("winner", m.userId);
    for (const other of members) {
      if (other.userId !== m.userId) push("worked-together", m.userId, other.userId);
    }
  }
  /* onConflictDoNothing: user_badge has a (user_id, badge_id) unique
     index, so a second hackathon with the same teammates would collide
     on "worked-together" — the badge simply already exists. */
  if (awards.length > 0)
    await db.insert(schema.userBadges).values(awards).onConflictDoNothing();

  /* 4. Close the team, refresh karma caches, notify members. */
  await db.update(schema.teams).set({ status: "full" }).where(eq(schema.teams.id, id));

  const memberIds = members.map((m) => m.userId);
  const [attRows, resRows, revRows, cancelRows] = await Promise.all([
    db
      .select({ userId: schema.attendance.userId, present: sql<number>`count(*)::int` })
      .from(schema.attendance)
      .where(and(inArray(schema.attendance.userId, memberIds), eq(schema.attendance.status, "present")))
      .groupBy(schema.attendance.userId),
    db
      .select({
        userId: schema.hackathonResults.userId,
        completed: sql<number>`count(*)::int`,
        podiums: sql<number>`count(*) filter (where ${schema.hackathonResults.placement} between 1 and 3)::int`,
      })
      .from(schema.hackathonResults)
      .where(inArray(schema.hackathonResults.userId, memberIds))
      .groupBy(schema.hackathonResults.userId),
    db
      .select({
        userId: schema.performanceReviews.revieweeId,
        ratingCount: sql<number>`count(*)::int`,
        avgRating: sql<number | null>`avg(${schema.performanceReviews.rating})::float8`,
      })
      .from(schema.performanceReviews)
      .where(inArray(schema.performanceReviews.revieweeId, memberIds))
      .groupBy(schema.performanceReviews.revieweeId),
    db
      .select({
        userId: schema.cancellationHistory.userId,
        lastMinute: sql<number>`count(*)::int`,
      })
      .from(schema.cancellationHistory)
      .where(and(inArray(schema.cancellationHistory.userId, memberIds), eq(schema.cancellationHistory.isLastMinute, true)))
      .groupBy(schema.cancellationHistory.userId),
  ]);

  const attMap = new Map(attRows.map((r) => [r.userId, r.present]));
  const resMap = new Map(resRows.map((r) => [r.userId, r]));
  const revMap = new Map(revRows.map((r) => [r.userId, r]));
  const cancelMap = new Map(cancelRows.map((r) => [r.userId, r.lastMinute]));

  const karmaByUser: Record<string, number> = {};
  for (const memberId of memberIds) {
    const r = resMap.get(memberId);
    const rev = revMap.get(memberId);
    const ratingCount = rev?.ratingCount ?? 0;
    const karma = computeKarma({
      attendancePresent: attMap.get(memberId) ?? 0,
      hackathonsCompleted: r?.completed ?? 0,
      podiumFinishes: r?.podiums ?? 0,
      ratingCount,
      avgRating: ratingCount > 0 ? (rev?.avgRating ?? null) : null,
      lastMinuteCancellations: cancelMap.get(memberId) ?? 0,
    });
    karmaByUser[memberId] = karma.score;
  }

  await Promise.all(
    memberIds.map((memberId) =>
      db
        .update(schema.users)
        .set({ reputationScore: karmaByUser[memberId] })
        .where(eq(schema.users.id, memberId)),
    ),
  );

  const placementLabel =
    placement === 1
      ? "1st place"
      : placement === 2
        ? "2nd place"
        : placement === 3
          ? "3rd place"
          : placement
            ? `placed ${placement}`
            : "submitted";
  /* Solo teams filter down to zero rows — Drizzle's values([]) throws
     "must be called with at least one value", which used to 500 the
     whole result recording for one-person teams. Guard the insert. */
  const notifRows = members
    .filter((m) => m.userId !== user.id)
    .map((m) => ({
      userId: m.userId,
      type: "team_update" as const,
      title: `Result recorded for "${detail.name}"`,
      body: `${data.projectName} — ${placementLabel}. Badges and karma updated on your profile.`,
      link: "/my-team",
    }));
  if (notifRows.length > 0) {
    await db.insert(schema.notifications).values(notifRows);
  }

  return ok(
    {
      recorded: members.length,
      badgesAwarded: awards.length,
      placement,
      karmaByUser,
    },
    { status: 201 },
  );
}
