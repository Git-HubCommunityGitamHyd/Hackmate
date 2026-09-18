# HackMate Setup Guide

Everything you need to run, configure, deploy and publish this project.
The total monthly cost is $0 on free tiers. The only optional expense is a
domain name, around $10 per year.

## Local setup (10 minutes)

Prerequisites:

- Node.js 20+ (or Bun 1.1+)
- A local Postgres 14+ instance, or a free CockroachDB Serverless cluster
  (the app code is identical for both)

```bash
# 1. Install dependencies
bun install        # or: npm install

# 2. Configure environment
cp .env.example .env.local
#   set DATABASE_URL (local PG or CockroachDB) and AUTH_SECRET:
#   openssl rand -base64 32

# 3. Create the database (if using local PG)
createdb hackmate

# 4. Apply migrations (versioned SQL, works identically on CockroachDB)
bun run db:migrate

# 5. Seed system taxonomies (skills, roles, badges, no demo people or hackathons)
bun run db:seed

# 6. Give yourself admin (posting) access
echo 'ADMIN_EMAILS=you@college.edu' >> .env.local

# 7. Run
bun run dev        # http://localhost:3000
```

Optional integrations, the app degrades gracefully without them:

- `AUTH_GITHUB_ID/SECRET` for GitHub sign in and repo/language import
- `RESEND_API_KEY` for magic links and notification emails
- `PUSHER_*` for realtime chat (falls back to 4 second polling)
- `BLOB_READ_WRITE_TOKEN` for avatar and logo uploads

Dev-only quick sign in: with `ALLOW_DEMO_LOGIN=true`, the login page shows a
quick admin sign in button that signs you in as your first `ADMIN_EMAILS`
account (or `dev@hackmate.local`) with admin rights, handy before GitHub OAuth
is configured. Never enable it in production, leave both flags unset.

## Admin access: posting and managing hackathons

Only admins (organizers) can post, edit or delete hackathons. There is no
demo or example data, you post the real events yourself.

How to become an admin (recommended):

1. Put your sign in email in the `ADMIN_EMAILS` env var, comma separated for
   a team of organizers:
   ```bash
   ADMIN_EMAILS=you@college.edu,co-organizer@college.edu
   ```
2. Sign in with that email using GitHub OAuth (the account email must match)
   or the email magic link.
3. HackMate promotes the account to `role='admin'` automatically at sign in.
   Existing users are promoted lazily on their next session read, or just
   sign out and in again.
4. You now see Admin in the navbar, a Post hackathon button, and the /admin
   organizer console (list, edit, delete).

Promote someone later with SQL:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'friend@college.edu';
-- demote: UPDATE "user" SET role = 'user' WHERE email = '...';
```

Run this via the CockroachDB console or any SQL client.

Guards are layered: server side checks on `/hackathons/new`, `/admin` and
`/hackathons/[slug]/edit`, and the API (`POST/PUT/DELETE /api/hackathons`)
re-checks the role in the database on every call. Non-admins who hit those
pages get a panel explaining exactly how to get access.

## Using HackMate (the 3 minute tour)

1. Sign in with GitHub (developers get languages, repos, stars and activity
   imported automatically) or an email magic link (designers, PMs, pitchers).
2. Complete your profile: skills with levels, primary role, availability and
   commitment level. You control your recruitment status (looking, partially
   formed, team full).
3. Admins post hackathons at `/hackathons/new` or the `/admin` console.
   Dates, mode, themes, team size and a free text prize.
4. Browse Discover for hackathons, recruiting teams and people. Search
   naturally: "need a Next.js person with ML experience for a team of 4".
5. Create or join a team: post your idea (anonymous until someone joins, only
   the domain shows) or request to join one with a short message. Team leads
   can invite directly.
6. Watch the completeness meter: HackMate tells you which roles your team
   covers and which are missing, and recommends people who fill the gaps.
7. Work in the team workspace: chat (realtime with Pusher, polling fallback),
   submission checklist, join request management, then move to WhatsApp or
   Discord when you are ready.
8. Emergency? If a teammate drops out close to the deadline, toggle Emergency
   teammate mode: you get boosted visibility with a red pulse, auto expiring
   via cron.

## Setting up the free tier services

### 1. CockroachDB Serverless (database)

1. https://cockroachlabs.cloud, Create Cluster, Serverless, free plan (no
   credit card needed)
2. Create a SQL user and database (`hackmate`) from the console
3. Copy the general connection string into `DATABASE_URL`:
   `postgresql://user:pass@cluster.cockroachlabs.cloud:26257/hackmate?sslmode=verify-full`
4. `bun run db:migrate && bun run db:seed`

### 2. GitHub OAuth (developer sign in)

