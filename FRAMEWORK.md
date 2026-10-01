# HackMate — Framework & Architecture (updated)

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | `proxy.ts` middleware convention (successor of `middleware.ts`) |
| UI runtime | React 19 | Server Components + client islands |
| Language | TypeScript 5 (strict) | Build fails on type errors |
| Styling | Tailwind CSS 4 + `tw-animate-css` | shadcn/ui-style component library in `src/components/ui` |
| Animation | framer-motion 12 + anime.js 4.5 | Kinetic text reveal, text repel, pixel canvas, fluted glass (framer); one-shot entrances, ink brush stroke, peek-window pops (anime.js) |
| 3D | Spline (@splinetool/runtime 2) | Live 3D emblem in the floating header; lazy-loaded, ink-orb fallback offline, scene URL overridable via `NEXT_PUBLIC_SPLINE_SCENE_URL` |
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

1. **Discover** (`/`) — the home screen with three tabs: Hackathons, Teams, People, plus natural-language search ("need a backend dev who knows FastAPI for SIH"). Deep-linkable via `/?tab=teams`.
2. **Hackathon Hub** (`/hackathons/[slug]`) — single-event page: roles in demand, registered teams, join flow.
3. **My Team** (`/my-team`) — the team workspace: chat, task checklist, completeness meter, gap analysis, result reporting.

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

- **Matching** — deterministic first: skill overlap, role complementarity, availability and commitment compatibility, hackathon-specific roles. NL search parses role/skill/event intent from a free-text query. Embedding/LLM upgrades can layer on later without changing the call sites.
- **Team Composition Intelligence** — `lib/matching/composition.ts` produces text coverage/gap analysis ("strong ML and frontend coverage, no backend/cloud member") surfaced in team detail and My Team.
- **Reputation** — post-hackathon results feed karma, badges and track record (`lib/reputation.ts`, tested in `reputation.test.ts`).
- **Verification** — college ID image -> OCR extraction -> claim matching -> decision, with a manual admin fallback and a private Blob store for the documents.

### Design language: Ink Wash (sumi-e) minimalist maximalism

Pure-black canvas, warm paper-white text, frosted/fluted glass everywhere,
and a single vermilion seal-red accent (`--primary`). Interactive surfaces
paint an accented edge highlight that follows the mouse:

- `InkEdgeProvider` (layout-level) runs one delegated rAF-throttled
  `pointermove` listener and writes `--ink-mx/--ink-my` on the hovered
  surface (cards, `.fluted-panel`, `.liquid-glass`, `.ink-edge`).
- `globals.css` renders a 2px vermilion ring (masked radial gradient) plus
  a faint interior ink wash on hover — no per-component JS.
- Discover cards also carry a `CardPeek` hover window: a small glass panel
  that pops in (anime.js) showing the card's components — members, open
  roles, missing skills, dates, prize — without leaving the grid.
- The header is a detached floating pill dock (`.emboss-dock`): frosted,
  minimally embossed (light top edge, dark bottom edge, deep float shadow),
  with the Spline 3D emblem as the brand mark.
- The login page is the hero/landing page (unauthenticated visitors are
  redirected there by `src/proxy.ts`): opaque black fluted-glass sign-in
  card with mouse-reactive ink edge, anime.js ink brush stroke under the
  headline, grayscale ink pixel canvas, and LinkedIn copy for the
designers/PMs sign-in track.

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
