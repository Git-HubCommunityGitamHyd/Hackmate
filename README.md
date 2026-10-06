# HackMate

HackMate is a web platform where students find hackathon teammates. Students sign in with GitHub or an email link, build profiles with skills, roles, availability and commitment, and browse hackathons posted by organizers. Teams form around ideas and get a composition analysis instead of a match percentage: the platform reports which skill areas the team covers, which ones are missing, and which available people fill those gaps and why. Teams then work in a shared workspace with realtime chat, a submission checklist and a completeness meter until they submit. The prize field on every hackathon listing is free text, since prizes are not always cash. The database ships empty and admins publish the real events.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 with the App Router and TypeScript |
| Styling | Tailwind CSS 4 with shadcn/ui and Lucide icons |
| Database | CockroachDB Serverless, Postgres wire compatible |
| ORM | Drizzle ORM with the postgres-js driver |
| Authentication | Auth.js v5 with GitHub OAuth and Resend email magic links |
| Realtime chat | Pusher Channels |
| File storage | Vercel Blob for avatars and hackathon logos |
| Email | Resend |
| Scheduled jobs | Vercel Cron |
| Client data | TanStack Query |
| Validation | Zod with React Hook Form |
| Matching | Deterministic weighted scoring in TypeScript, no AI |

Setup, configuration and deployment instructions are in [SETUP.md](./SETUP.md).
