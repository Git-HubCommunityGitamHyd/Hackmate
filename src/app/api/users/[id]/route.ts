import { NextRequest } from "next/server";
import { getProfile } from "@/lib/queries/people";
import { ok, fail, withPublic } from "@/lib/api";

/** GET /api/users/:id — public profile with badges, history, teammate graph. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPublic(async () => {
    const { id } = await params;
    const profile = await getProfile(id);
    if (!profile) return fail("User not found", 404);
    /* Don't leak private email/links to strangers. */
    return ok({ ...profile, email: undefined });
  });
}
