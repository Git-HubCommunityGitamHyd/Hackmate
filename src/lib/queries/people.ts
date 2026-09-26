import { and, desc, eq, gt, inArray, ne, or, sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { findablePeopleFilter } from "./context";
import type { PersonCardDTO, ProfileDTO } from "./types";
import type { SkillCategory } from "@/lib/db/schema";

export interface PeopleFilters {
  q?: string;
  skillIds?: string[];
  categories?: string[];
  experienceLevel?: string;
  commitment?: string;
  collegeId?: string;
  hackathonId?: string; // people with an active hackathon profile for this event
  excludeTeamHackathonId?: string; // exclude people already on a team here
  emergencyOnly?: boolean;
  limit?: number;
}

export async function people(filters: PeopleFilters = {}): Promise<PersonCardDTO[]> {
  const where: (SQLWrapper | undefined)[] = [];
  if (filters.emergencyOnly) {
    where.push(gt(schema.users.emergencyAvailableUntil, new Date()));
  } else {
    where.push(findablePeopleFilter());
  }
  if (filters.experienceLevel) where.push(eq(schema.users.experienceLevel, filters.experienceLevel as any));
  if (filters.commitment) where.push(eq(schema.users.commitment, filters.commitment as any));
  if (filters.collegeId) where.push(eq(schema.users.collegeId, filters.collegeId));
  if (filters.q) {
    /* lower() LIKE lower() instead of ILIKE: identical behavior and
       guaranteed to run on CockroachDB as well as Postgres. */
    const like = `%${filters.q}%`;
    where.push(
      or(
        sql`lower(${schema.users.name}) like lower(${like})`,
        sql`lower(${schema.users.bio}) like lower(${like})`,
        sql`lower(${schema.users.githubUsername}) like lower(${like})`,
      )!,
    );
  }

  let userRows = await db
    .select({
      u: schema.users,
      collegeName: sql<string | null>`coalesce(${schema.users.collegeName}, ${schema.colleges.name})`,
    })
    .from(schema.users)
    .leftJoin(schema.colleges, eq(schema.users.collegeId, schema.colleges.id))
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(schema.users.emergencyAvailableUntil), desc(schema.users.createdAt))
    .limit(filters.limit ?? 60);

  let userIds = userRows.map((r) => r.u.id);

  /* Hackathon-profile filter */
  if (filters.hackathonId && userIds.length > 0) {
    const profileRows = await db
      .select({ userId: schema.hackathonProfiles.userId })
      .from(schema.hackathonProfiles)
      .where(
        and(
          eq(schema.hackathonProfiles.hackathonId, filters.hackathonId),
          eq(schema.hackathonProfiles.isActive, true),
          inArray(schema.hackathonProfiles.userId, userIds),
        ),
      );
    const activeIds = new Set(profileRows.map((p) => p.userId));
    userRows = userRows.filter((r) => activeIds.has(r.u.id));
    userIds = userRows.map((r) => r.u.id);
  }

  /* Exclude people already on a team in this hackathon */
  if (filters.excludeTeamHackathonId && userIds.length > 0) {
    const busyRows = await db
      .select({ userId: schema.teamMembers.userId })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(
        and(
          eq(schema.teams.hackathonId, filters.excludeTeamHackathonId),
          ne(schema.teams.status, "disbanded"),
          inArray(schema.teamMembers.userId, userIds),
        ),
      );
    const busyIds = new Set(busyRows.map((b) => b.userId));
    userRows = userRows.filter((r) => !busyIds.has(r.u.id));
    userIds = userRows.map((r) => r.u.id);
  }

  if (userIds.length === 0) return [];

  /* Skills + roles for all candidates in 2 queries */
  const [skillRows, roleRows, availRows] = await Promise.all([
    db
      .select({
        userId: schema.userSkills.userId,
        skillId: schema.userSkills.skillId,
        level: schema.userSkills.level,
        slug: schema.skills.slug,
        name: schema.skills.name,
        category: schema.skills.category,
      })
      .from(schema.userSkills)
      .innerJoin(schema.skills, eq(schema.userSkills.skillId, schema.skills.id))
      .where(inArray(schema.userSkills.userId, userIds)),
    db
      .select({
        userId: schema.userRoles.userId,
        roleId: schema.userRoles.roleId,
        isPrimary: schema.userRoles.isPrimary,
        slug: schema.roleTaxonomy.slug,
        name: schema.roleTaxonomy.name,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roleTaxonomy, eq(schema.userRoles.roleId, schema.roleTaxonomy.id))
      .where(inArray(schema.userRoles.userId, userIds)),
    db
      .select()
      .from(schema.availability)
      .where(inArray(schema.availability.userId, userIds)),
  ]);

  const skillsByUser = new Map<string, { skillId: string; level: number; slug: string; name: string; category: string }[]>();
  for (const s of skillRows) {
    skillsByUser.set(s.userId, [...(skillsByUser.get(s.userId) ?? []), s]);
  }
  const rolesByUser = new Map<string, { slug: string; name: string; isPrimary: boolean }[]>();
  for (const r of roleRows) {
    rolesByUser.set(r.userId, [...(rolesByUser.get(r.userId) ?? []), { slug: r.slug, name: r.name, isPrimary: r.isPrimary }]);
  }
  const availByUser = new Map(availRows.map((a) => [a.userId, a]));

  let list: PersonCardDTO[] = userRows.map(({ u, collegeName }) => ({
    id: u.id,
    name: u.name ?? "Anonymous",
    idVerified: u.idVerified,
    image: u.image,
    bio: u.bio,
    collegeName: collegeName ?? null,
    experienceLevel: u.experienceLevel ?? null,
    commitment: u.commitment ?? null,
    recruitmentStatus: u.recruitmentStatus ?? null,
    emergencyAvailable: !!u.emergencyAvailableUntil && u.emergencyAvailableUntil > new Date(),
    githubUsername: u.githubUsername,
    topSkills: (skillsByUser.get(u.id) ?? [])
      .sort((a, b) => b.level - a.level)
      .slice(0, 6)
      .map((s) => ({ id: s.skillId, slug: s.slug, name: s.name, category: s.category as SkillCategory, level: s.level })),
    roles: (rolesByUser.get(u.id) ?? []).map((r) => ({ id: r.slug, slug: r.slug, name: r.name, isPrimary: r.isPrimary })),
    hoursPerWeek: availByUser.get(u.id)?.hoursPerWeek ?? 20,
  }));

  /* Skill/category filters (post-filter after batch fetch — keeps it simple + correct) */
  if (filters.skillIds && filters.skillIds.length > 0) {
    const wanted = new Set(filters.skillIds);
    list = list.filter((p) =>
      (skillsByUser.get(p.id) ?? []).some((s) => wanted.has(s.skillId)),
    );
  }
  if (filters.categories && filters.categories.length > 0) {
    const cats = new Set(filters.categories);
    list = list.filter((p) =>
      (skillsByUser.get(p.id) ?? []).some((s) => cats.has(s.category)),
    );
  }

  return list;
}

/* ------------------------------------------------------------------ */
/* Full profile: badges, history, previous-team graph                  */
/* ------------------------------------------------------------------ */

export async function getProfile(userId: string): Promise<ProfileDTO | null> {
  /* NOTE: fetch the user directly — do NOT reuse people() filters here,
     otherwise members whose status became team_full / not_looking would
     404 on their own profile. */
  const [userRow] = await db
    .select({
      u: schema.users,
      collegeName: sql<string | null>`coalesce(${schema.users.collegeName}, ${schema.colleges.name})`,
    })
    .from(schema.users)
    .leftJoin(schema.colleges, eq(schema.users.collegeId, schema.colleges.id))
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!userRow) return null;
  const u = userRow.u;

  const [badgeRows, historyRows, availRows, compatRows, roleRows] = await Promise.all([
    db
      .select({
        slug: schema.badges.slug,
        name: schema.badges.name,
        icon: schema.badges.icon,
        category: schema.badges.category,
        hackathonName: schema.hackathons.name,
      })
      .from(schema.userBadges)
      .innerJoin(schema.badges, eq(schema.userBadges.badgeId, schema.badges.id))
      .leftJoin(schema.hackathons, eq(schema.userBadges.hackathonId, schema.hackathons.id))
      .where(eq(schema.userBadges.userId, userId)),
    db
      .select({
        hackathonName: schema.hackathons.name,
        hackathonId: schema.hackathons.id,
        projectName: schema.hackathonResults.projectName,
        placement: schema.hackathonResults.placement,
        repoUrl: schema.hackathonResults.repoUrl,
        technologies: schema.hackathonResults.technologies,
        teamId: schema.hackathonResults.teamId,
      })
      .from(schema.hackathonResults)
      .innerJoin(schema.hackathons, eq(schema.hackathonResults.hackathonId, schema.hackathons.id))
      .where(eq(schema.hackathonResults.userId, userId))
      .orderBy(desc(schema.hackathons.startsAt)),
    db.select().from(schema.availability).where(eq(schema.availability.userId, userId)).limit(1),
    db.select().from(schema.compatAnswers).where(eq(schema.compatAnswers.userId, userId)).limit(1),
    db
      .select({
        userId: schema.userRoles.userId,
        slug: schema.roleTaxonomy.slug,
        name: schema.roleTaxonomy.name,
        isPrimary: schema.userRoles.isPrimary,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roleTaxonomy, eq(schema.userRoles.roleId, schema.roleTaxonomy.id))
      .where(eq(schema.userRoles.userId, userId)),
  ]);

  /* Teammates per historical team → previous-team graph */
  const teamIds = historyRows.map((h) => h.teamId).filter((t): t is string => !!t);
  const teammateRows =
    teamIds.length > 0
      ? await db
          .select({
            teamId: schema.teamMembers.teamId,
            userId: schema.users.id,
            name: schema.users.name,
            image: schema.users.image,
          })
          .from(schema.teamMembers)
          .innerJoin(schema.users, eq(schema.teamMembers.userId, schema.users.id))
          .where(inArray(schema.teamMembers.teamId, teamIds))
      : [];
  const teammatesByTeam = new Map<string, string[]>();
  for (const t of teammateRows) {
    if (t.userId === userId) continue;
    teammatesByTeam.set(t.teamId, [...(teammatesByTeam.get(t.teamId) ?? []), t.name ?? "Anonymous"]);
  }

  const prevTeammateCounts = new Map<string, { name: string; image: string | null; count: number }>();
  for (const t of teammateRows) {
    if (t.userId === userId) continue;
    const existing = prevTeammateCounts.get(t.userId);
    prevTeammateCounts.set(t.userId, {
      name: t.name ?? "Anonymous",
      image: t.image,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const [skillRows] = await Promise.all([
    db
      .select({
        userId: schema.userSkills.userId,
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
  ]);

  const avail = availRows[0];

  const skillsByUser = new Map<string, { skillId: string; level: number; slug: string; name: string; category: string }[]>();
  for (const s of skillRows) {
    skillsByUser.set(s.userId, [...(skillsByUser.get(s.userId) ?? []), s]);
  }
  const rolesByUserLocal = new Map<string, { slug: string; name: string; isPrimary: boolean }[]>();
  for (const r of roleRows) {
    rolesByUserLocal.set(r.userId, [...(rolesByUserLocal.get(r.userId) ?? []), { slug: r.slug, name: r.name, isPrimary: r.isPrimary }]);
  }

  return {
    id: u.id,
    name: u.name ?? "Anonymous",
    idVerified: u.idVerified,
    idVerificationStatus: u.idVerificationStatus,
    image: u.image,
    bio: u.bio,
    collegeName: userRow.collegeName ?? null,
    experienceLevel: u.experienceLevel ?? null,
    commitment: u.commitment ?? null,
    recruitmentStatus: u.recruitmentStatus ?? null,
    emergencyAvailable: !!u.emergencyAvailableUntil && u.emergencyAvailableUntil > new Date(),
    githubUsername: u.githubUsername,
    topSkills: (skillsByUser.get(u.id) ?? [])
      .sort((a, b) => b.level - a.level)
      .slice(0, 6)
      .map((s) => ({ id: s.skillId, slug: s.slug, name: s.name, category: s.category as SkillCategory, level: s.level })),
    roles: (rolesByUserLocal.get(u.id) ?? []).map((r) => ({ id: r.slug, slug: r.slug, name: r.name, isPrimary: r.isPrimary })),
    hoursPerWeek: availRows[0]?.hoursPerWeek ?? 20,
    email: u.email,
    username: u.username,
    linkedinUrl: u.linkedinUrl,
    linkedinData: (u.linkedinData as ProfileDTO["linkedinData"]) ?? null,
    portfolioUrl: u.portfolioUrl,
    githubData: (u.githubData as ProfileDTO["githubData"]) ?? null,
    availability: avail
      ? {
          weekends: avail.weekends,
          evenings: avail.evenings,
          overnight: avail.overnight,
          remoteOnly: avail.remoteOnly,
          willingToTravel: avail.willingToTravel,
          hoursPerWeek: avail.hoursPerWeek,
        }
      : null,
    compat: compatRows[0]
      ? {
          workStyle: compatRows[0].workStyle ?? null,
          comfortablePresenting: compatRows[0].comfortablePresenting,
          openToIdeaSwaps: compatRows[0].openToIdeaSwaps,
        }
      : null,
    skills: skillRows.map((s) => ({
      id: s.skillId,
      slug: s.slug,
      name: s.name,
      category: s.category as SkillCategory,
      level: s.level,
      isPrimary: s.isPrimary,
    })),
    badges: badgeRows.map((b) => ({
      slug: b.slug,
      name: b.name,
      icon: b.icon,
      category: b.category,
      hackathonName: b.hackathonName ?? null,
    })),
    history: historyRows.map((h) => ({
      hackathonName: h.hackathonName,
      hackathonId: h.hackathonId,
      projectName: h.projectName,
      placement: h.placement,
      repoUrl: h.repoUrl,
      technologies: h.technologies ?? [],
      teamId: h.teamId,
      teammates: teammatesByTeam.get(h.teamId ?? "") ?? [],
    })),
    previousTeammates: [...prevTeammateCounts.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    graduationYear: u.graduationYear ?? null,
  };
}
