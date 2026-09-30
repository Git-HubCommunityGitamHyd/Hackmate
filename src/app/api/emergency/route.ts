import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { emergencySchema } from "@/lib/validations";
import { ok, withUser } from "@/lib/api";

/**
 * POST /api/emergency — "Hackathon starts in 18 hours, our backend dev
 * dropped out." Marks you immediately available with boosted ranking.
 * Auto-expires via cron + lazy timestamp checks in every ranking query.
 */
export async function POST(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json().catch(() => ({}));
    const parsed = emergencySchema.safeParse(body);
    if (!parsed.success) return ok({ error: "Invalid payload" }, { status: 422 });

    const { enabled, hours } = parsed.data;

    if (!enabled) {
      await db
        .update(schema.users)
        .set({ emergencyAvailableUntil: null, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id));
      return ok({ emergencyAvailable: false });
    }

    const until = new Date(Date.now() + hours * 60 * 60 * 1000);
    await db
      .update(schema.users)
      .set({
        emergencyAvailableUntil: until,
        recruitmentStatus: "looking",
        activelyLooking: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    await db.insert(schema.notifications).values({
      userId: user.id,
      type: "system",
      title: `Emergency mode ON for ${hours}h`,
      body: "You'll be boosted in team searches until it expires. Good luck!",
      link: "/discover",
    });

    return ok({ emergencyAvailable: true, until: until.toISOString() });
  });
}

/** GET /api/emergency — my current emergency status. */
export async function GET() {
  return withUser(async (user) => {
    const [row] = await db
      .select({ until: schema.users.emergencyAvailableUntil })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);
    const until = row?.until ?? null;
    const active = !!until && until > new Date();
    return ok({ emergencyAvailable: active, until: until?.toISOString() ?? null });
  });
}
