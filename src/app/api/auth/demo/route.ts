import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { adminEmails, isAdminEmail } from "@/lib/admin";

/**
 * DEV-ONLY quick sign-in — enabled only when ALLOW_DEMO_LOGIN=true.
 *
 * No demo personas anymore: this signs you in as YOUR OWN dev account —
 * the first email listed in ADMIN_EMAILS (or dev@hackmate.local when unset).
 * The account is created on the fly if missing and is always promoted to
 * admin locally, so you can test posting hackathons without OAuth/Resend
 * credentials.
 *
 * In production this env var is unset → route is disabled (404).
 */
const DEV_FALLBACK_EMAIL = "dev@hackmate.local";

export async function POST(req: Request) {
  if (process.env.ALLOW_DEMO_LOGIN !== "true") {
    return NextResponse.json({ error: "Dev quick sign-in is disabled" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const email = (
    (body.email as string | undefined) ?? adminEmails()[0] ?? DEV_FALLBACK_EMAIL
  ).toLowerCase();

  let [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(schema.users)
      .values({
        email,
        name: "Local Developer",
        emailVerified: new Date(),
        onboarded: false,
      })
      .returning();

    /* Same bootstrap the real createUser event performs. */
    await db
      .insert(schema.availability)
      .values({ userId: user.id })
      .onConflictDoNothing();
    await db
      .insert(schema.compatAnswers)
      .values({ userId: user.id })
      .onConflictDoNothing();
  }

  /* Dev quick sign-in is always an admin locally (that's its purpose). */
  if (user.role !== "admin") {
    await db
      .update(schema.users)
      .set({ role: "admin" })
      .where(eq(schema.users.id, user.id));
    user = { ...user, role: "admin" };
  }

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(schema.sessions).values({ sessionToken, userId: user.id, expires });

  const cookieStore = await cookies();
  cookieStore.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  return NextResponse.json({
    ok: true,
    userId: user.id,
    name: user.name,
    email: user.email,
    isAdmin: isAdminEmail(email) || email === DEV_FALLBACK_EMAIL,
  });
}
