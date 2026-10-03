# HackMate — Handover Prompt (round 10, final)

Everything below the cut line is the prompt to paste at the start of a new
conversation. It carries the full project context needed to continue work
without re-explaining anything.

---

## PROJECT: HackMate — hackathon team-formation platform

I'm continuing development of **HackMate** (repo: `github.com/Git-HubCommunityGitamHyd/Hackmate`), a platform where students find hackathon teammates. The full source is attached/unzipped from the deliverable. It is feature-complete, security-hardened, and visually finished through 9 rounds of iteration. Read `FRAMEWORK.md`, `SETUP.md`, `SECURITY.md` and `README.md` in the repo root first — they are accurate.

### Stack (all verified working)

- Next.js 16 App Router (Turbopack, `src/proxy.ts` middleware = login-first entry), React 19, TypeScript strict, Tailwind CSS 4, shadcn-style UI in `src/components/ui`
- Auth.js v5 (GitHub OAuth + email magic links, Drizzle sessions, demo login `dev@hackmate.local` gated by `ALLOW_DEMO_LOGIN`)
- Drizzle ORM + Postgres (migrations `drizzle/0000`–`0007`; embedded PG in `scripts/pgbin` for dev)
- framer-motion 12 + anime.js 4.5 for motion; Zod 4 validation; per-IP rate limiting; CSP/HSTS headers in `next.config.ts`
- Delivery: `scripts/package-project.py` → zips in `download/`; upload via filebin.net raw PUT

### THE ART SYSTEM — "Fluted Ink" (FINAL, do not redesign)

1. **Every page ground**: near-black ink canvas (`oklch(0.11 0.004 90)`) ruled with fine vertical flutes (1px lines every 11px) + jade bloom top-right — lives on `<body>` in `src/app/globals.css`, `background-attachment: fixed`. Never pure black, never plain.
2. **Login page only**: the full-page living ground = user-supplied `GrainGradient` WebGL component (`src/components/ui/grain-gradient.tsx`, mounted VERBATIM — never edit its internals) with its **INBUILT film grain left ON at the default 0.32 — never set `grain={0}`**, **FLIPPED horizontally + vertically (`style={{ transform: "scale(-1, -1)" }}` on the mount — the 180° turn)**, blended with the wall by re-drawing the ribs over it and an ink vignette at the edges. NO magnet-lines (removed in r10 — do not re-add). See `LoginBackdrop` in `src/app/login/login-client.tsx`.
3. **Cursor effect**: colored JADE pixel wake (`CursorField`) — login screen ONLY, never global, never black-and-white.
4. **Frosted glass = 10px blur on EVERY translucent surface**: cards, navbar dock, footer tray, nav pills, popovers, dialogs, tabs, badges, avatars, inputs, textareas, select triggers, toasts, incoming chat bubbles, the sign-in pane. **MINIFIER PITFALL (critical)**: Turbopack's Lightning CSS alias-collapses `backdrop-filter` + `-webkit-backdrop-filter` pairs in a rule, keeping ONLY the LAST-declared form — and Chromium ignores the bare `-webkit-` form, so the frost silently dies. ALWAYS declare `-webkit-backdrop-filter` FIRST and `backdrop-filter` LAST (that's why Tailwind's own utilities survive; reorder helper: `scripts/fix-backdrop-order.py`). The sign-in pane (`FlutedGlass`) additionally sets its blur as an INLINE style from the tsx — inline styles bypass the minifier entirely.
5. **Deboss EVERYTHING, SOFT DIFFUSED style (per user reference image)**: every component is pressed INTO the page — a BLURRED dark inset shadow from the top-left, a faint diffused light catch on the bottom-right interior, a soft AO pool (tokens `--deboss-1/2`, `--deboss-chip`, `--deboss-2-pressed` in globals.css). NO crisp 1px lips — every edge diffused like a shallow press into frosted material. Cards, header, footer, buttons, inputs, badges, tabs, avatars — all of it. Nothing floats, nothing casts outer shadows.
6. **Peek**: hovering a card un-clips a frosted window that **covers the ENTIRE card** showing the hub/profile preview — no label text (`src/components/discover/card-peek.tsx`).
7. **Footer**: floating tray (`max-w-5xl`), NO dotted line.
8. **NO 3D anywhere.** No Spline, no Three.js, no WebGL objects beyond the GrainGradient shader canvas, no magnet-lines. The Spline scene, `SplineObject` component, `@splinetool/runtime` dependency (r9) and the `MagnetLines` component (r10) were removed — do not re-add them. (`SplineReveal` in `src/components/ui/spline-reveal.tsx` is pure anime.js spring motion — the name is historical, it has no Spline dependency.)
9. **No bolted-on noise overlays**: no feTurbulence, no sandblast grain layers. The ONE texture is the GrainGradient's own inbuilt shader grain on the login page.
10. **Hover tilt is twitch-free by construction** (both `FlutedGlass` and `SplineReveal`): while the pointer is over the element the tilt tracks 1:1 via rAF-throttled CSS-variable writes with `transition: none` (a transition restarted on every pointermove is what reads as "twitching"); ONE soft spring transition runs on pointer LEAVE only (`.settle` / `.tilt-settle` classes). `SplineReveal`'s anime.js entrance CLEARS its inline transform on completion so the stylesheet tilt transform (`.spline-tilt` class) takes over — never put the tilt transform inline on it. NEVER use `transform-style: preserve-3d` or `translateZ` inside a backdrop-filter element (Chrome artifacts).

