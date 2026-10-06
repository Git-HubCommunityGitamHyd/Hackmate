import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { adminEmails, isAdminEmail } from "@/lib/admin";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * DEV-ONLY quick sign-in - enabled only when ALLOW_DEMO_LOGIN=true.
 *
 * Accepts both ALLOW_DEMO_LOGIN and NEXT_PUBLIC_ALLOW_DEMO_LOGIN so the
 * server flag and the client-side button gate never disagree: the login
 * card renders the button from NEXT_PUBLIC_ALLOW_DEMO_LOGIN, and this
 * route previously checked only ALLOW_DEMO_LOGIN - a .env carrying just
 * the public var showed a button that 404'd on click.
 *
 * Signs you in as YOUR OWN dev account - the first email listed in
 * ADMIN_EMAILS (or dev@hackmate.local when unset). The account is
 * created on the fly if missing and is always promoted to admin
 * locally, so you can test posting hackathons without OAuth/Resend
 * credentials.
 *
 * SECURITY: the request body is IGNORED. This route can never be used
 * to impersonate an arbitrary user - even with the dev flags on, a
 * forged {"email": "victim@..."} body signs in as the dev admin
 * account and nothing else. Rate-limited per IP, and the cross-origin
 * mutation guard in proxy.ts rejects it from any other page.
 *
 * In production both env vars are unset → route is disabled (404).
 */
const DEV_FALLBACK_EMAIL = "dev@hackmate.local";

export async function POST(req: NextRequest) {
  const demoEnabled =
    process.env.ALLOW_DEMO_LOGIN === "true" ||
    process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === "true";

  if (!demoEnabled) {
    return NextResponse.json({ error: "Dev quick sign-in is disabled" }, { status: 404 });
  }

  const rl = rateLimit(req, { key: "auth-demo", limit: 10, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  /* The body is deliberately NOT read: the dev account is fixed. */
  const email = (adminEmails()[0] ?? DEV_FALLBACK_EMAIL).toLowerCase();

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
    /* Mirrors Auth.js: secure only when the request actually arrived
       over https (directly or via a forwarding proxy). A hard "true"
       would drop the cookie on local http production-mode runs. */
    secure:
      req.headers.get("x-forwarded-proto") === "https" ||
      new URL(req.url).protocol === "https:",
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