1. GitHub, Settings, Developer settings, OAuth Apps, New OAuth App
2. Homepage URL: `http://localhost:3000` (later: your Vercel URL)
3. Authorization callback URL:
   `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Secret into `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`

### 3. Resend (magic links and email notifications)

1. https://resend.com, sign up (free: 3,000 emails per month)
2. API Keys, Create, put the key in `RESEND_API_KEY`
3. Without a custom domain use
   `EMAIL_FROM="HackMate <onboarding@resend.dev>"`

### 4. Pusher (realtime team chat)

1. https://pusher.com, Create a Channels app (free: 100 connections, 200k
   messages per day)
2. Choose a region near your users (for example `ap2` for India)
3. Copy the App ID, Key, Secret and Cluster into the `PUSHER_*` and
   `NEXT_PUBLIC_PUSHER_*` variables

### 5. Vercel Blob (avatars and logos)

1. Vercel dashboard, Storage, Blob Database, Create (free, about 250MB)
2. Copy the read/write token into `BLOB_READ_WRITE_TOKEN`

### 6. Vercel Cron (deadline reminders, emergency expiry, keep alive)

`vercel.json` already defines 2 daily cron hits to `/api/cron`, which is the
Hobby plan limit. Set `CRON_SECRET` in your Vercel environment, Vercel signs
each request with it.

## Deploying to Vercel ($0)

```bash
# from the project root, after pushing to GitHub (see below)
npm i -g vercel
vercel            # first run: link the project
vercel --prod     # deploy
```

In the Vercel dashboard under Settings, Environment Variables, add everything
from `.env.example` with production values:

- `DATABASE_URL` (CockroachDB), `AUTH_SECRET`,
  `AUTH_URL=https://your-app.vercel.app`
- `ADMIN_EMAILS` (your organizer emails, required to post hackathons)
- `AUTH_GITHUB_*` (update the OAuth callback URL to the production domain)
- `RESEND_API_KEY`, `EMAIL_FROM`, `PUSHER_*`, `NEXT_PUBLIC_PUSHER_*`,
  `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`

Then run the migration once against CockroachDB from your machine:

```bash
DATABASE_URL="postgresql://...cockroachlabs.cloud..." bun run db:migrate
```

The first deploy will build with `next build`. If you see database errors,
confirm the migration ran and that the Vercel runtime can reach port 26257
(egress is open by default).

## Upload to GitHub

```bash
cd hackmate   # your project folder

# 1. Initialize git (skip if .git exists)
git init
git branch -M main

# 2. Stage everything (.gitignore already excludes secrets and junk)
git add .

# 3. Sanity check what is staged, it should NOT contain .env files
git status

# 4. Commit
git commit -m "HackMate: student hackathon team finding platform"

# 5. Create the repo on GitHub:
#    github.com, New repository, name: hackmate, Public,
#    do NOT add a README or license (we already have them)

# 6. Connect and push
git remote add origin https://github.com/<your-username>/hackmate.git
git push -u origin main
```

Deploy straight from GitHub: Vercel, Add New, Project, Import `hackmate`,
paste the environment variables, Deploy. Every push to `main` auto deploys
and pull requests get preview deployments.

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Start the Next.js dev server |
| `bun run build` / `start` | Production build / serve |
| `bun run lint` | ESLint |
| `bun run db:migrate` | Apply `drizzle/*.sql` migrations |
| `bun run db:seed` | Re-seed system taxonomies (truncates first, no demo data) |
| `bun run db:studio` | Drizzle Studio (browse the database) |

## Database notes

- Skills are stored in junction tables (`user_skill`, `team_skill_wanted`),
  normalized and indexable, never Postgres arrays
- The `role_taxonomy` table powers gap analysis
- Auth.js sessions are stored in the database via the Drizzle adapter
- Full text search runs on `to_tsvector` / `websearch_to_tsquery` with an
  ILIKE fallback, both work on CockroachDB since it is Postgres wire
  compatible

## Project structure

```
hackmate/
├── drizzle/                        # Generated SQL migrations (versioned, portable)
├── scripts/
│   ├── migrate.ts                  # Applies ./drizzle/*.sql (works on PG + CockroachDB)
│   ├── create-db.ts                # Creates the database
│   └── start-pg.sh                 # (dev preview) local embedded Postgres helper
├── src/
│   ├── app/                        # All routes: discover, hubs, teams, profile, admin, api
│   ├── components/                 # discover/ team/ profile/ hackathon/ layout/ shared/ + ui/
│   ├── hooks/                      # TanStack Query hooks
│   ├── types/                      # Auth session augmentation
│   └── lib/                        # db schema, auth, matching engine, queries, validations
├── vercel.json                     # Cron schedules (2 per day, Hobby limit)
├── drizzle.config.ts
└── package.json
```
