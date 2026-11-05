alter table "user"
  add column if not exists "open_to_opportunities" boolean not null default true,
  add column if not exists "match_digest_emails" boolean not null default false,
  add column if not exists "last_match_digest_at" timestamptz;

alter table "team_role_needed"
  add column if not exists "expires_at" timestamptz;

create table if not exists "user_match" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null references "user"("id") on delete cascade,
  "team_id" uuid not null references "team"("id") on delete cascade,
  "role_id" uuid not null references "role_taxonomy"("id") on delete cascade,
  "score" integer not null,
  "reasons" jsonb not null default '[]'::jsonb,
  "active" boolean not null default true,
  "created_at" timestamptz not null default now(),
  "evaluated_at" timestamptz not null default now(),
  "digest_claimed_at" timestamptz,
  "digest_sent_at" timestamptz
);
create unique index if not exists "user_match_identity_idx" on "user_match" ("user_id", "team_id", "role_id");
create index if not exists "user_match_active_idx" on "user_match" ("user_id", "active");

create table if not exists "email_quota" (
  "month" text primary key,
  "successful_sends" integer not null default 0,
  "updated_at" timestamptz not null default now()
);
