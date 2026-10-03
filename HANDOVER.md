# HackMate - Handover Prompt (round 12, final)

Everything below the cut line is the prompt to paste at the start of a new
conversation. It carries the full project context needed to continue work
without re-explaining anything.

---

## PROJECT: HackMate - hackathon team-formation platform

I'm continuing development of **HackMate** (repo: `github.com/Git-HubCommunityGitamHyd/Hackmate`), a platform where students find hackathon teammates. The full source is attached/unzipped from the deliverable. It is feature-complete, security-hardened, and visually finished through 12 rounds of iteration. Read `FRAMEWORK.md`, `SETUP.md`, `SECURITY.md` and `README.md` in the repo root first - they are accurate.

### Stack (all verified working)

- Next.js 16 App Router (Turbopack, `src/proxy.ts` middleware = login-first entry), React 19, TypeScript strict, Tailwind CSS 4, shadcn-style UI in `src/components/ui`
- Auth.js v5 (GitHub OAuth + email magic links, Drizzle sessions, demo login `dev@hackmate.local` gated by `ALLOW_DEMO_LOGIN`)
- Drizzle ORM + Postgres (migrations `drizzle/0000`-`0007`; embedded PG in `scripts/pgbin` for dev)
- framer-motion 12 + anime.js 4.5 for motion; Zod 4 validation; per-IP rate limiting; CSP/HSTS headers in `next.config.ts`
- Delivery: `scripts/package-project.py` -> zips in `download/`; upload via filebin.net raw PUT

### THE ART SYSTEM - "Fluted Ink" (FINAL, do not redesign)

