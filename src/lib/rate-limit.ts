import type { NextRequest } from "next/server";

/**
 * Lightweight in-memory rate limiter (fixed window).
 *
 * Good enough for a single-instance deployment and for local dev; it blocks
 * the cheap abuse vectors (scraping the public directory, hammering search,
 * brute-forcing the dev sign-in). For multi-instance serverless (Vercel),
 * swap the Map for Upstash Redis (@upstash/ratelimit) - the call signature
 * stays identical.
 *
 * Usage:
 *   const rl = rateLimit(req, { key: "users", limit: 30, windowMs: 60_000 });
 *   if (!rl.ok) return tooManyRequests(rl.retryAfterSec);
 */

interface Bucket {
  count: number;
  resetAt: number;
}

/** key -> bucket. Grows bounded: cleaned lazily on every check. */
const buckets = new Map<string, Bucket>();

const MAX_TRACKED = 10_000;

function clientKey(req: NextRequest): string {
  /* Behind Vercel/NGINX the real client IP is in x-forwarded-for (first hop). */
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
}

export function rateLimit(
  req: NextRequest,
  opts: { key: string; limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const id = `${opts.key}:${clientKey(req)}`;

  /* Lazy GC: drop expired buckets; hard-cap tracked keys. */
  if (buckets.size > MAX_TRACKED) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(id);
  if (!existing || existing.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterSec: 0, remaining: opts.limit - 1 };
  }

  existing.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count > opts.limit) {
    return { ok: false, retryAfterSec, remaining: 0 };
  }
  return { ok: true, retryAfterSec: 0, remaining: opts.limit - existing.count };
}

/** Standard 429 body with the Retry-After hint. */
export function tooManyRequests(retryAfterSec: number) {
  return Response.json(
    { error: "Too many requests. Slow down and try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
