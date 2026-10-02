# HackMate — Handover Prompt (round 9, final)

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
2. **Login page only**: the full-page living ground = user-supplied `GrainGradient` WebGL component (`src/components/ui/grain-gradient.tsx`, mounted VERBATIM — never edit its internals) with its **INBUILT film grain left ON at the default 0.32 — never set `grain={0}`**, blended with the wall by re-drawing the ribs over it, an animated `MagnetLines` field (Componentry, `src/components/ui/magnet-lines.tsx`) that swivels ribs toward the cursor, and an ink vignette at the edges. See `LoginBackdrop` in `src/app/login/login-client.tsx`.
3. **Cursor effect**: colored JADE pixel wake (`CursorField`) — login screen ONLY, never global, never black-and-white.
4. **Frosted glass = 10px blur everywhere**: cards, navbar dock, footer tray, popovers, dialogs, tabs, badges, toasts (`backdrop-filter: blur(10px)` in globals.css). The sign-in pane (`FlutedGlass`) sets its blur as an **INLINE STYLE from the tsx** — this is deliberate: the production CSS minifier mangles `backdrop-filter: blur(var(--glass-blur,...))` into an invalid declaration. Do NOT move it back into the stylesheet.
5. **Deboss EVERYTHING**: every component is pressed INTO the page (hard-surface modeling deboss: 1px dark ceiling lip, 1px light catch at the bottom, dark rim, AO pools — tokens `--deboss-1/2`, `--deboss-chip` in globals.css). Cards, header, footer, buttons, inputs, badges, tabs, avatars — all of it. Nothing floats, nothing casts outer shadows.
6. **Peek**: hovering a card un-clips a frosted window that **covers the ENTIRE card** showing the hub/profile preview — no label text (`src/components/discover/card-peek.tsx`).
7. **Footer**: floating tray (`max-w-5xl`), NO dotted line.
8. **NO 3D anywhere.** No Spline, no Three.js, no WebGL objects beyond the GrainGradient shader canvas. The Spline scene, `SplineObject` component and `@splinetool/runtime` dependency were removed in r9 — do not re-add them. (`SplineReveal` in `src/components/ui/spline-reveal.tsx` is pure anime.js spring motion — the name is historical, it has no Spline dependency.)
9. **No bolted-on noise overlays**: no feTurbulence, no sandblast grain layers. The ONE texture is the GrainGradient's own inbuilt shader grain on the login page.

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
- Stale `DATABASE_URL` in the shell (e.g. a `file:` sqlite URL) beats `.env.local` — export the postgres URL explicitly.
- Keep `ALLOW_DEMO_LOGIN` unset in production.
- The CSP in `next.config.ts` is deliberately tightened (no `wasm-unsafe-eval` — nothing needs it anymore).

### Current state (r9)

tsc clean, eslint 0 errors, `next build` all routes, 61/61 unit tests, VLM visual audits pass (no 3D, grain visible, frost visible through the sign-in pane, debossed cards, floating footer, no glitches). Screenshots: `download/screenshots/r9-*.png`.

When continuing: follow the art-system rules above exactly — they encode 9 rounds of user feedback. Ask before introducing any new visual motif.
