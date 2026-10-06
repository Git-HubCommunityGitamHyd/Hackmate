import { NextRequest } from "next/server";
import { getProfile } from "@/lib/queries/people";
import { ok, fail, isUuid, withPublic } from "@/lib/api";

/** GET /api/users/:id - public profile with badges, history, teammate graph. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPublic(async () => {
    const { id } = await params;
    /* Malformed ids must produce a clean 404, never reach Postgres. */
    if (!isUuid(id)) return fail("User not found", 404);
    const profile = await getProfile(id);
    if (!profile) return fail("User not found", 404);
    /* Don't leak private email/links to strangers. */
    const { idVerificationStatus: _status, ...publicProfile } = profile;
    return ok({ ...publicProfile, email: undefined });
  });
}
