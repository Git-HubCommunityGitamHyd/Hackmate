# HackMate - Framework & Architecture (updated)

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | `proxy.ts` middleware convention (successor of `middleware.ts`) |
| UI runtime | React 19 | Server Components + client islands |
| Language | TypeScript 5 (strict) | Build fails on type errors |
| Styling | Tailwind CSS 4 + `tw-animate-css` | shadcn/ui-style component library in `src/components/ui` |
| Animation | framer-motion 12 + anime.js 4.5 | Kinetic text reveal, text repel, pixel canvas, fluted glass (framer); one-shot entrances, ink brush stroke, peek-window pops (anime.js) |
| Background art | GrainGradient (WebGL shader, login page) | User-supplied breathing gradient with INBUILT film grain - mounted verbatim, full-page on login, flipped 180°; blended with the ribbed wall |
| Auth | Auth.js v5 (`next-auth@5` beta) | GitHub OAuth + email magic links, database sessions via Drizzle adapter |
| Database | Drizzle ORM 0.45 + Postgres / CockroachDB | Works with local Postgres 14+ or CockroachDB Serverless (free tier) |
| Validation | Zod 4 | Every mutation body validated before it touches the DB |
| Data fetching | TanStack React Query 5 | `src/hooks/use-api.ts` |
| Realtime | Pusher Channels | Team chat; graceful fallback to 4s polling when no key is set |
| Email | Resend | Magic links + notification digests |
| File storage | Vercel Blob | Avatars/logos (public store) + college IDs (private store) |
| Charts | Recharts | Profile/track-record visuals |
| Verification service | Python microservice (`services/surya-ocr`) | OCR pipeline for college ID verification, Bearer-token authenticated |
| Package manager / runtime | Bun 1.1+ (bun.lock committed) | Also runs with Node 20+ / npm if preferred |
| Local sandbox DB | Embedded Postgres 18 (`scripts/pgbin`) | Dev-only convenience; any Postgres 14+ works, see SETUP.md |

## Architecture

### Three primary screens

1. **Discover** (`/`) - the home screen with three tabs: Hackathons, Teams, People, plus natural-language search ("need a backend dev who knows FastAPI for SIH"). Deep-linkable via `/?tab=teams`.
2. **Hackathon Hub** (`/hackathons/[slug]`) - single-event page: roles in demand, registered teams, join flow.
3. **My Team** (`/my-team`) - the team workspace: chat, task checklist, completeness meter, gap analysis, result reporting.

### Application layers

```
src/
  proxy.ts              route protection (redirects signed-out visitors to /login, the hero page)
  app/                  routes: pages + /api route handlers
  components/           ui primitives, layout (navbar/footer/command menu), feature components
  hooks/                use-api (React Query wrapper), use-toast, use-mobile
  lib/
    auth/               Auth.js v5 config, GitHub provider
    db/                 Drizzle schema + client + seed (7 migrations, drizzle/0000-0006)
    queries/            typed read layer (people, teams, hackathons, context)
    matching/           search-parser (NL query grammar), composition (gap analysis), engine (match scores)
    verification/       college ID pipeline: image, extraction, claims, matching, decision
    validations/        Zod schemas for every write endpoint
    reputation.ts       karma/badges engine (+ tests)
    rate-limit.ts       per-IP fixed-window limiter used across public endpoints
    api.ts              ok/fail/withUser/withAdmin helpers + UUID guard
  services/surya-ocr/   Python OCR microservice (Dockerfile included)
scripts/                db create/migrate/seed, demo seed, embedded-postgres bootstrap, pentest suite
```

### API surface (route handlers)

`/api/auth/*` (Auth.js + demo dev login), `/api/users`, `/api/users/me`, `/api/users/[id]`,
`/api/search`, `/api/matches`, `/api/hackathons`, `/api/hackathons/[idOrSlug]`,
`/api/teams`, `/api/teams/[id]` (+ members, requests, invites, tasks, chat, result),
`/api/bookmarks`, `/api/notifications`, `/api/reputation`, `/api/emergency`,
`/api/profile/linkedin-import`, `/api/verification`, `/api/verification/document`,
`/api/github-contributions` (rate-limited, 6h-cached proxy feeding the profile
contribution calendar; upstream configurable via `GITHUB_CONTRIB_API`),
`/api/cron`.

