# HackMate — Security Report (what was implemented and tested)

## 1. Security controls in the codebase

### HTTP security headers (`next.config.ts`)
Every response ships with:
- **Content-Security-Policy** — `default-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`;
  `unsafe-eval` only in development (Turbopack HMR needs it, production drops it);
  `connect-src` limited to self + https/wss for Pusher chat.
- **Strict-Transport-Security** — `max-age=63072000; includeSubDomains; preload`
- **X-Frame-Options: DENY** and CSP `frame-ancestors 'none'` (clickjacking)
- **X-Content-Type-Options: nosniff** (MIME sniffing)
- **Referrer-Policy: strict-origin-when-cross-origin`
- **Permissions-Policy** — camera, microphone, geolocation, interest-cohort all disabled

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

### GitHub contributions proxy (`/api/github-contributions`)
- New with the profile contribution calendar. Username is validated against
  `^[a-zA-Z0-9-]{1,39}$` (400 otherwise — injection and traversal payloads
  included), rate-limited 30/min/IP, 6-hour in-memory cache per username,
  8s upstream timeout, and upstream errors surface as a clean 502 with no
  internal detail. The upstream (default
  `github-contributions-api.jogruber.de/v4`) is swappable via
  `GITHUB_CONTRIB_API`.

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
- `pentest.py` — auth enforcement, authorization semantics, injection probes
  (SQLi strings, `pg_sleep` timing attack, XSS reflection, SSTI `{{7*7}}` /
  `${7*7}`, path traversal), security header verification, PII/enum checks,
  pagination abuse, rate-limit tripwire.
- `api-verify.py` — API contract verification against the live dev server.
- `vlm-audit.py` — visual audit of rendered pages.
- `report.json` — machine-readable results.

**Latest run: 37 pass, 0 fail, 1 warning.**

Highlights of what the suite verified:
- Unauthenticated calls to bookmarks, notifications, matches and team member
  removal all return 401.
- All five security headers present.
- SQL injection payloads (`' OR '1'='1`, `1; DROP TABLE users--`,
  `'); SELECT pg_sleep(5)--`) do not crash or delay the app; path traversal and
  template injection probes are inert.
- Idea-first team names are not reflected as HTML (XSS).
- Search rate limit trips (429 observed).
- Malformed and unknown UUIDs produce 4xx, never 500.
- Method enforcement (PUT on attendance, PATCH on reviews rejected).
- Directory responses contain no email/PII and respect row caps.

Findings found and fixed during testing:
1. Malformed UUIDs reached Postgres and caused 500s -> fixed centrally via `isUuid`.
2. Internal error details could reach clients -> replaced with generic 500 + server-side logging.
3. Search and the public directory had no rate limit -> limiter added.
4. Demo login flag mismatch made the route 404 while the button showed -> fixed; the remaining warning is intentional: `ALLOW_DEMO_LOGIN` must stay unset in production.

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
