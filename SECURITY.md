# HackMate - Security Report (what was implemented and tested)

## 1. Security controls in the codebase

### HTTP security headers (`next.config.ts`)
Every response ships with:
- **Content-Security-Policy** - `default-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`;
  `unsafe-eval` only in development (Turbopack HMR needs it, production drops it);
  `connect-src` limited to self + https/wss for Pusher chat.
- **Strict-Transport-Security** - `max-age=63072000; includeSubDomains; preload`
- **X-Frame-Options: DENY** and CSP `frame-ancestors 'none'` (clickjacking)
- **X-Content-Type-Options: nosniff** (MIME sniffing)
- **Referrer-Policy: strict-origin-when-cross-origin`
- **Permissions-Policy** - camera, microphone, geolocation, interest-cohort all disabled

### Authentication and sessions
- Auth.js v5 with **database sessions** (Drizzle adapter), not JWTs in cookies.
- `src/proxy.ts` protects `/` and all private routes: signed-out visitors are
  redirected to `/login` (which is why the sign-in page is the hero page). The
  proxy deliberately only checks cookie presence; real session validation always
  happens server-side via `auth()` in route handlers and server components, so
  a forged/stale cookie gets you nothing.
- `requireUser` / `withUser` / `withAdmin` helpers enforce 401 (signed out) and
  403 (not admin, role checked in the DB) consistently across every API route.
- Admin access is an email allow-list (`ADMIN_EMAILS`) evaluated at sign-in.

### Input validation
- **Zod 4 schemas** on every write endpoint: profile, teams, join requests,
  invites, tasks, results, verification uploads. Enums for commitment,
  experience, recruitment status, work style; length caps; URL format checks;
  skill/role arrays bounded (25 skills, 6 roles).
- **UUID guard** (`isUuid` in `lib/api.ts`): malformed ids return a clean 404
  instead of reaching Postgres and 500-ing. This was a real pentest finding.

### Injection resistance
- All database access goes through **Drizzle ORM parameterized queries**; the
  free-text search parser emits structured filters, never concatenated SQL.
- React auto-escaping plus CSP covers reflected XSS (verified by the suite).

### Rate limiting (`lib/rate-limit.ts`)
- Per-IP fixed-window limiter (x-forwarded-for aware, lazy GC, capped key set)
  applied to the public directory, search, the dev sign-in route and the
  GitHub-contributions proxy; returns 429 with Retry-After. Single-instance
  deployments are covered out of the box; the module documents a drop-in
  swap to Upstash Redis for serverless.
- **Track-record endpoints** (merged from the team, now hardened):
  `POST /api/attendance` 30/min/IP, `POST /api/reviews` 20/min/IP (reviews
  are the cheapest reputation-brigading vector), GET endpoints 60/min/IP,
  and `GET /api/find-equal` 12/min/IP because it runs the match engine and
  fans out profile queries (see the query-amplifier note below).

### GitHub contributions proxy (`/api/github-contributions`)
- New with the profile contribution calendar. Username is validated against
  `^[a-zA-Z0-9-]{1,39}$` (400 otherwise - injection and traversal payloads
  included), rate-limited 30/min/IP, 6-hour in-memory cache per username,
  8s upstream timeout, and upstream errors surface as a clean 502 with no
  internal detail. The upstream (default
  `github-contributions-api.jogruber.de/v4`) is swappable via
  `GITHUB_CONTRIB_API`.

### Track-record endpoints (attendance / reviews / cancellations / find-equal)
- Merged from teammate PRs and then hardened to the same bar as the rest
  of the API:
  - **Auth on everything except find-equal** (which only exposes public
    directory data): `requireUser()` with 401s, verified by the suite.
  - **IDOR guards**: attendance/reviews/cancellations for another user are
    readable ONLY by active teammates (shared non-disbanded team),
    verified with stranger/self probes returning 403/200.
  - **Business-rule guards**: self-marking attendance and self-reviews are
    rejected (400); reviews only allowed after the hackathon starts; both
    reviewer and reviewee must share an active team for that hackathon.
  - **UUID validation on query strings**: `?userId=not-a-uuid` returns 404
    instead of the raw Postgres "invalid input syntax" 500 the endpoints
    shipped with (a real finding - fixed in the HTTP edge of all three).
  - **Error sanitization**: entrypoints wrap the (unit-testable) core logic
    in try/catch and return a generic 500, matching `withUser` semantics.
  - **Query-amplifier cap in find-equal**: each scored candidate costs one
    `getProfile` call (~7 queries); unbounded, one request could fire 700+
    queries. Scoring is now capped at the 24 karma-nearest candidates.

### Error hygiene
- `withUser`/`withPublic`/`withAdmin` catch all thrown errors, log the full
  detail server-side only, and return a generic 500 message. No stack traces,
  schema names or env details leak to clients.
- Wrong HTTP methods are rejected with 405; unknown resources 404; conflicts
  (e.g. joining a second team in the same hackathon) 409 with a readable message.

### Data minimization
- The public people directory returns no emails or other PII fields, and is
  capped (limit clamped to 100, invalid limit falls back to 60).
- College ID documents go to a **private** Vercel Blob store, OCR service calls
  are authenticated with a shared Bearer secret, and verification decisions
  store outcomes, not the raw documents.
- Vercel Cron requests are authenticated with `CRON_SECRET`.

## 2. Penetration testing

Automated suite in `scripts/pentest/`:
- `pentest.py` - auth enforcement, authorization semantics, injection probes
  (SQLi strings, `pg_sleep` timing attack, XSS reflection, SSTI `{{7*7}}` /
  `${7*7}`, path traversal), security header verification, PII/enum checks,
  pagination abuse, rate-limit tripwire.
- `api-verify.py` - API contract verification against the live dev server.
- `vlm-audit.py` - visual audit of rendered pages.
- `report.json` - machine-readable results.

**Latest run: 61 pass, 0 fail, 1 warning.**

Highlights of what the suite verified:
- Unauthenticated calls to bookmarks, notifications, matches, attendance,
  reviews and cancellations all return 401.
- All five security headers present.
- SQL injection payloads (`' OR '1'='1`, `1; DROP TABLE users--`,
  `'); SELECT pg_sleep(5)--`) do not crash or delay the app; path traversal and
  template injection probes are inert.
