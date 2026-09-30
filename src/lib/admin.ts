import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import type { UserRole } from "@/lib/db/schema";

/**
 * Admin access control.
 *
 * HOW ADMIN WORKS
 * ---------------
 * 1. Set ADMIN_EMAILS in .env.local / Vercel env — a comma-separated list:
 *      ADMIN_EMAILS=you@college.edu,club@college.edu
 * 2. Sign in with any of those emails (GitHub OAuth account with that email,
 *    or that email's magic link).
 * 3. HackMate promotes the account to role='admin' automatically at sign-in
 *    (and lazily on the next session read, so existing users get promoted too).
 * 4. Admins can post, edit and delete hackathons from /hackathons/new and /admin.
 *
 * Manual fallback (e.g. promoting someone later via SQL):
 *   UPDATE "user" SET role = 'admin' WHERE email = 'you@college.edu';
 * Demote:
 *   UPDATE "user" SET role = 'user' WHERE email = '…';
 */

/** Parse ADMIN_EMAILS into a normalized list. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/** Promote the user to admin if their email is allow-listed. Idempotent. */
export async function promoteIfAdminEmail(
  userId: string,
  email?: string | null,
): Promise<void> {
  if (!isAdminEmail(email)) return;
  await db
    .update(schema.users)
    .set({ role: "admin" })
    .where(eq(schema.users.id, userId));
}

/** Read a user's role straight from the database (source of truth). */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const [row] = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return row?.role ?? null;
}

/** True when the signed-in user is an admin (checks DB, not just session). */
export async function isSignedInAdmin(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false;
  return (await getUserRole(userId)) === "admin";
}