### How to run (Linux sandbox / macOS)

```bash
bun install
# embedded Postgres (or any Postgres 14+):
bun run setup           # initdb + migrations + seeds, writes .env.local
# CRITICAL: always export DATABASE_URL when building/starting — a stale
# shell env var silently beats .env.local in Next.js:
DATABASE_URL=postgres://postgres@127.0.0.1:5432/hackmate bunx next build
DATABASE_URL=postgres://postgres@127.0.0.1:5432/hackmate bunx next start -p 3000
bun run test            # 61 unit tests
bun run pentest         # security suite (demo-login WARN is by design, local-only)
```

Windows/PowerShell 5.1: no `&&` chaining, no `tee`; bun/npm/tsx swallow `--` separators — run commands separately.

### Known pitfalls (all bitten before)

- An orphaned `next start` from a previous session can serve a STALE build on port 3000 — kill by exact PID (`ss -ltnp | grep 3000`) before restarting, or you'll think your changes "didn't apply".
- Stale `DATABASE_URL` in the shell (e.g. a `file:` sqlite URL — the sandbox exports one!) beats `.env.local` — export the postgres URL explicitly. If `.env.local` vanishes after a sandbox reset: `bun run setup`, then `bun run db:create && bun run db:migrate && bun run db:seed && bun run db:seed:demo && bun run db:seed:badges`, and rebuild (NEXT_PUBLIC_* vars are baked at build time).
- Keep `ALLOW_DEMO_LOGIN` unset in production.
- The CSP in `next.config.ts` is deliberately tightened (no `wasm-unsafe-eval` — nothing needs it anymore).
- The embedded Postgres lives in `scripts/pgbin` (symlink into the root `node_modules/@embedded-postgres` install) + the ICU shim compiled at `scripts/pglib/libicushim.so`; `bash scripts/start-pg.sh` boots it.

### Current state (r10)

tsc clean, eslint 0 errors, `next build` all routes, 61/61 unit tests, pentest 19 PASS / 0 FAIL / 1 WARN (by design), VLM visual audits pass (flipped full-page gradient with grain, frosted translucent card + chat bubbles + inputs + nav pills, soft diffused deboss, no magnet lines, no 3D, no glitches), mobile 390px has zero horizontal overflow. Screenshots: `download/screenshots/r10-*.png`.

When continuing: follow the art-system rules above exactly — they encode 10 rounds of user feedback. Ask before introducing any new visual motif.