### Domain engines

- **Matching** - deterministic first: skill overlap, role complementarity, availability and commitment compatibility, hackathon-specific roles. NL search parses role/skill/event intent from a free-text query. Embedding/LLM upgrades can layer on later without changing the call sites.
- **Team Composition Intelligence** - `lib/matching/composition.ts` produces text coverage/gap analysis ("strong ML and frontend coverage, no backend/cloud member") surfaced in team detail and My Team.
- **Reputation** - post-hackathon results feed karma, badges and track record (`lib/reputation.ts`, tested in `reputation.test.ts`).
- **Verification** - college ID image -> OCR extraction -> claim matching -> decision, with a manual admin fallback and a private Blob store for the documents.

### Design language: Fluted Ink (final, rounds 1-12)

Near-black ink canvas (`oklch(0.11 0.004 90)`) ruled with faint vertical
flutes (1px every 11px) plus one jade bloom, frosted 5px-blur translucent
surfaces everywhere, everything DEBOSSED (deep, soft, all-INSET shadows -
nothing floats, nothing glows), and jade (`--primary`) as the single accent.
The authoritative, per-rule spec lives in `HANDOVER.md` ("THE ART SYSTEM"),
which encodes 12 rounds of user feedback - treat it as canonical:

- Login page: full-page user-supplied `GrainGradient` WebGL ground (inbuilt
  film grain ON, flipped 180 degrees) + the wide jade pixel wake
  (`CursorField`, an 11px-grid `PixelCanvas`); the sign-in pane is a clean
  frost with rAF 1:1 pointer tilt (soft spring settle on leave only).
- Every other page: the fluted wall + a whisper of film grain (0.045
  overlay) + the TINY jade pixel trail - the hero's wake scaled down so
  only about 5 to 6 pixels light around the pointer (same 11px grid,
  `radius 16`). No cursor glow, no magnet-lines, no 3D anywhere.
- Discover cards also carry a `CardPeek` hover window: a frosted panel that
  covers the card showing the hub/profile preview without leaving the grid.
- The header is a detached floating pill dock, frosted and debossed like
  every other surface.
- The login page is the hero/landing page (unauthenticated visitors are
  redirected there by `src/proxy.ts`), with the anime.js ink brush stroke
  under the headline and LinkedIn copy for the designers/PMs sign-in track.

### Client-side performance architecture (r12)

- `PixelCanvas` (both the login wake and the ambient trail) never scans the
  grid: an AWAKE LIST holds cells that are lit or still decaying, a box
  test wakes cells near the pointer each frame, and only awake cells are
  simulated and drawn. When the pointer leaves and every pixel has faded,
  the rAF loop stops outright; the next pointermove restarts it. A page
  with no mouse movement runs zero animation frames.
- `TextRepel` writes pointer coordinates to framer-motion values at most
  once per frame (latest-sample-wins rAF throttle), caches its container
  rect (invalidated on scroll/resize), and re-captures letter origins
  lazily via a version bump that subtracts current displacement.
- `SplineReveal` (anime.js spring entrance + tilt) is rAF-throttled per
  element with the transition disabled while tracking.
- All translucent surfaces blur at 5px (cheaper to composite than 10px);
  the login WebGL shader and the ambient layers are the only always-on
  paint, and both idle at zero JS cost.

## Development commands

```bash
bun install                 # or npm install
bun run db:create           # create the hackmate database
bun run db:migrate          # apply drizzle migrations
bun run db:seed             # taxonomy (61 skills, 10 roles, 5 badges)
bun run db:seed:demo        # optional: 8 people, 3 hackathons, 5 teams, chat, requests
bun run dev                 # http://localhost:3000 -> redirects to /login (hero page)
bun run build && bun start  # production
bun run test                # verification + reputation unit tests
```

See `SETUP.md` for the full key-by-key environment guide (`$0/month` on free tiers) and
`README.md` for the product spec. Security controls and the penetration-test results
are documented in `SECURITY.md`.
