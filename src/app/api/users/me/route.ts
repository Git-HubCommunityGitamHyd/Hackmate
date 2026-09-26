import { NextRequest } from "next/server";
import { and, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { profileSchema } from "@/lib/validations";
import { getProfile } from "@/lib/queries/people";
import type { TeamDetailDTO } from "@/lib/queries/types";
import { ok, fail, withUser } from "@/lib/api";
import { PROCESSING_STALE_AFTER_MS } from "@/lib/verification/constants";

/** GET /api/users/me — full own profile + my active team. */
export async function GET() {
  return withUser(async (user) => {
    const staleBefore = new Date(Date.now() - PROCESSING_STALE_AFTER_MS);
    await db
      .update(schema.users)
      .set({
        idVerified: false,
        idVerificationStatus: "NOT_VERIFIED",
        idVerificationStartedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.users.id, user.id),
          eq(schema.users.idVerificationStatus, "PROCESSING"),
          or(
            isNull(schema.users.idVerificationStartedAt),
            lt(schema.users.idVerificationStartedAt, staleBefore),
          ),
        ),
      );

    const profile = await getProfile(user.id);
    if (!profile) return fail("Profile not found", 404);

    /* Active team (non-disbanded) for workspace + notifications. */
    const [membership] = await db
      .select({
        teamId: schema.teamMembers.teamId,
        hackathonId: schema.teams.hackathonId,
        status: schema.teams.status,
      })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(and(eq(schema.teamMembers.userId, user.id), ne(schema.teams.status, "disbanded")))
      .limit(1);

    let myTeam: unknown = null;
    if (membership) {
      const { getTeamDetail } = await import("@/lib/queries/teams");
      myTeam = await getTeamDetail(membership.teamId, user.id);
    }

    return ok({ ...profile, myTeam: myTeam as TeamDetailDTO | null });
  });
}

/** PUT /api/users/me — upsert profile (skills junctions, availability, compat). */
export async function PUT(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid profile data", 422);
    }
    const data = parsed.data;

    await db
      .update(schema.users)
      .set({
        name: data.name,
        username: data.username || null,
        bio: data.bio || null,
        githubUsername: data.githubUsername || null,
        linkedinUrl: data.linkedinUrl || null,
        portfolioUrl: data.portfolioUrl || null,
        collegeName: data.collegeName || null,
        collegeId: data.collegeId,
        graduationYear: data.graduationYear ?? null,
        experienceLevel: data.experienceLevel,
        commitment: data.commitment,
        recruitmentStatus: data.recruitmentStatus,
        onboarded: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    /* --- Skills junction table (normalized, not arrays) --- */
    const skillRows = await db.select().from(schema.skills);
    const skillBySlug = new Map(skillRows.map((s) => [s.slug, s]));
    const validSkills = data.skills.filter((s) => skillBySlug.has(s.slug));

    await db.delete(schema.userSkills).where(eq(schema.userSkills.userId, user.id));
    if (validSkills.length > 0) {
      await db.insert(schema.userSkills).values(
        validSkills.map((s) => ({
          userId: user.id,
          skillId: skillBySlug.get(s.slug)!.id,
          level: s.level,
          isPrimary: s.isPrimary,
        })),
      );
    }

    /* --- Roles junction table --- */
    const roleRows = await db.select().from(schema.roleTaxonomy);
    const roleBySlug = new Map(roleRows.map((r) => [r.slug, r]));
    const validRoles = data.roles.filter((r) => roleBySlug.has(r.slug));
    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, user.id));
    if (validRoles.length > 0) {
      await db.insert(schema.userRoles).values(
        validRoles.map((r) => ({
          userId: user.id,
          roleId: roleBySlug.get(r.slug)!.id,
          isPrimary: r.isPrimary,
        })),
      );
    }

    /* --- Availability + compatibility --- */
    await db
      .insert(schema.availability)
      .values({ userId: user.id, ...data.availability })
      .onConflictDoUpdate({
        target: schema.availability.userId,
        set: data.availability,
      });
    await db
      .insert(schema.compatAnswers)
      .values({ userId: user.id, ...data.compat })
      .onConflictDoUpdate({
        target: schema.compatAnswers.userId,
        set: data.compat,
      });

    const profile = await getProfile(user.id);
    return ok(profile);
  });
}

/** Helper used by other routes. */
export async function getColleges() {
  return db.select().from(schema.colleges);
}

export async function assertUserExists(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select({ id: schema.users.id }).from(schema.users).where(inArray(schema.users.id, ids));
}
