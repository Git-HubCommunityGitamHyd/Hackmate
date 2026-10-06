import { NextRequest } from "next/server";
import { people } from "@/lib/queries/people";
import { ok, withPublic } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/users - people directory with structured filters.
 * Query: q, skillIds (csv), categories (csv), experience, commitment,
 *        collegeId, hackathonId, emergency=true, limit (1–100)
 *
 * Public by design (discovery works before sign-in) but rate-limited and
 * hard-capped: an anonymous scraper asking for ?limit=1000000 used to get
 * the whole user table in one response.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, { key: "users", limit: 30, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  return withPublic(async () => {
    const p = req.nextUrl.searchParams;
    const csv = (key: string) =>
      p.get(key)?.split(",").map((s) => s.trim()).filter(Boolean) ?? undefined;

    /* Clamp limit: default 60, floor 1, ceiling 100. */
    const limitRaw = Number(p.get("limit") ?? 60);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100)
      : 60;

    /* UUID-shaped filters must actually be UUIDs, otherwise a malformed
       value would surface as a driver 500 instead of being ignored. */
    const uuidParam = (key: string) => {
      const v = p.get(key);
      return v && UUID_RE.test(v) ? v : undefined;
    };

    const list = await people({
      q: p.get("q") ?? undefined,
      skillIds: csv("skillIds"),
      categories: csv("categories"),
      experienceLevel: p.get("experience") ?? undefined,
      commitment: p.get("commitment") ?? undefined,
      collegeId: uuidParam("collegeId"),
      hackathonId: uuidParam("hackathonId"),
      emergencyOnly: p.get("emergency") === "true",
      limit,
    });
    return ok(list);
  });
}
