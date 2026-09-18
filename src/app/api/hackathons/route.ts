import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { listHackathons } from "@/lib/queries/hackathons";
import { hackathonSchema } from "@/lib/validations";
import { ok, fail, withAdmin, withPublic } from "@/lib/api";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** GET /api/hackathons — list with filters (public). */
export async function GET(req: NextRequest) {
  return withPublic(async () => {
    const params = req.nextUrl.searchParams;
    return listHackathons({
      q: params.get("q") ?? undefined,
      mode: (params.get("mode") as any) ?? undefined,
      status: (params.get("status") as any) ?? undefined,
    });
  });
}

/** POST /api/hackathons — create a hackathon listing (ADMIN ONLY).
 *  Admins are accounts whose email is listed in ADMIN_EMAILS — see src/lib/admin.ts. */
export async function POST(req: NextRequest) {
  return withAdmin(async (user) => {
    const body = await req.json();
    const parsed = hackathonSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

    const data = parsed.data;
    let slug = slugify(data.name);
    const [existing] = await db
      .select({ id: schema.hackathons.id })
      .from(schema.hackathons)
      .where(eq(schema.hackathons.slug, slug))
      .limit(1);
    if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const [created] = await db
      .insert(schema.hackathons)
      .values({
        slug,
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
        createdBy: user.id,
      })
      .returning();

    return ok({ id: created.id, slug: created.slug }, { status: 201 });
  });
}
