import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/db/schema";

/**
 * Auth.js session augmentation — the session callback in src/lib/auth/index.ts
 * enriches session.user with HackMate fields (role, onboarded, …).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
      onboarded?: boolean;
      recruitmentStatus?: string | null;
    } & DefaultSession["user"];
  }
}