1. **Every page ground**: near-black ink canvas (`oklch(0.11 0.004 90)`) ruled with fine vertical flutes (1px lines every 11px at `oklch(1 0 0 / 0.028)`, deliberately faint) + jade bloom top-right - lives on `<body>` in `src/app/globals.css`, `background-attachment: fixed`. Never pure black, never plain.
2. **Login page only**: the full-page living ground = user-supplied `GrainGradient` WebGL component (`src/components/ui/grain-gradient.tsx`, mounted VERBATIM - never edit its internals) with its **INBUILT film grain left ON at the default 0.32 - never set `grain={0}`**, **FLIPPED horizontally + vertically (`style={{ transform: "scale(-1, -1)" }}` on the mount - the 180° turn)**, blended with the wall by re-drawing the ribs over it (fainter, 0.02) and an ink vignette at the edges. NO magnet-lines (removed in r10 - do not re-add). See `LoginBackdrop` in `src/app/login/login-client.tsx`.
3. **Ambient layer on every OTHER page** (`src/components/ui/ambient-layer.tsx`, mounted in the root layout, returns null on `/login`): (a) a whisper of FILM GRAIN over the wall - an SVG fractal-noise data-URI background at opacity 0.045 with `mix-blend-mode: overlay`, intentionally barely visible; (b) the TINY JADE PIXEL TRAIL (r12, replaced the r11 cursor glow, which is REMOVED - do not re-add): the SAME `PixelCanvas` trail effect and the SAME 11px grid as the hero's `CursorField`, but with `radius={16}` so only about 5 to 6 pixels ever light around the pointer (the cell under the cursor plus its 4 orthogonal neighbors), `maxAlpha={0.7}`, `speed={0.05}`. Its only job is to reveal the translucency of the frosted surfaces above it: the handful of jade pixels smears through the 5px blur as soft streaks. NO cursor glow/halo anywhere. Fine-pointer devices only; inert on touch/headless.
4. **Cursor effect on login**: colored JADE pixel wake (`CursorField`, default wake radius 80) - the WIDE wake is login screen ONLY. The other pages carry the same trail scaled down to the 5-to-6-pixel whisper (see item 3). Never black-and-white.
5. **Frosted glass = 5px blur on EVERY translucent surface** (r12: the user dropped the radius from 10px to 5px): cards, navbar dock, footer tray, nav pills, popovers, dropdowns, selects, dialogs, tabs, badges, avatars, inputs, textareas, toasts, incoming chat bubbles, outline/secondary buttons and the sign-in pane. **MINIFIER PITFALL (critical)**: Turbopack's Lightning CSS alias-collapses `backdrop-filter` + `-webkit-backdrop-filter` pairs in a rule, keeping ONLY the LAST-declared form - and Chromium ignores the bare `-webkit-` form, so the frost silently dies. ALWAYS declare `-webkit-backdrop-filter` FIRST and `backdrop-filter` LAST (reorder helper: `scripts/fix-backdrop-order.py`). The sign-in pane (`FlutedGlass`) additionally sets its blur as an INLINE style from the tsx - inline styles bypass the minifier entirely.
6. **Deboss EVERYTHING, DEEP SOFT DIFFUSED style (per user reference image, deepened hard in r11)**: every component is pressed FAR INTO the page - a LARGE blurred dark inset shadow from the top-left, a faint white light catch on the bottom-right interior (INSET, never outset), a wide soft AO pool (tokens `--deboss-1/2`, `--deboss-chip`, `--deboss-2-pressed` in globals.css). NO crisp 1px lips, NO outset shadows ANYWHERE: the shadow-* Tailwind utilities were stripped from dialog/alert-dialog/popover/dropdown/select/tabs/slider/input primitives so the inset recess always wins (utilities-layer rules would otherwise out-rank the base-layer recess). Cards, header, footer, buttons, inputs, badges, tabs, avatars, chat bubbles, tooltips - all of it. Nothing floats.
7. **The sign-in pane is CLEAN frost**: no ribbing/lines INSIDE the card (the `.flutes` layer was removed in r11). Only the page behind it carries the fluted lines.
8. **Peek**: hovering a card un-clips a frosted window that **covers the ENTIRE card** showing the hub/profile preview - no label text (`src/components/discover/card-peek.tsx`).
9. **Footer**: floating tray (`max-w-5xl`), NO dotted line.
10. **NO 3D anywhere.** No Spline, no Three.js, no WebGL objects beyond the GrainGradient shader canvas, no magnet-lines. The Spline scene, `SplineObject` component, `@splinetool/runtime` dependency (r9) and the `MagnetLines` component (r10) were removed - do not re-add them. (`SplineReveal` in `src/components/ui/spline-reveal.tsx` is pure anime.js spring motion - the name is historical, it has no Spline dependency.)
11. **NO em dashes anywhere in the project** (r11 sweep: `scripts/remove-em-dashes.py`). Comments, UI copy, docs, metadata - all use periods, commas, semicolons, colons or middle dots instead. Do not reintroduce them.
12. **Hover tilt is twitch-free by construction** (both `FlutedGlass` and `SplineReveal`): while the pointer is over the element the tilt tracks 1:1 via rAF-throttled CSS-variable writes with `transition: none` (a transition restarted on every pointermove is what reads as "twitching"); ONE soft spring transition runs on pointer LEAVE only (`.settle` / `.tilt-settle` classes). `SplineReveal`'s anime.js entrance CLEARS its inline transform on completion so the stylesheet tilt transform (`.spline-tilt` class) takes over - never put the tilt transform inline on it. NEVER use `transform-style: preserve-3d` or `translateZ` inside a backdrop-filter element (Chrome artifacts).
13. **Performance contracts (r12 "optimize it" pass)**: `PixelCanvas` NEVER scans the full grid - it keeps an AWAKE LIST (cells lit or still decaying), wakes a small box around the pointer each frame (box test, no square roots) and steps only the awake cells; when the pointer is off-field and everything has faded, the rAF loop STOPS outright and the next pointermove restarts it (a page with no mouse movement runs ZERO animation frames). `TextRepel` writes pointer coordinates to its motion values at most ONCE PER FRAME (latest-sample-wins rAF throttle; unthrottled mousemove re-runs every letter's repel math hundreds of times per second on high-polling mice), caches the container rect (invalidated on scroll/resize) and re-captures letter origins lazily via a version bump (subtracting current displacement so mid-hover captures stay correct). Keep these patterns if you touch either component.

### How to run (Linux sandbox / macOS)

```bash
bun install
# embedded Postgres (or any Postgres 14+):
bun run setup           # initdb + migrations + seeds, writes .env.local
# CRITICAL: always export DATABASE_URL when building/starting - a stale
# shell env var silently beats .env.local in Next.js:
DATABASE_URL=postgres://postgres@127.0.0.1:5432/hackmate bunx next build
DATABASE_URL=postgres://postgres@127.0.0.1:5432/hackmate bunx next start -p 3000
bun run test            # 61 unit tests
python3 scripts/pentest/pentest.py   # security suite (demo-login WARN is by design, local-only)
```

Windows/PowerShell 5.1: no `&&` chaining, no `tee`; bun/npm/tsx swallow `--` separators - run commands separately.

### Security additions (r12, the "can't hack through devtools" pass)

- **Cross-origin mutation guard** in `src/proxy.ts`: every POST/PUT/PATCH/DELETE under `/api/*` (except Auth.js's own CSRF-protected `/api/auth/*` endpoints and the bearer-token `/api/cron`) that carries a browser `Origin` header must match the app's own host (Host / x-forwarded-host / AUTH_URL aware, so gateway and preview deploys keep working). Foreign origins get a JSON 403 before any business logic runs. Non-browser clients (no Origin) pass untouched. This is CSRF defense-in-depth on top of the sameSite=lax session cookie - a page on another origin, a sandboxed iframe or a devtools-forged cross-origin fetch cannot mutate anything.
- **Demo sign-in is impersonation-proof**: `POST /api/auth/demo` IGNORES its request body (a forged `{"email": ...}` signs in as the fixed dev admin account and nothing else), is rate-limited 10/min/IP, is rejected cross-origin by the proxy guard, and sets its cookie with protocol-aware `secure` (https or x-forwarded-proto).
- **Rate limits on every heavy mutation**: chat-send 30/min, team creation 10/min, profile writes 12/min, hackathon creation 12/min (admin), emergency toggle 20/min, college-ID verification uploads 6/min, LinkedIn imports 6/min, demo login 10/min - on top of the existing directory/search/track-record limits.
- **UUID guard everywhere ids enter the DB**, including `GET /api/users/:id`.
- **Production builds ship no source maps**: `bun run build` runs `scripts/strip-source-maps.js` after `next build` (Turbopack emits one polyfill .map even with browser maps disabled). The pentest's client-bundle hygiene section scans `.next/static` chunks for AUTH_SECRET values and any `process.env.<SERVER_VAR>` reference - server secrets must never reach the browser.

### Known pitfalls (all bitten before)

- An orphaned `next start` from a previous session can serve a STALE build on port 3000 - kill by exact PID (`ss -ltnp | grep 3000`) before restarting, or you'll think your changes "didn't apply".
- Stale `DATABASE_URL` in the shell (e.g. a `file:` sqlite URL - the sandbox exports one!) beats `.env.local` - export the postgres URL explicitly. If `.env.local` vanishes after a sandbox reset: `bun run setup`, then `bun run db:create && bun run db:migrate && bun run db:seed && bun run db:seed:demo && bun run db:seed:badges`, and rebuild (NEXT_PUBLIC_* vars are baked at build time).
- Keep `ALLOW_DEMO_LOGIN` unset in production.
- The CSP in `next.config.ts` is deliberately tightened (no `wasm-unsafe-eval` - nothing needs it anymore; `img-src` allows `data:` for the grain tile, `style-src` allows inline for the frost styles).
- The sandbox reaps background processes when a Bash invocation ends - only true daemons (postgres via `pg_ctl`) survive. Start long-running servers with `setsid -f bun run dev > dev.log 2>&1 < /dev/null` (the `-f` fork is what escapes the reaper; plain `nohup ... & disown` dies between commands).
- The embedded Postgres binaries live in `node_modules/@embedded-postgres/linux-x64/native/bin` (initdb, pg_ctl, postgres; createdb is absent - use `bun run db:create` which does it with SQL); `scripts/start-pg.sh` boots them. After a sandbox reset `.pgdata` is gone: re-run initdb + `bun run db:create && bun run db:migrate && bun run db:seed && bun run db:seed:demo && bun run db:seed:badges`.
- Headless Chromium reports `(hover: hover) and (pointer: fine)` as false... but the PixelCanvas trail ignores that media query and works in E2E browsers anyway (it only checks `prefers-reduced-motion`). The r11-era glow layer used the hover media query - it is gone now.
- `next build` + `next start` (production mode) is REQUIRED for final visual verification: the Lightning CSS minifier only mangles backdrop-filter in production chunks, and the origin guard + bundle hygiene pentest sections only mean something against a prod server (`touch scripts/pentest/.prod` marks a prod build for the suite).

### Current state (r12, final)

tsc clean, eslint 0 errors, `next build` all routes + source-map strip, 61/61 unit tests, pentest 68 PASS / 0 FAIL / 1 WARN in production mode (66/0 in dev; the WARN is the intentional local-only demo login), E2E computed-style checks pass on the PRODUCTION build (all 38 frosted surfaces on the discover page + the sign-in pane read `blur(5px)`; every card/button/badge shadow is all-inset deep deboss; gradient flipped `matrix(-1,0,0,-1)`; grain veil 0.045 overlay; glow absent; trail wakes ~5-6 jade pixels at the cursor; tilt tracks 1:1 with `transition: none` and settles on leave), VLM visual audits pass, zero em dashes repo-wide, no console errors. Screenshots: `download/screenshots/r12-*.png`.

When continuing: follow the art-system rules above exactly - they encode 12 rounds of user feedback. Ask before introducing any new visual motif.
