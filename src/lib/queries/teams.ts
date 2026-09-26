import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { analyzeComposition, type CandidateSignal, type MemberSignal } from "@/lib/matching/composition";
import { scorePersonForTeam, HOURS_BY_COMMITMENT } from "@/lib/matching/engine";
import { getUserSignal, getUserTeamForHackathon, iso } from "./context";
import { ROLE_TAXONOMY } from "@/lib/constants";
import type { TeamCardDTO, TeamDetailDTO } from "./types";

/* ------------------------------------------------------------------ */
/* Shared aggregation helpers                                          */
/* ------------------------------------------------------------------ */

async function teamAggregates(teamIds: string[]) {
  if (teamIds.length === 0)
    return { membersByTeam: new Map<string, any[]>(), wantedByTeam: new Map<string, any[]>(), neededByTeam: new Map<string, any[]>() };

  const [memberRows, wantedRows, neededRows] = await Promise.all([
    db
      .select({
        teamId: schema.teamMembers.teamId,
        userId: schema.teamMembers.userId,
        name: schema.users.name,
        image: schema.users.image,
        idVerified: schema.users.idVerified,
        isAdmin: schema.teamMembers.isAdmin,
        roleId: schema.teamMembers.roleId,
        experienceLevel: schema.users.experienceLevel,
        githubUsername: schema.users.githubUsername,
      })
      .from(schema.teamMembers)
      .innerJoin(schema.users, eq(schema.teamMembers.userId, schema.users.id))
      .where(inArray(schema.teamMembers.teamId, teamIds)),
    db
      .select({
        teamId: schema.teamSkillsWanted.teamId,
        skillId: schema.skills.id,
        slug: schema.skills.slug,
        name: schema.skills.name,
        category: schema.skills.category,
      })
      .from(schema.teamSkillsWanted)
      .innerJoin(schema.skills, eq(schema.teamSkillsWanted.skillId, schema.skills.id))
      .where(inArray(schema.teamSkillsWanted.teamId, teamIds)),
    db
      .select({
        teamId: schema.teamRolesNeeded.teamId,
        roleId: schema.roleTaxonomy.id,
        slug: schema.roleTaxonomy.slug,
        name: schema.roleTaxonomy.name,
        priority: schema.teamRolesNeeded.priority,
      })
      .from(schema.teamRolesNeeded)
      .innerJoin(schema.roleTaxonomy, eq(schema.teamRolesNeeded.roleId, schema.roleTaxonomy.id))
      .where(inArray(schema.teamRolesNeeded.teamId, teamIds)),
  ]);

  const membersByTeam = new Map<string, any[]>();
  for (const m of memberRows) {
    membersByTeam.set(m.teamId, [...(membersByTeam.get(m.teamId) ?? []), m]);
  }
  const wantedByTeam = new Map<string, any[]>();
  for (const w of wantedRows) {
    wantedByTeam.set(w.teamId, [...(wantedByTeam.get(w.teamId) ?? []), w]);
  }
  const neededByTeam = new Map<string, any[]>();
  for (const n of neededRows) {
    neededByTeam.set(n.teamId, [...(neededByTeam.get(n.teamId) ?? []), n]);
  }
  return { membersByTeam, wantedByTeam, neededByTeam };
}

