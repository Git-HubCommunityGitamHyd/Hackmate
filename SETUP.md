# HackMate Setup Guide

Everything you need to run, configure, deploy and publish this project.
The total monthly cost is $0 on free tiers. The only optional expense is a
domain name, around $10 per year.

## Where to put API keys (read this first)

Two places, one rule: **locally everything goes in `.env.local`** (never
committed, already in `.gitignore`), **in production everything goes in the
Vercel dashboard** under Settings, Environment Variables. There is no other
place. No keys ever go in the code.

| Variable | What it is | Where to get it | Required? |
|---|---|---|---|
| `DATABASE_URL` | CockroachDB (or local Postgres) connection string | CockroachDB console, Connect, General connection string | yes |
| `AUTH_SECRET` | Signs login sessions | generate: `openssl rand -base64 32` | yes |
| `AUTH_URL` | Public URL of the app | your Vercel URL, `https://your-app.vercel.app` | production only |
| `ADMIN_EMAILS` | Comma-separated organizer emails allowed to post hackathons | your own emails | yes, to post hackathons |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app for sign in | GitHub, Settings, Developer settings, OAuth Apps | for GitHub sign in |
| `RESEND_API_KEY` | Sends magic links and notification emails | resend.com, API Keys | for email sign in |
| `EMAIL_FROM` | Sender identity for emails | `HackMate <onboarding@resend.dev>` works without a domain | with Resend |
| `PUSHER_APP_ID` `PUSHER_KEY` `PUSHER_SECRET` `PUSHER_CLUSTER` | Realtime chat (server) | pusher.com, Channels app, App Keys | for realtime chat |
| `NEXT_PUBLIC_PUSHER_KEY` `NEXT_PUBLIC_PUSHER_CLUSTER` | Realtime chat (browser) | same Pusher app, same values | with Pusher |
| `BLOB_READ_WRITE_TOKEN` | Avatar and logo uploads | Vercel dashboard, Storage, Blob | for uploads |
| `CRON_SECRET` | Signs the Vercel Cron requests | generate any random string | production, for cron |
| `DATABASE_SSL_ROOT_CERT` | Path to the CockroachDB root cert for strict TLS | CockroachDB console, download CA cert | optional |
| `ALLOW_DEMO_LOGIN` | Dev-only quick admin sign in button | set to `true` | dev only, never production |

Everything except `DATABASE_URL` and `AUTH_SECRET` is optional: the app
degrades gracefully (no Pusher key means chat polls every 4 seconds, no
Resend key means the email form shows a clear error, no Blob token means
avatar upload is disabled).

## Local setup

Prerequisites:

- Node.js 20+ (or Bun 1.1+)
- A local Postgres 14+ instance, or a free CockroachDB Serverless cluster
  (the app code is identical for both)

```bash
Step 1: Initialize the Local PostgreSQL ServerEnsure your local PostgreSQL 18 server is running in the background. If it ever stops, you can start it by running PowerShell as Administrator and executing:powershellStart-Process powershell -Verb runAs -ArgumentList "Start-Service -Name postgresql-x64-18"
Use code with caution.

Step 2: Set Up Your Configuration FileEnsure you have a file named .env.example in the root of your project folder containing the exact blocks below:
envDATABASE_URL=postgres://postgres:your_password@127.0.0.1:5432/hackmate
AUTH_SECRET=any-long-random-string
AUTH_URL=http://localhost:3000
ADMIN_EMAILS=your_college_email_id
ALLOW_DEMO_LOGIN=true
NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true
Use code with caution.

Step 3: Install DependenciesOpen your standard PowerShell window inside the project directory and run Bun to verify all structural packages are synchronized: bun install

Step 4: Run the Database MigrationsPush the database schema structures directly into your local PostgreSQL hackmate instance. Since tsx handles module resolution strictly, use Bun to trigger the execution script natively:powershellbun scripts/migrate.ts

Step 5: Boot Up the Development ServerFire up the local development interface using the primary runtime script:powershellbun run dev

Step 6: Log In as AdministratorOpen your web browser and navigate to http://localhost:3000.Locate the landing screen and click the "Quick dev sign-in" action element.You will be automatically signed in as preddy5@student.gitam.edu with absolute administrative layout control (posting hackathons, forming teams, managing registrations, etc.).
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
# from the project root
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
- Full text search runs on `to_tsvector` / `websearch_to_tsquery` with a
  LIKE fallback, both work on CockroachDB since it is Postgres wire
  compatible

## CockroachDB notes and troubleshooting

The code runs on both local Postgres and CockroachDB Serverless without
changes. These are the known CockroachDB differences already handled in the
code, plus what to do if you still see an error:

- **TLS errors** ("unable to verify the first certificate",
  "self signed certificate in certificate chain"): Node does not ship with
  the CA that signs CockroachDB Serverless certificates. The app therefore
  defaults to encrypted-but-unpinned TLS (sslmode=require equivalent), which
  works everywhere. For strict certificate verification, download the root
  cert from the CockroachDB console (Connect, CA certificate) and set
  `DATABASE_SSL_ROOT_CERT` to its file path.
- **Full-text search**: CockroachDB has no `tsvector` / `websearch_to_tsquery`
  support. The search query is wrapped in a try/catch that silently falls
  back to a `lower() LIKE lower()` search, so search works identically on
  both databases, just without English word stemming on CockroachDB.
- **`ILIKE` was replaced** with `lower() LIKE lower()` in all query code
  because it behaves identically and is guaranteed on CockroachDB.
- **`TRUNCATE ... RESTART IDENTITY` is not supported** by CockroachDB, so the
  seed script uses plain `TRUNCATE ... CASCADE` (every primary key is a uuid,
  there are no sequences to reset anyway).
- **`prepare: false`** is set on the connection: CockroachDB Serverless
  multiplexes connections and behaves best with the simple query protocol.
- **Transaction retries (SQLSTATE 40001)**: CockroachDB occasionally asks a
  transaction to retry under contention. The app does not use multi-statement
  transactions, so each write is a single statement and this error is not
  expected. If you add transactions later, wrap them in a retry loop
  (retry on error code 40001).
- **Connection pool size** is 2 for CockroachDB: Serverless multiplexes
  sessions, small pools are faster and stay well inside free-tier limits.

If a database error still appears in the Vercel function logs, check:
1. `DATABASE_URL` is the full General connection string from the CockroachDB
   console including `?sslmode=verify-full` (the sslmode value is fine, the
   app resolves TLS itself)
2. The database name in the URL is `hackmate` (not `defaultdb`)
3. `bun run db:migrate` ran successfully against that same URL
4. The cluster region is close to your Vercel region (both in, say, US East)

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
