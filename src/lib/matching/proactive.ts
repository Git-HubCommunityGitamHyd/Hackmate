import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sendEmailWithResult, emailTemplates } from "@/lib/email";
import { getTeamMatchesForUser } from "@/lib/queries/teams";
import { cosineSimilarity, hasUsableStoredEmbedding } from "./semantic";

const DIGEST_THRESHOLD = 5;
const DIGEST_INTERVAL_MS = 72 * 60 * 60 * 1000;
const DIGEST_CLAIM_TIMEOUT_MS = 15 * 60 * 1000;
const MATCH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MONTHLY_EMAIL_QUOTA = Number(process.env.MATCH_EMAIL_MONTHLY_QUOTA ?? 3000);
const INVITE_EXPIRY_MS = Number(process.env.INVITE_EXPIRY_DAYS ?? 7) * 24 * 60 * 60 * 1000;

export async function cleanupStaleInvitations() {
  const now = new Date();
  const pending = await db
    .select({
      id: schema.invites.id,
      createdAt: schema.invites.createdAt,
      expiresAt: schema.invites.expiresAt,
      teamStatus: schema.teams.status,
      targetSize: schema.teams.targetSize,
      hackathonStatus: schema.hackathons.status,
      hackathonEndsAt: schema.hackathons.endsAt,
      memberCount: sql<number>`count(${schema.teamMembers.userId})`,
      recipientMemberCount: sql<number>`count(case when ${schema.teamMembers.userId} = ${schema.invites.userId} then 1 end)`,
    })
    .from(schema.invites)
    .leftJoin(schema.teams, eq(schema.invites.teamId, schema.teams.id))
    .leftJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
    .leftJoin(schema.teamMembers, eq(schema.teamMembers.teamId, schema.invites.teamId))
    .where(eq(schema.invites.status, "pending"))
    .groupBy(
      schema.invites.id,
      schema.invites.createdAt,
      schema.invites.expiresAt,
      schema.teams.status,
      schema.teams.targetSize,
      schema.hackathons.status,
      schema.hackathons.endsAt,
    );

  let expired = 0;
  for (const invite of pending) {
    const deadline = invite.expiresAt ?? new Date(invite.createdAt.getTime() + INVITE_EXPIRY_MS);
    const invalid =
      deadline <= now ||
      invite.teamStatus !== "recruiting" ||
      invite.memberCount >= (invite.targetSize ?? 0) ||
      invite.hackathonStatus === "completed" ||
      (!!invite.hackathonEndsAt && invite.hackathonEndsAt <= now);
    if (!invalid && invite.recipientMemberCount <= 0) continue;

    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: schema.invites.id })
        .from(schema.invites)
        .where(and(eq(schema.invites.id, invite.id), eq(schema.invites.status, "pending")))
        .for("update");
      if (!locked) return;
      await tx.update(schema.invites).set({
        status: invite.teamStatus === "recruiting" && deadline <= now ? "expired" : "revoked",
        expiresAt: invite.expiresAt ?? deadline,
      }).where(eq(schema.invites.id, invite.id));
      await tx.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.inviteId, invite.id));
      expired += 1;
    });
  }
  return expired;
}

export async function getActiveMatches(userId: string) {
  const now = new Date();
  return db
    .select({
      id: schema.userMatches.id,
      teamId: schema.userMatches.teamId,
      teamName: schema.teams.name,
      hackathonId: schema.hackathons.id,
      hackathonName: schema.hackathons.name,
      roleId: schema.userMatches.roleId,
      roleName: schema.roleTaxonomy.name,
      score: schema.userMatches.score,
      reasons: schema.userMatches.reasons,
      createdAt: schema.userMatches.createdAt,
    })
    .from(schema.userMatches)
    .innerJoin(schema.teams, eq(schema.userMatches.teamId, schema.teams.id))
    .leftJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
    .innerJoin(schema.roleTaxonomy, eq(schema.userMatches.roleId, schema.roleTaxonomy.id))
    .innerJoin(schema.teamRolesNeeded, and(
      eq(schema.teamRolesNeeded.teamId, schema.userMatches.teamId),
      eq(schema.teamRolesNeeded.roleId, schema.userMatches.roleId),
    ))
    .where(and(
      eq(schema.userMatches.userId, userId),
      eq(schema.userMatches.active, true),
      eq(schema.teams.status, "recruiting"),
      sql`(${schema.teamRolesNeeded.expiresAt} is null or ${schema.teamRolesNeeded.expiresAt} > ${now})`,
      sql`(${schema.hackathons.endsAt} is null or ${schema.hackathons.endsAt} > ${now})`,
    ))
    .orderBy(desc(schema.userMatches.score), desc(schema.userMatches.createdAt));
}

