import { NextRequest } from "next/server";
import { getTeamMatchesForUser, getPeopleMatchesForTeam } from "@/lib/queries/teams";
import { ok, fail, withUser } from "@/lib/api";

/**
 * GET /api/matches — deterministic matching for the signed-in viewer.
 *   ?type=teams            → ranked teams for me
 *   ?type=people&teamId=…  → gap-driven people for my team (admin)
 */
export async function GET(req: NextRequest) {
  return withUser(async (user) => {
    const p = req.nextUrl.searchParams;
    const type = p.get("type") ?? "teams";

    if (type === "teams") {
      return ok(await getTeamMatchesForUser(user.id, 12));
    }
    if (type === "people") {
      const teamId = p.get("teamId");
      if (!teamId) return fail("teamId required for people matching");
      return ok(await getPeopleMatchesForTeam(teamId, 8));
    }
    return fail("type must be teams|people");
  });
}
