import { NextRequest, NextResponse } from "next/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET /api/github-contributions?username=octocat
 *
 * Serves the GitHub contribution calendar for the profile page's
 * GithubCalendar component.
 *
 * Why a proxy instead of calling the upstream from the browser:
 *  1. The component's original upstream (github-contributions-api.deno.dev)
 *     died with Deno Deploy Classic in July 2026 - a same-origin route makes
 *     the upstream swappable via env instead of another client deploy.
 *  2. Keeps the upstream under our rate limit (public route, 30 req/min/IP)
 *     and caches responses for 6 hours per username so a popular profile
 *     page costs at most one upstream call per half-day.
 *
 * Upstream format expected (jogruber-v4-compatible):
 *   { total: number, contributions: [{ date: "YYYY-MM-DD", count: number }] }
 * Output shape (GitHub-graph-compatible, what the calendar renders):
 *   { totalContributions, contributions: ContributionDay[][] (weeks x days) }
 *
 * Set GITHUB_CONTRIB_API to point at any jogruber-v4-compatible endpoint.
 */

const UPSTREAM =
  process.env.GITHUB_CONTRIB_API ??
  "https://github-contributions-api.jogruber.de/v4";

const USERNAME_RE = /^[a-zA-Z0-9-]{1,39}$/;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type FlatDay = { date: string; count: number };
type UpstreamResponse = { total?: number; contributions?: FlatDay[] };

type ContributionDay = {
  date: string;
  contributionCount: number;
  contributionLevel:
    | "NONE"
    | "FIRST_QUARTILE"
    | "SECOND_QUARTILE"
    | "THIRD_QUARTILE"
    | "FOURTH_QUARTILE";
};

const cache = new Map<string, { at: number; data: unknown }>();

function levelFor(count: number, max: number): ContributionDay["contributionLevel"] {
  if (count <= 0) return "NONE";
  if (max <= 0) return "NONE";
  const q = count / max;
  if (q <= 0.25) return "FIRST_QUARTILE";
  if (q <= 0.5) return "SECOND_QUARTILE";
  if (q <= 0.75) return "THIRD_QUARTILE";
  return "FOURTH_QUARTILE";
}

/** Flat day list -> weeks-of-days array, weeks starting on Sunday. */
function toWeeks(days: FlatDay[]): {
  totalContributions: number;
  contributions: ContributionDay[][];
} {
  const byDate = new Map(days.map((d) => [d.date, d.count] as const));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  if (days.length === 0) return { totalContributions: 0, contributions: [] };

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(sorted[0]!.date + "T00:00:00Z");
  const last = new Date(sorted[sorted.length - 1]!.date + "T00:00:00Z");

  /* Walk back to the Sunday of the first week. */
  const cursor = new Date(first);
  cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());

  let max = 0;
  for (const d of days) max = Math.max(max, d.count);

  const weeks: ContributionDay[][] = [];
  let week: ContributionDay[] = [];
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    const count = byDate.get(key) ?? 0;
    week.push({
      date: key,
      contributionCount: count,
      contributionLevel: levelFor(count, max),
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (week.length > 0) weeks.push(week);

  return { totalContributions: total, contributions: weeks };
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, { key: "gh-contrib", limit: 30, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const username = req.nextUrl.searchParams.get("username") ?? "";
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const upstreamRes = await fetch(`${UPSTREAM}/${encodeURIComponent(username)}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    clearTimeout(timer);

    if (!upstreamRes.ok) {
      return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
    }

    const json = (await upstreamRes.json()) as UpstreamResponse;
    const flat = Array.isArray(json.contributions) ? json.contributions : [];
    const data = toWeeks(flat);
    cache.set(username, { at: Date.now(), data });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}