async function claimQuota(month: string): Promise<boolean> {
  await db.insert(schema.emailQuota).values({ month }).onConflictDoNothing();
  const rows = await db
    .update(schema.emailQuota)
    .set({ successfulSends: sql`${schema.emailQuota.successfulSends} + 1`, updatedAt: new Date() })
    .where(and(eq(schema.emailQuota.month, month), lt(schema.emailQuota.successfulSends, MONTHLY_EMAIL_QUOTA)))
    .returning({ month: schema.emailQuota.month });
  return rows.length > 0;
}

async function releaseQuota(month: string) {
  await db
    .update(schema.emailQuota)
    .set({ successfulSends: sql`greatest(${schema.emailQuota.successfulSends} - 1, 0)`, updatedAt: new Date() })
    .where(eq(schema.emailQuota.month, month));
}

async function processDigests() {
  const now = new Date();
  const claimCutoff = new Date(now.getTime() - DIGEST_CLAIM_TIMEOUT_MS);
  const month = now.toISOString().slice(0, 7);
  const users = await db.select({
    id: schema.users.id,
    email: schema.users.email,
    lastDigestAt: schema.users.lastMatchDigestAt,
  }).from(schema.users).where(and(
    eq(schema.users.openToOpportunities, true),
    eq(schema.users.matchDigestEmails, true),
  ));
  let sent = 0;

  for (const user of users) {
    if (user.lastDigestAt && now.getTime() - user.lastDigestAt.getTime() < DIGEST_INTERVAL_MS) continue;
    const pendingInvites = await db.select({
      id: schema.invites.id,
    }).from(schema.invites)
      .innerJoin(schema.teams, eq(schema.invites.teamId, schema.teams.id))
      .leftJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
      .where(and(
        eq(schema.invites.userId, user.id),
        eq(schema.invites.status, "pending"),
        isNull(schema.invites.digestSentAt),
        or(isNull(schema.invites.digestClaimedAt), lt(schema.invites.digestClaimedAt, claimCutoff)),
        eq(schema.teams.status, "recruiting"),
        sql`(${schema.invites.expiresAt} is null or ${schema.invites.expiresAt} > ${now})`,
        sql`(${schema.hackathons.endsAt} is null or ${schema.hackathons.endsAt} > ${now})`,
      ));
    const pending = await db.select({
      id: schema.userMatches.id,
      roleName: schema.roleTaxonomy.name,
    }).from(schema.userMatches)
      .innerJoin(schema.roleTaxonomy, eq(schema.userMatches.roleId, schema.roleTaxonomy.id))
      .innerJoin(schema.teams, eq(schema.userMatches.teamId, schema.teams.id))
      .leftJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
      .innerJoin(schema.teamRolesNeeded, and(
        eq(schema.teamRolesNeeded.teamId, schema.userMatches.teamId),
        eq(schema.teamRolesNeeded.roleId, schema.userMatches.roleId),
      ))
      .where(and(
        eq(schema.userMatches.userId, user.id),
        eq(schema.userMatches.active, true),
        eq(schema.teams.status, "recruiting"),
        sql`(${schema.teamRolesNeeded.expiresAt} is null or ${schema.teamRolesNeeded.expiresAt} > ${now})`,
        sql`(${schema.hackathons.endsAt} is null or ${schema.hackathons.endsAt} > ${now})`,
        isNull(schema.userMatches.digestSentAt),
        or(isNull(schema.userMatches.digestClaimedAt), lt(schema.userMatches.digestClaimedAt, claimCutoff)),
      ));
    if (pending.length < DIGEST_THRESHOLD && pendingInvites.length === 0) continue;

    const claimed = await db.update(schema.userMatches)
      .set({ digestClaimedAt: now })
      .where(and(
        eq(schema.userMatches.userId, user.id),
        eq(schema.userMatches.active, true),
        isNull(schema.userMatches.digestSentAt),
        or(isNull(schema.userMatches.digestClaimedAt), lt(schema.userMatches.digestClaimedAt, claimCutoff)),
      )).returning({ id: schema.userMatches.id });
    const claimedInvites = await db.update(schema.invites)
      .set({ digestClaimedAt: now })
      .where(and(
        eq(schema.invites.userId, user.id),
        eq(schema.invites.status, "pending"),
        inArray(schema.invites.id, pendingInvites.map((invite) => invite.id)),
        isNull(schema.invites.digestSentAt),
        or(isNull(schema.invites.digestClaimedAt), lt(schema.invites.digestClaimedAt, claimCutoff)),
      )).returning({ id: schema.invites.id });
    if (claimed.length < DIGEST_THRESHOLD && claimedInvites.length === 0) {
      await db.update(schema.userMatches).set({ digestClaimedAt: null }).where(inArray(schema.userMatches.id, claimed.map((match) => match.id)));
      continue;
    }

    const [currentUser] = await db.select({
      openToOpportunities: schema.users.openToOpportunities,
      matchDigestEmails: schema.users.matchDigestEmails,
      email: schema.users.email,
    }).from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
    if (!currentUser?.openToOpportunities || !currentUser.matchDigestEmails) {
      await db.update(schema.userMatches).set({ digestClaimedAt: null }).where(inArray(schema.userMatches.id, claimed.map((m) => m.id)));
      await db.update(schema.invites).set({ digestClaimedAt: null }).where(inArray(schema.invites.id, claimedInvites.map((i) => i.id)));
      continue;
    }

    if (!(await claimQuota(month))) {
      console.warn("[matching:quota-exhausted]", { month, userId: user.id });
      await db.update(schema.userMatches).set({ digestClaimedAt: null }).where(inArray(schema.userMatches.id, claimed.map((m) => m.id)));
      await db.update(schema.invites).set({ digestClaimedAt: null }).where(inArray(schema.invites.id, claimedInvites.map((i) => i.id)));
      continue;
    }

    const groups = [...new Map(pending.map((m) => [m.roleName, (pending.filter((p) => p.roleName === m.roleName).length)])).entries()]
      .map(([role, count]) => ({ role, count }));
    const delivery = await sendEmailWithResult({
      to: currentUser.email,
      ...emailTemplates.matchDigest(groups, claimedInvites.length),
      idempotencyKey: `match-digest:${user.id}:${[...claimed.map((match) => match.id), ...claimedInvites.map((invite) => invite.id)].sort().join(",")}`,
    });
    if (delivery.delivered) {
      await db.update(schema.userMatches).set({ digestSentAt: now, digestProviderId: delivery.providerMessageId }).where(inArray(schema.userMatches.id, claimed.map((m) => m.id)));
      await db.update(schema.invites).set({ digestSentAt: now, digestProviderId: delivery.providerMessageId }).where(inArray(schema.invites.id, claimedInvites.map((i) => i.id)));
      await db.update(schema.users).set({ lastMatchDigestAt: now }).where(eq(schema.users.id, user.id));
      sent += 1;
    } else {
      await releaseQuota(month);
      await db.update(schema.userMatches).set({ digestClaimedAt: null }).where(inArray(schema.userMatches.id, claimed.map((m) => m.id)));
      await db.update(schema.invites).set({ digestClaimedAt: null }).where(inArray(schema.invites.id, claimedInvites.map((i) => i.id)));
    }
  }
  return sent;
}

