import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";

/** Fetch a user's full matching signal (skills, roles, availability, compat). */
export async function getUserSignal(userId: string) {
  const [userRow] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!userRow) return null;

  const [skillRows, roleRows, availRows, compatRows] = await Promise.all([
    db
      .select({
        skillId: schema.userSkills.skillId,
        level: schema.userSkills.level,
        isPrimary: schema.userSkills.isPrimary,
        slug: schema.skills.slug,
        name: schema.skills.name,
        category: schema.skills.category,
      })
      .from(schema.userSkills)
      .innerJoin(schema.skills, eq(schema.userSkills.skillId, schema.skills.id))
      .where(eq(schema.userSkills.userId, userId)),
    db
      .select({
        roleId: schema.userRoles.roleId,
        isPrimary: schema.userRoles.isPrimary,
        slug: schema.roleTaxonomy.slug,
        name: schema.roleTaxonomy.name,
      })
      .from(schema.userRoles)
      .innerJoin(
        schema.roleTaxonomy,
        eq(schema.userRoles.roleId, schema.roleTaxonomy.id),
      )
      .where(eq(schema.userRoles.userId, userId)),
    db
      .select()
      .from(schema.availability)
      .where(eq(schema.availability.userId, userId))
      .limit(1),
    db
      .select()
      .from(schema.compatAnswers)
      .where(eq(schema.compatAnswers.userId, userId))
      .limit(1),
  ]);

  const avail = availRows[0];
  return {
    user: userRow,
    skills: skillRows,
    roles: roleRows,
    availability: {
      weekends: avail?.weekends ?? true,
      evenings: avail?.evenings ?? true,
      overnight: avail?.overnight ?? false,
      remoteOnly: avail?.remoteOnly ?? false,
      willingToTravel: avail?.willingToTravel ?? true,
      hoursPerWeek: avail?.hoursPerWeek ?? 20,
    },
    compat: compatRows[0] ?? null,
    emergencyAvailable:
      !!userRow.emergencyAvailableUntil &&
      userRow.emergencyAvailableUntil > new Date(),
  };
}

/** Is this user already in a team for the given hackathon? */
export async function getUserTeamForHackathon(userId: string, hackathonId: string) {
  const rows = await db
    .select({
      teamId: schema.teams.id,
      teamName: schema.teams.name,
      isAdmin: schema.teamMembers.isAdmin,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
    .where(
      and(
        eq(schema.teamMembers.userId, userId),
        eq(schema.teams.hackathonId, hackathonId),
        ne(schema.teams.status, "disbanded"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// tiny helper to avoid importing ne everywhere
import { ne } from "drizzle-orm";

/** Active teams recruiting in upcoming/ongoing hackathons. */
export const recruitingTeamsFilter = () =>
  and(
    eq(schema.teams.status, "recruiting"),
    ne(schema.hackathons.status, "completed"),
  );

/** People open to being found right now. */
export const findablePeopleFilter = () =>
  or(
    eq(schema.users.recruitmentStatus, "looking"),
    eq(schema.users.recruitmentStatus, "partially_formed"),
    gt(schema.users.emergencyAvailableUntil, new Date()),
  );

export const iso = (d: Date | string | null): string =>
  d instanceof Date ? d.toISOString() : (d ?? new Date(0).toISOString());
