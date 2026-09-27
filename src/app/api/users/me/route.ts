import { NextRequest } from "next/server";
import { and, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { profileSchema } from "@/lib/validations";
import { getProfile } from "@/lib/queries/people";
import type { TeamDetailDTO } from "@/lib/queries/types";
import { ok, fail, withUser } from "@/lib/api";
import { PROCESSING_STALE_AFTER_MS } from "@/lib/verification/constants";
import { deleteCollegeIdImage } from "@/lib/verification/storage";
import { ROLE_TAXONOMY, SKILLS } from "@/lib/constants";

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
    const updateResult = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          idVerified: schema.users.idVerified,
          name: schema.users.name,
          collegeName: schema.users.collegeName,
          collegeId: schema.users.collegeId,
          imagePath: schema.users.idVerificationImagePath,
        })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)
        .for("update");
      if (!current) return { failure: "not-found" as const, imagePath: null };

      let skillRows = await tx.select().from(schema.skills);
      const existingSkillSlugs = new Set(skillRows.map((skill) => skill.slug));
      const missingSkills = SKILLS.filter((skill) => !existingSkillSlugs.has(skill.slug));
      if (missingSkills.length > 0) {
        await tx.insert(schema.skills).values(missingSkills).onConflictDoNothing();
        skillRows = await tx.select().from(schema.skills);
      }

      let roleRows = await tx.select().from(schema.roleTaxonomy);
      const existingRoleSlugs = new Set(roleRows.map((role) => role.slug));
      const missingRoles = ROLE_TAXONOMY.filter((role) => !existingRoleSlugs.has(role.slug));
      if (missingRoles.length > 0) {
        await tx
          .insert(schema.roleTaxonomy)
          .values(
            missingRoles.map((role) => ({
              slug: role.slug,
              name: role.name,
              description: role.description,
              skillCategories: role.skillCategories,
              sortOrder: ROLE_TAXONOMY.indexOf(role),
            })),
          )
          .onConflictDoNothing();
        roleRows = await tx.select().from(schema.roleTaxonomy);
      }

      const skillBySlug = new Map(skillRows.map((skill) => [skill.slug, skill]));
      const roleBySlug = new Map(roleRows.map((role) => [role.slug, role]));
      if (
        data.skills.some((skill) => !skillBySlug.has(skill.slug)) ||
        data.roles.some((role) => !roleBySlug.has(role.slug))
      ) {
        return { failure: "invalid-selection" as const, imagePath: null };
      }

      const resetVerification =
        current.idVerified &&
        (current.name !== data.name ||
          current.collegeName !== (data.collegeName || null) ||
+         current.collegeId !== (data.collegeId ?? null));

      await tx
        .update(schema.users)
        .set({
          ...(resetVerification
            ? {
                idVerified: false,
                idVerificationStatus: "NOT_VERIFIED" as const,
                idVerificationStartedAt: null,
                idVerifiedAt: null,
                idVerificationImagePath: null,
                idVerificationImageHash: null,
                idVerificationStudentHash: null,
                idVerificationConfidence: null,
              }
            : {}),
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

      if (resetVerification) {
        await tx
          .delete(schema.idVerificationClaims)
          .where(eq(schema.idVerificationClaims.userId, user.id));
      }
      await tx.delete(schema.userSkills).where(eq(schema.userSkills.userId, user.id));
      if (data.skills.length > 0) {
        await tx.insert(schema.userSkills).values(
          data.skills.map((skill) => ({
            userId: user.id,
            skillId: skillBySlug.get(skill.slug)!.id,
            level: skill.level,
            isPrimary: skill.isPrimary,
          })),
        );
      }

      await tx.delete(schema.userRoles).where(eq(schema.userRoles.userId, user.id));
      if (data.roles.length > 0) {
        await tx.insert(schema.userRoles).values(
          data.roles.map((role) => ({
            userId: user.id,
            roleId: roleBySlug.get(role.slug)!.id,
            isPrimary: role.isPrimary,
          })),
        );
      }

      await tx
        .insert(schema.availability)
        .values({ userId: user.id, ...data.availability })
        .onConflictDoUpdate({
          target: schema.availability.userId,
          set: data.availability,
        });
      await tx
        .insert(schema.compatAnswers)
        .values({ userId: user.id, ...data.compat })
        .onConflictDoUpdate({
          target: schema.compatAnswers.userId,
          set: data.compat,
        });

      return {
        failure: null,
        imagePath: resetVerification ? current.imagePath : null,
      };
    });
    if (updateResult.failure === "not-found") return fail("Profile not found", 404);
    if (updateResult.failure === "invalid-selection") {
      return fail("One or more selected roles or skills are unavailable.", 422);
    }
    if (updateResult.imagePath) {
      try {
        await deleteCollegeIdImage(updateResult.imagePath);
      } catch {
        console.error("[users/me] Previous private document cleanup failed.");
      }
    }

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