- Idea-first team names are not reflected as HTML (XSS).
- Search and find-equal rate limits trip (429 observed).
- Malformed and unknown UUIDs produce 4xx, never 500 - including on the
  new track-record endpoints (`?userId=not-a-uuid` etc.).
- Method enforcement (PUT on attendance, PATCH on reviews rejected).
- Directory responses contain no email/PII and respect row caps.
- Track-record IDOR: a stranger's attendance/reviews/cancellations are
  403, your own are 200; self-review and self-attendance are 400;
  reviews with rating 99 are 422; find-equal validates and rate-limits.

Findings found and fixed during testing:
1. Malformed UUIDs reached Postgres and caused 500s -> fixed centrally via `isUuid`.
2. Internal error details could reach clients -> replaced with generic 500 + server-side logging.
3. Search and the public directory had no rate limit -> limiter added.
4. Demo login flag mismatch made the route 404 while the button showed -> fixed; the remaining warning is intentional: `ALLOW_DEMO_LOGIN` must stay unset in production.
5. **Merged teammate code shipped three raw-500 holes**: `?userId=<garbage>` on
   attendance/reviews/cancellations hit Postgres directly (invalid-uuid 500),
   none of the three had rate limits, and find-equal could fan out 700+ profile
   queries per request -> UUID guards + rate limits + scoring cap added; all
   covered by new pentest section 9 (61 checks total).
6. **Solo-team result recording 500'd** (`values() must be called with at least
   one value` - Drizzle insert of an empty notification list) -> insert guarded;
   also made badge re-awarding idempotent (`onConflictDoNothing`) under the new
   `(user_id, badge_id)` unique index so repeat teammates can't 500 the route.

## 3. Remaining recommendations
- Keep `ALLOW_DEMO_LOGIN` / `NEXT_PUBLIC_ALLOW_DEMO_LOGIN` unset in production (the dev seed script is the only place they are used).
- On multi-instance hosting, swap the in-memory limiter for Upstash Redis (same call signature).
- Rotate `AUTH_SECRET` if it was ever committed anywhere public.
- Run `bun audit` (or `npm audit`) after every dependency bump.
- Enforce HTTPS at the hosting layer (Vercel does this by default; HSTS is already sent by the app).

Re-run the suite any time with the dev server up:

```bash
python3 scripts/pentest/pentest.py   # writes scripts/pentest/report.json
```
