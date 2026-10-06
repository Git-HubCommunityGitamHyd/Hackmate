-- 0001: platform admin role.
-- Users whose email is listed in the ADMIN_EMAILS env var are promoted to
-- 'admin' automatically at sign-in (see src/lib/admin.ts). Admins can post,
-- edit and delete hackathon listings. Everyone else stays a normal user.
ALTER TABLE "user" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
