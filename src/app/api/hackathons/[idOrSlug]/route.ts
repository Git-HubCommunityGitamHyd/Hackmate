import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { getHackathonBySlugOrId } from "@/lib/queries/hackathons";
import { people } from "@/lib/queries/people";
import { listTeams } from "@/lib/queries/teams";
import { hackathonSchema } from "@/lib/validations";
import { ok, fail, withPublic, withAdmin, requireUser } from "@/lib/api";

/**
 * GET /api/hackathons/:idOrSlug — the Hackathon Hub payload:
 * event info + people looking for teams + teams recruiting + viewer context.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  return withPublic(async () => {
    const { idOrSlug } = await params;
    const hackathon = await getHackathonBySlugOrId(idOrSlug);
    if (!hackathon) return fail("Hackathon not found", 404);

    const viewer = await requireUser();
    const viewerId = viewer?.id ?? null;

    const [peopleLooking, teamsRecruiting] = await Promise.all([
      people({ hackathonId: hackathon.id, limit: 40 }),
      listTeams({ hackathonId: hackathon.id, recruiting: true }, viewerId),
    ]);

    /* Roles still missing across all recruiting teams → "roles in demand". */
    const roleDemand = new Map<string, number>();
    for (const team of teamsRecruiting) {
      for (const role of team.openRoles) {
        roleDemand.set(role, (roleDemand.get(role) ?? 0) + 1);
      }
    }

    let myTeam: Awaited<ReturnType<typeof listTeams>>[number] | null = null;
    if (viewerId) {
      const { getUserTeamForHackathon } = await import("@/lib/queries/context");
      const mine = await getUserTeamForHackathon(viewerId, hackathon.id);
      if (mine) {
        const detail = await listTeams({ hackathonId: hackathon.id }, null);
        myTeam = detail.find((t) => t.id === mine.teamId) ?? null;
      }
    }

    return ok({
      hackathon: {
        ...hackathon,
        startsAt: hackathon.startsAt.toISOString(),
        endsAt: hackathon.endsAt.toISOString(),
        registrationDeadline: hackathon.registrationDeadline?.toISOString() ?? null,
        createdAt: hackathon.createdAt.toISOString(),
      },
      peopleLooking,
      teamsRecruiting,
      roleDemand: [...roleDemand.entries()]
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count),
      myTeam,
      viewerId,
    });
  });
}

/** POST /api/hackathons/:idOrSlug — mark me as "looking for a team" for this event. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { idOrSlug } = await params;

  const hackathon = await getHackathonBySlugOrId(idOrSlug);
  if (!hackathon) return fail("Hackathon not found", 404);

  const body = await req.json().catch(() => ({}));
  const roleSlug = body.roleSlug as string | undefined;
  let roleId: string | null = null;
  if (roleSlug) {
    const [role] = await db
      .select({ id: schema.roleTaxonomy.id })
      .from(schema.roleTaxonomy)
      .where(eq(schema.roleTaxonomy.slug, roleSlug))
      .limit(1);
    roleId = role?.id ?? null;
  }

  await db
    .insert(schema.hackathonProfiles)
    .values({
      userId: user.id,
      hackathonId: hackathon.id,
      preferredRoleId: roleId,
      motivation: (body.motivation as string) || null,
      hasIdea: !!body.hasIdea,
      ideaBlurb: (body.ideaBlurb as string) || null,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [schema.hackathonProfiles.userId, schema.hackathonProfiles.hackathonId],
      set: {
        preferredRoleId: roleId,
        motivation: (body.motivation as string) || null,
        hasIdea: !!body.hasIdea,
        ideaBlurb: (body.ideaBlurb as string) || null,
        isActive: true,
      },
    });

  return ok({ status: "active" }, { status: 201 });
}

/** PUT /api/hackathons/:idOrSlug — edit a listing (ADMIN ONLY). */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  return withAdmin(async () => {
    const { idOrSlug } = await params;
    const hackathon = await getHackathonBySlugOrId(idOrSlug);
    if (!hackathon) return fail("Hackathon not found", 404);

    const body = await req.json();
    const parsed = hackathonSchema.safeParse(body);
    if (!parsed.success)
      return fail(parsed.error.issues[0]?.message ?? "Invalid data");
    const data = parsed.data;

    const [updated] = await db
      .update(schema.hackathons)
      .set({
        name: data.name,
        tagline: data.tagline || null,
        description: data.description || null,
        organizer: data.organizer || null,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        registrationDeadline: data.registrationDeadline
          ? new Date(data.registrationDeadline)
          : null,
        teamSizeMin: data.teamSizeMin,
        teamSizeMax: data.teamSizeMax,
        prizePool: data.prizePool || null,
        mode: data.mode,
        location: data.location || null,
        themes: data.themes,
        websiteUrl: data.websiteUrl || null,
      })
      .where(eq(schema.hackathons.id, hackathon.id))
      .returning({ id: schema.hackathons.id, slug: schema.hackathons.slug });

    return ok({ id: updated.id, slug: updated.slug });
  });
}

/** DELETE /api/hackathons/:idOrSlug — remove a listing (ADMIN ONLY).
 *  Cascades: teams, profiles, bookmarks and messages attached to it are removed. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  return withAdmin(async () => {
    const { idOrSlug } = await params;
    const hackathon = await getHackathonBySlugOrId(idOrSlug);
    if (!hackathon) return fail("Hackathon not found", 404);

    await db
      .delete(schema.hackathons)
      .where(eq(schema.hackathons.id, hackathon.id));

    return ok({ deleted: hackathon.id });
  });
}
