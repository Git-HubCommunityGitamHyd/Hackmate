import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { authConfig, providers } from "./config";
import { importGithubData } from "./github";
import { isAdminEmail, promoteIfAdminEmail } from "@/lib/admin";

/**
 * Auth.js v5 — full server config.
 *
 *  - GitHub OAuth for developers (imports repos/languages/contributions)
 *  - Email magic link via Resend for designers/PMs/pitchers
 *  - Database sessions via the Drizzle adapter (CockroachDB)
 *  - NO Google, NO Meta — by product decision.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers, // full set: GitHub + Resend (the edge config is GitHub-only)
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  events: {
    async createUser({ user }) {
      // New user bootstrap: availability row + welcome notification.
      if (!user.id) return;
      await db
        .insert(schema.availability)
        .values({ userId: user.id })
        .onConflictDoNothing();
      await db
        .insert(schema.compatAnswers)
        .values({ userId: user.id })
        .onConflictDoNothing();
      await db.insert(schema.notifications).values({
        userId: user.id,
        type: "system",
        title: "Welcome to HackMate 👋",
        body: "Complete your profile so teams can find you — skills, availability and commitment take 2 minutes.",
        link: "/profile/edit",
      });
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Import GitHub data on OAuth sign-in (repos, languages, activity).
      if (account?.provider === "github" && account.access_token && user.id) {
        try {
          await importGithubData(user.id, account.access_token, profile as any);
        } catch (err) {
          console.error("[auth] GitHub import failed (non-blocking):", err);
        }
      }
      // ADMIN_EMAILS allow-list: promote to admin at sign-in (idempotent).
      if (user.id && isAdminEmail(user.email)) {
        try {
          await promoteIfAdminEmail(user.id, user.email);
        } catch (err) {
          console.error("[auth] admin promotion failed (non-blocking):", err);
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        const rows = await db
          .select({
            onboarded: schema.users.onboarded,
            recruitmentStatus: schema.users.recruitmentStatus,
            email: schema.users.email,
            role: schema.users.role,
          })
          .from(schema.users)
          .where(eq(schema.users.id, user.id))
          .limit(1);

        let role = rows[0]?.role ?? "user";
        // Lazy promotion: users created before ADMIN_EMAILS was configured
        // get promoted on their next session read, not just at sign-in.
        if (role !== "admin" && isAdminEmail(rows[0]?.email)) {
          try {
            await promoteIfAdminEmail(user.id, rows[0]?.email);
            role = "admin";
          } catch {
            /* non-blocking */
          }
        }

        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            onboarded: rows[0]?.onboarded ?? false,
            recruitmentStatus: rows[0]?.recruitmentStatus ?? null,
            role,
          },
        };
      }
      return session;
    },
  },
});