export async function runProactiveMatching() {
  const now = new Date();
  const users = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.openToOpportunities, true));
  let created = 0;

  await db.update(schema.userMatches).set({ active: false }).where(or(
    eq(schema.userMatches.active, true),
    lt(schema.userMatches.createdAt, new Date(now.getTime() - MATCH_RETENTION_MS)),
  ));

  for (const user of users) {
    const candidates = await getTeamMatchesForUser(user.id, 500);
    const teamIds = candidates.map((candidate) => candidate.id);
    if (teamIds.length === 0) continue;
    const memberRows = await db.select({ teamId: schema.teamMembers.teamId })
      .from(schema.teamMembers).where(and(eq(schema.teamMembers.userId, user.id), inArray(schema.teamMembers.teamId, teamIds)));
    const memberTeams = new Set(memberRows.map((row) => row.teamId));
    const [userEmbedding] = await db.select({
      vector: schema.users.profileEmbedding,
      modelVersion: schema.users.profileEmbeddingModel,
      taxonomyVersion: schema.users.profileEmbeddingTaxonomy,
      preparationVersion: schema.users.profileEmbeddingPreparation,
      status: schema.users.profileEmbeddingStatus,
    }).from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
    const roles = await db.select({
      teamId: schema.teamRolesNeeded.teamId,
      roleId: schema.teamRolesNeeded.roleId,
      expiresAt: schema.teamRolesNeeded.expiresAt,
      embedding: schema.teamRolesNeeded.embedding,
      embeddingModel: schema.teamRolesNeeded.embeddingModel,
      embeddingTaxonomy: schema.teamRolesNeeded.embeddingTaxonomy,
      embeddingPreparation: schema.teamRolesNeeded.embeddingPreparation,
      embeddingStatus: schema.teamRolesNeeded.embeddingStatus,
    }).from(schema.teamRolesNeeded)
      .innerJoin(schema.teams, eq(schema.teamRolesNeeded.teamId, schema.teams.id))
      .leftJoin(schema.hackathons, eq(schema.teams.hackathonId, schema.hackathons.id))
      .where(and(
        inArray(schema.teamRolesNeeded.teamId, teamIds),
        eq(schema.teams.status, "recruiting"),
        sql`(${schema.hackathons.endsAt} is null or ${schema.hackathons.endsAt} > ${now})`,
      ));
    const roleByTeam = new Map<string, typeof roles>();
    for (const role of roles) roleByTeam.set(role.teamId, [...(roleByTeam.get(role.teamId) ?? []), role]);

    for (const candidate of candidates) {
      if (memberTeams.has(candidate.id)) continue;
      for (const role of roleByTeam.get(candidate.id) ?? []) {
        if (role.expiresAt && role.expiresAt <= now) continue;
        const roleEmbedding = {
          vector: role.embedding,
          modelVersion: role.embeddingModel,
          taxonomyVersion: role.embeddingTaxonomy,
          preparationVersion: role.embeddingPreparation,
          status: role.embeddingStatus,
        } as const;
        const semantic = hasUsableStoredEmbedding(userEmbedding) && hasUsableStoredEmbedding(roleEmbedding)
          ? cosineSimilarity(userEmbedding.vector, roleEmbedding.vector) ?? 0
          : null;
        const matchScore = semantic === null
          ? candidate.matchScore ?? 0
          : Math.round((candidate.matchScore ?? 0) * 0.7 + Math.max(0, semantic) * 30);
        const matchReasons = semantic === null
          ? candidate.matchReasons ?? []
          : [...(candidate.matchReasons ?? []), "Semantic profile and role relevance"];
        const existing = await db.select({ id: schema.userMatches.id }).from(schema.userMatches)
          .where(and(eq(schema.userMatches.userId, user.id), eq(schema.userMatches.teamId, candidate.id), eq(schema.userMatches.roleId, role.roleId))).limit(1);
        if (existing.length > 0) {
          await db.update(schema.userMatches).set({
            active: true, score: matchScore, reasons: matchReasons, evaluatedAt: now, digestClaimedAt: null,
          }).where(eq(schema.userMatches.id, existing[0].id));
        } else {
          const inserted = await db.insert(schema.userMatches).values({
            userId: user.id, teamId: candidate.id, roleId: role.roleId, score: matchScore,
            reasons: matchReasons, evaluatedAt: now,
          }).onConflictDoNothing().returning({ id: schema.userMatches.id });
          if (inserted.length === 0) continue;
          await db.insert(schema.notifications).values({
            userId: user.id, type: "system", title: "New team match found",
            body: `A recruiting team matches your profile. Explore your active matches to learn more.`,
            link: "/matches",
          });
          created += 1;
        }
      }
    }
  }
  const sent = await processDigests();
  return { created, digestsSent: sent };
}
