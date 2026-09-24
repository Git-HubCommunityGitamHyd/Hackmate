import { NextRequest } from "next/server";
import { people } from "@/lib/queries/people";
import { ok, withPublic } from "@/lib/api";

/**
 * GET /api/users — people directory with structured filters.
 * Query: q, skillIds (csv), categories (csv), experience, commitment,
 *        collegeId, hackathonId, emergency=true
 */
export async function GET(req: NextRequest) {
  return withPublic(async () => {
    const p = req.nextUrl.searchParams;
    const csv = (key: string) =>
      p.get(key)?.split(",").map((s) => s.trim()).filter(Boolean) ?? undefined;

    const list = await people({
      q: p.get("q") ?? undefined,
      skillIds: csv("skillIds"),
      categories: csv("categories"),
      experienceLevel: p.get("experience") ?? undefined,
      commitment: p.get("commitment") ?? undefined,
      collegeId: p.get("collegeId") ?? undefined,
      hackathonId: p.get("hackathonId") ?? undefined,
      emergencyOnly: p.get("emergency") === "true",
      limit: Number(p.get("limit") ?? 60),
    });
    return ok(list);
  });
}