/** Member skills for one or many teams (for covered-skill exclusion). */
async function memberSkillsForTeams(teamIds: string[]) {
  if (teamIds.length === 0) return new Map<string, { skillId: string; category: string; userId: string }[]>();
  const rows = await db
    .select({
      teamId: schema.teamMembers.teamId,
      userId: schema.userSkills.userId,
      skillId: schema.userSkills.skillId,
      category: schema.skills.category,
      level: schema.userSkills.level,
      slug: schema.skills.slug,
      name: schema.skills.name,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.userSkills, eq(schema.teamMembers.userId, schema.userSkills.userId))
    .innerJoin(schema.skills, eq(schema.userSkills.skillId, schema.skills.id))
    .where(inArray(schema.teamMembers.teamId, teamIds));
  const map = new Map<string, typeof rows>();
  for (const r of rows) map.set(r.teamId, [...(map.get(r.teamId) ?? []), r]);
  return map;
}

/* ------------------------------------------------------------------ */
/* Team list (cards)                                                   */
/* ------------------------------------------------------------------ */

export interface TeamFilters {
  hackathonId?: string;
  recruiting?: boolean;
}

export async function listTeams(
  filters: TeamFilters = {},
  viewerId?: string | null,
): Promise<TeamCardDTO[]> {
  const where = [ne(schema.teams.status, "disbanded")];
  if (filters.hackathonId) where.push(eq(schema.teams.hackathonId, filters.hackathonId));
  if (filters.recruiting) where.push(eq(schema.teams.status, "recruiting"));

  const teamRows = await db
    .select({
      t: schema.teams,
      hackathonName: schema.hackathons.name,
      hackathonSlug: schema.hackathons.slug,
      memberCount: sql<number>`(
        select count(*) from ${schema.teamMembers}
        where ${schema.teamMembers.teamId} = ${schema.teams.id}
      )`,
    })
    .from(schema.teams)
    .innerJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
    .where(and(...where))
    .orderBy(desc(schema.teams.createdAt))
    .limit(60);

  const teamIds = teamRows.map((r) => r.t.id);
  const [{ membersByTeam, wantedByTeam, neededByTeam }, skillsMap] = await Promise.all([
    teamAggregates(teamIds),
    memberSkillsForTeams(teamIds),
  ]);

  const cards: TeamCardDTO[] = teamRows.map(({ t, hackathonName, hackathonSlug, memberCount }) => {
    const members = membersByTeam.get(t.id) ?? [];
    const wanted = wantedByTeam.get(t.id) ?? [];
    const needed = neededByTeam.get(t.id) ?? [];
    const memberSkillRows = skillsMap.get(t.id) ?? [];
    const memberSkillIds = new Set(memberSkillRows.map((s) => s.skillId));
    const memberRoleIds = new Set(members.map((m) => m.roleId).filter(Boolean));

    const filledRoles = needed.filter((n) => memberRoleIds.has(n.roleId));
    const openRoles = needed
      .filter((n) => !memberRoleIds.has(n.roleId))
      .map((n) => n.name);
    const missingSkills = wanted
      .filter((w) => !memberSkillIds.has(w.skillId))
      .map((w) => w.name);

    return {
      id: t.id,
      name: t.name,
      hackathonId: t.hackathonId,
      hackathonName,
      hackathonSlug,
      ideaDomain: t.ideaDomain,
      ideaTitle: t.ideaTitle,
      ideaAnonymous: t.ideaAnonymous,
      commitment: t.commitment,
      targetSize: t.targetSize,
      memberCount: Number(memberCount),
      status: t.status,
      lookingForIdea: t.lookingForIdea,
      openRoles,
      missingSkills,
      completeness:
        needed.length === 0
          ? 100
          : Math.round((filledRoles.length / needed.length) * 100),
      memberNames: members.map((m) => m.name ?? "Anonymous"),
      createdAt: iso(t.createdAt),
    };
  });

  /* Optional viewer-aware match scoring for the whole list. */
  if (viewerId) {
    const signal = await getUserSignal(viewerId);
    if (signal) {
      const roleSlugByRoleId = new Map(ROLE_TAXONOMY.map((r) => [r.slug, r.slug]));
      const roleIdToSlug = new Map<string, string>();
      // map roleIds from needed rows
      for (const { neededByTeam: nbt } of [{ neededByTeam }]) {
        for (const [tid, roles] of nbt) {
          for (const r of roles) roleIdToSlug.set(r.roleId, r.slug);
        }
      }
      const myRoleSlugs = signal.roles.map((r) => r.slug);
      const primaryRoleSlug = signal.roles.find((r) => r.isPrimary)?.slug ?? null;
      for (const card of cards) {
        const members = membersByTeam.get(card.id) ?? [];
        const wanted = wantedByTeam.get(card.id) ?? [];
        const memberSkillRows = skillsMap.get(card.id) ?? [];
        const neededSlugs = (neededByTeam.get(card.id) ?? []).map((n) => n.slug);
        const memberRoleSlugs = members
          .map((m) => (m.roleId ? roleIdToSlug.get(m.roleId) : null))
          .filter(Boolean) as string[];
        const openRoleSlugs = neededSlugs.filter((s) => !memberRoleSlugs.includes(s));

        const result = scorePersonForTeam(
          {
            userId: viewerId,
            skills: signal.skills.map((s) => ({ skillId: s.skillId, level: s.level })),
            primaryRoleCategory: primaryRoleSlug,
            roleCategories: myRoleSlugs,
            availability: signal.availability,
            commitment: signal.user.commitment ?? null,
            experienceLevel: signal.user.experienceLevel ?? null,
            emergencyAvailable: signal.emergencyAvailable,
          },
          {
            teamId: card.id,
            commitment: card.commitment,
            hoursPerWeekExpected: HOURS_BY_COMMITMENT[card.commitment],
            memberExperience: members
              .map((m) => m.experienceLevel)
              .filter(Boolean) as any[],
            openRoles: openRoleSlugs,
            wantedSkillIds: wanted.map((w) => w.skillId),
            memberSkillIds: memberSkillRows.map((s) => s.skillId),
          },
        );
        card.matchScore = result.score;
        card.matchReasons = result.reasons;
      }
      cards.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }
  }

  return cards;
}

/* ------------------------------------------------------------------ */
/* Team detail — with full Composition Intelligence                    */
/* ------------------------------------------------------------------ */

export async function getTeamDetail(
  teamId: string,
  viewerId?: string | null,
): Promise<TeamDetailDTO | null> {
  const [teamRow] = await db
    .select({
      t: schema.teams,
      hackathonName: schema.hackathons.name,
      hackathonSlug: schema.hackathons.slug,
    })
    .from(schema.teams)
    .innerJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
    .where(eq(schema.teams.id, teamId))
    .limit(1);
  if (!teamRow) return null;
  const { t, hackathonName, hackathonSlug } = teamRow;

  const [{ membersByTeam, wantedByTeam, neededByTeam }, skillsMap] = await Promise.all([
    teamAggregates([teamId]),
    memberSkillsForTeams([teamId]),
  ]);

  const members = membersByTeam.get(teamId) ?? [];
  const wanted = wantedByTeam.get(teamId) ?? [];
  const needed = neededByTeam.get(teamId) ?? [];
  const memberSkillRows = skillsMap.get(teamId) ?? [];

  /* member detail: roles + top skills */
  const memberUserIds = members.map((m) => m.userId);
  const [memberRoleRows, memberSkillDetail] = await Promise.all([
    memberUserIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            userId: schema.userRoles.userId,
            slug: schema.roleTaxonomy.slug,
            name: schema.roleTaxonomy.name,
            isPrimary: schema.userRoles.isPrimary,
          })
          .from(schema.userRoles)
          .innerJoin(schema.roleTaxonomy, eq(schema.userRoles.roleId, schema.roleTaxonomy.id))
          .where(inArray(schema.userRoles.userId, memberUserIds)),
    memberUserIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            userId: schema.userSkills.userId,
            slug: schema.skills.slug,
            name: schema.skills.name,
            category: schema.skills.category,
            level: schema.userSkills.level,
          })
          .from(schema.userSkills)
          .innerJoin(schema.skills, eq(schema.userSkills.skillId, schema.skills.id))
          .where(inArray(schema.userSkills.userId, memberUserIds)),
  ]);

  const rolesByUser = new Map<string, { slug: string; name: string }[]>();
  for (const r of memberRoleRows) {
    rolesByUser.set(r.userId, [...(rolesByUser.get(r.userId) ?? []), { slug: r.slug, name: r.name }]);
  }
  const skillsByUser = new Map<string, { slug: string; name: string; category: string; level: number }[]>();
  for (const s of memberSkillDetail) {
    skillsByUser.set(s.userId, [...(skillsByUser.get(s.userId) ?? []), { slug: s.slug, name: s.name, category: s.category, level: s.level }]);
  }

  /* Composition analysis signals */
  const memberSignals: MemberSignal[] = members.map((m) => ({
    userId: m.userId,
    name: m.name ?? "Anonymous",
    roleSlugs: (rolesByUser.get(m.userId) ?? []).map((r) => r.slug),
    skillCategories: new Set((skillsByUser.get(m.userId) ?? []).map((s) => s.category as any)),
    availableAllThrough: true,
    commitment: null,
  }));

  /* Viewer context */
  let viewer: TeamDetailDTO["viewer"] = {
    isMember: false,
    isAdmin: false,
    hasPendingRequest: false,
    hasPendingInvite: false,
    matchScore: null,
    matchReasons: [],
  };
  let composition = analyzeComposition(
    memberSignals,
    needed.map((n) => ({ roleSlug: n.slug, priority: n.priority })),
  );

  if (viewerId) {
    const me = members.find((m) => m.userId === viewerId);
    const [requestRow] = await db
      .select({ status: schema.joinRequests.status })
      .from(schema.joinRequests)
      .where(and(eq(schema.joinRequests.teamId, teamId), eq(schema.joinRequests.userId, viewerId)))
      .limit(1);
    const [inviteRow] = await db
      .select({ status: schema.invites.status })
      .from(schema.invites)
      .where(and(eq(schema.invites.teamId, teamId), eq(schema.invites.userId, viewerId)))
      .limit(1);

    viewer = {
      isMember: !!me,
      isAdmin: !!me?.isAdmin,
      hasPendingRequest: requestRow?.status === "pending",
      hasPendingInvite: inviteRow?.status === "pending",
      matchScore: null,
      matchReasons: [],
    };

    /* Match score + gap-driven candidate recommendations (only for non-members). */
    if (!me) {
      const signal = await getUserSignal(viewerId);
      if (signal) {
        const memberRoleSlugs = members.flatMap((m) =>
          (rolesByUser.get(m.userId) ?? []).map((r) => r.slug),
        );
        const neededSlugs = needed.map((n) => n.slug);
        const openRoleSlugs = neededSlugs.filter((s) => !memberRoleSlugs.includes(s));
        const match = scorePersonForTeam(
          {
            userId: viewerId,
            skills: signal.skills.map((s) => ({ skillId: s.skillId, level: s.level })),
            primaryRoleCategory: signal.roles.find((r) => r.isPrimary)?.slug ?? null,
            roleCategories: signal.roles.map((r) => r.slug),
            availability: signal.availability,
            commitment: signal.user.commitment ?? null,
            experienceLevel: signal.user.experienceLevel ?? null,
            emergencyAvailable: signal.emergencyAvailable,
          },
          {
            teamId,
            commitment: t.commitment,
            hoursPerWeekExpected: HOURS_BY_COMMITMENT[t.commitment],
            memberExperience: members.map((m) => m.experienceLevel).filter(Boolean) as any[],
            openRoles: openRoleSlugs,
            wantedSkillIds: wanted.map((w) => w.skillId),
            memberSkillIds: memberSkillRows.map((s) => s.skillId),
          },
        );
        viewer.matchScore = match.score;
        viewer.matchReasons = match.reasons;

        /* The viewer themself as a candidate for the narrative recommendation */
        const candidate: CandidateSignal = {
          userId: viewerId,
          name: signal.user.name ?? "You",
          roleSlugs: signal.roles.map((r) => r.slug),
          topSkills: signal.skills.sort((a, b) => b.level - a.level).slice(0, 5).map((s) => s.name),
          skillCategories: new Set(signal.skills.map((s) => s.category)),
          availableAllThrough: signal.availability.hoursPerWeek >= HOURS_BY_COMMITMENT[t.commitment],
          emergencyAvailable: signal.emergencyAvailable,
          matchScore: match.score,
        };
        composition = analyzeComposition(
          memberSignals,
          needed.map((n) => ({ roleSlug: n.slug, priority: n.priority })),
          [candidate],
          hackathonName,
        );
      }
    }
  }

  /* Tasks */
  const taskRows = await db
    .select({
      task: schema.tasks,
      assigneeName: schema.users.name,
    })
    .from(schema.tasks)
    .leftJoin(schema.users, eq(schema.tasks.assigneeId, schema.users.id))
    .where(eq(schema.tasks.teamId, teamId))
    .orderBy(schema.tasks.position);

  const memberRoleIds = new Set(members.map((m) => m.roleId).filter(Boolean));
  const filledRoles = needed.filter((n) => memberRoleIds.has(n.roleId));

  return {
    id: t.id,
    name: t.name,
    hackathonId: t.hackathonId,
    hackathonName,
    hackathonSlug,
    ideaDomain: t.ideaDomain,
    ideaTitle: t.ideaTitle,
    ideaAnonymous: t.ideaAnonymous,
    commitment: t.commitment,
    targetSize: t.targetSize,
    memberCount: members.length,
    status: t.status,
    lookingForIdea: t.lookingForIdea,
    openRoles: needed.filter((n) => !memberRoleIds.has(n.roleId)).map((n) => n.name),
    missingSkills: wanted
      .filter((w) => !new Set(memberSkillRows.map((s) => s.skillId)).has(w.skillId))
      .map((w) => w.name),
    completeness:
      needed.length === 0 ? 100 : Math.round((filledRoles.length / needed.length) * 100),
    memberNames: members.map((m) => m.name ?? "Anonymous"),
    createdAt: iso(t.createdAt),
    ideaDescription: t.ideaDescription,
    chatUrl: t.chatUrl,
    repoUrl: t.repoUrl,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.name ?? "Anonymous",
      image: m.image,
      idVerified: m.idVerified,
      isAdmin: m.isAdmin,
      role: (rolesByUser.get(m.userId) ?? [])[0]
        ? {
            id: m.roleId ?? "",
            slug: (rolesByUser.get(m.userId) ?? [])[0].slug,
            name: (rolesByUser.get(m.userId) ?? [])[0].name,
          }
        : null,
      topSkills: (skillsByUser.get(m.userId) ?? [])
        .sort((a, b) => b.level - a.level)
        .slice(0, 4)
        .map((s) => ({ id: s.slug, slug: s.slug, name: s.name, category: s.category as any })),
      experienceLevel: m.experienceLevel,
      githubUsername: m.githubUsername,
    })),
    rolesNeeded: needed.map((n) => ({ slug: n.slug, name: n.name, priority: n.priority })),
    skillsWanted: wanted.map((w) => ({ id: w.skillId, slug: w.slug, name: w.name, category: w.category })),
    composition,
    viewer,
    tasks: taskRows.map(({ task, assigneeName }) => ({
      id: task.id,
      title: task.title,
      category: task.category,
      done: task.done,
      dueDate: task.dueDate ? iso(task.dueDate) : null,
      assigneeName: assigneeName ?? null,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Matches: teams for a user (SQL prefilter + TS scoring)              */
/* ------------------------------------------------------------------ */

export async function getTeamMatchesForUser(userId: string, limit = 12) {
  const signal = await getUserSignal(userId);
  if (!signal) return [];

  /* SQL prefilter: recruiting teams in non-completed hackathons whose
     wanted skills overlap the user's skills, or whose open roles overlap
     the user's roles. Cap at ~50 candidates for the TS scoring pass. */
  const mySkillIds = signal.skills.map((s) => s.skillId);
  const myRoleIds = signal.roles.map((r) => r.roleId);

  /* SQL prefilter — recruiting teams whose wanted skills overlap the user's
     skills OR whose needed roles overlap the user's roles. */
  const skillMatch =
    mySkillIds.length > 0
      ? sql`exists (
          select 1 from team_skill_wanted tw
          where tw.team_id = ${schema.teams.id}
            and tw.skill_id in (${sql.join(mySkillIds.map((id) => sql`${id}`), sql`, `)})
        )`
      : sql`false`;
  const roleMatch =
    myRoleIds.length > 0
      ? sql`exists (
          select 1 from team_role_needed tn
          where tn.team_id = ${schema.teams.id}
            and tn.role_id in (${sql.join(myRoleIds.map((id) => sql`${id}`), sql`, `)})
        )`
      : sql`false`;

  const prefiltered = await db
    .select({ teamId: schema.teams.id })
    .from(schema.teams)
    .innerJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
    .where(
      and(
        eq(schema.teams.status, "recruiting"),
        ne(schema.hackathons.status, "completed"),
        sql`(${skillMatch} or ${roleMatch})`,
      ),
    )
    .limit(50);

  const teamIds = prefiltered.map((r) => r.teamId);
  if (teamIds.length === 0) return [];

  const cards = await listTeams({ recruiting: true }, null);
  const relevant = cards.filter((c) => teamIds.includes(c.id));

  /* Score each candidate team (reuse card data + aggregates) */
  const [{ membersByTeam, wantedByTeam, neededByTeam }, skillsMap] = await Promise.all([
    teamAggregates(teamIds),
    memberSkillsForTeams(teamIds),
  ]);

  const roleIdToSlug = new Map<string, string>();
  for (const roles of neededByTeam.values()) {
    for (const r of roles) roleIdToSlug.set(r.roleId, r.slug);
  }

  const results = relevant.map((card) => {
    const members = membersByTeam.get(card.id) ?? [];
    const wanted = wantedByTeam.get(card.id) ?? [];
    const needed = neededByTeam.get(card.id) ?? [];
    const memberSkillRows = skillsMap.get(card.id) ?? [];
    const memberRoleSlugs = members
      .map((m) => (m.roleId ? roleIdToSlug.get(m.roleId) : null))
      .filter(Boolean) as string[];
    const openRoleSlugs = needed.map((n) => n.slug).filter((s) => !memberRoleSlugs.includes(s));

    const match = scorePersonForTeam(
      {
        userId,
        skills: signal.skills.map((s) => ({ skillId: s.skillId, level: s.level })),
        primaryRoleCategory: signal.roles.find((r) => r.isPrimary)?.slug ?? null,
        roleCategories: signal.roles.map((r) => r.slug),
        availability: signal.availability,
        commitment: signal.user.commitment ?? null,
        experienceLevel: signal.user.experienceLevel ?? null,
        emergencyAvailable: signal.emergencyAvailable,
      },
      {
        teamId: card.id,
        commitment: card.commitment,
        hoursPerWeekExpected: HOURS_BY_COMMITMENT[card.commitment],
        memberExperience: members.map((m) => m.experienceLevel).filter(Boolean) as any[],
        openRoles: openRoleSlugs,
        wantedSkillIds: wanted.map((w) => w.skillId),
        memberSkillIds: memberSkillRows.map((s) => s.skillId),
      },
    );
    return { ...card, matchScore: match.score, matchReasons: match.reasons, matchBreakdown: undefined };
  });

  results.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  return results.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Matches: people for a team (gap-driven recommendations)             */
/* ------------------------------------------------------------------ */

export async function getPeopleMatchesForTeam(teamId: string, limit = 8) {
  const detail = await getTeamDetail(teamId, null);
  if (!detail) return [];

  const gapSlugs = new Set([
    ...detail.composition.gaps.map((g) => g.roleSlug),
    ...detail.composition.coverages
      .filter((c) => c.coverage === "partial" && c.needed)
      .map((c) => c.roleSlug),
  ]);
  const gapCategories = new Set<string>();
  for (const slug of gapSlugs) {
    const role = ROLE_TAXONOMY.find((r) => r.slug === slug);
    role?.skillCategories.forEach((c) => gapCategories.add(c));
  }
  const wantedSkillIds = detail.skillsWanted.map((s) => s.id);

  const { people } = await import("./people");
  const candidates = await people({
    skillIds: wantedSkillIds.length > 0 ? wantedSkillIds : undefined,
    categories: gapCategories.size > 0 ? [...gapCategories] : undefined,
    excludeTeamHackathonId: detail.hackathonId,
    limit: 30,
  });

  const memberSignal = detail.members.map((m) => ({
    userId: m.userId,
    name: m.name,
    roleSlugs: m.role ? [m.role.slug] : [],
    skillCategories: new Set(m.topSkills.map((s) => s.category)),
    availableAllThrough: true,
    commitment: null,
  }));

  const hackathonName = detail.hackathonName;

  /* Score every candidate properly against the team (same engine as team↔user). */
  const memberSkillIds = detail.skillsWanted.map((s) => s.id); // wanted list
  const wantedIds = new Set(memberSkillIds);
  const openRoleSlugs = new Set(detail.composition.gaps.map((g) => g.roleSlug));
  const memberRoleSlugs = new Set(detail.members.map((m) => (m.role ? m.role.slug : null)).filter(Boolean));
  const neededButOpen = detail.rolesNeeded
    .map((r) => r.slug)
    .filter((slug) => !memberRoleSlugs.has(slug));

  const candidateSignals: CandidateSignal[] = candidates.map((c) => {
    const match = scorePersonForTeam(
      {
        userId: c.id,
        skills: c.topSkills.map((s) => ({ skillId: s.id, level: s.level ?? 3 })),
        primaryRoleCategory: c.roles.find((r) => r.isPrimary)?.slug ?? c.roles[0]?.slug ?? null,
        roleCategories: c.roles.map((r) => r.slug),
        availability: {
          weekends: true,
          evenings: true,
          overnight: c.emergencyAvailable,
          hoursPerWeek: c.hoursPerWeek,
        },
        commitment: c.commitment ?? null,
        experienceLevel: c.experienceLevel ?? null,
        emergencyAvailable: c.emergencyAvailable,
      },
      {
        teamId,
        commitment: detail.commitment,
        hoursPerWeekExpected: HOURS_BY_COMMITMENT[detail.commitment],
        memberExperience: detail.members.map((m) => m.experienceLevel).filter(Boolean) as any[],
        openRoles: neededButOpen,
        wantedSkillIds: [...wantedIds],
        memberSkillIds: [], // covered skills excluded at card level
      },
    );
    void openRoleSlugs;
    return {
      userId: c.id,
      name: c.name,
      roleSlugs: c.roles.map((r) => r.slug),
      topSkills: c.topSkills.map((s) => s.name),
      skillCategories: new Set(c.topSkills.map((s) => s.category)),
      availableAllThrough: c.hoursPerWeek >= HOURS_BY_COMMITMENT[detail.commitment],
      emergencyAvailable: c.emergencyAvailable,
      matchScore: match.score,
    };
  });

  const report = analyzeComposition(
    memberSignal,
    detail.rolesNeeded.map((r) => ({ roleSlug: r.slug, priority: r.priority })),
    candidateSignals,
    hackathonName,
  );

  const byId = new Map(candidates.map((c) => [c.id, c]));
  return report.recommendations
    .map((rec) => ({ person: byId.get(rec.userId)!, rec }))
    .filter((x) => !!x.person)
    .slice(0, limit);
}
