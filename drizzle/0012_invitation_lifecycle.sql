alter table "invite"
  add column if not exists "expires_at" timestamptz,
  add column if not exists "digest_claimed_at" timestamptz,
  add column if not exists "digest_sent_at" timestamptz;

alter table "notification"
  add column if not exists "invite_id" uuid references "invite"("id") on delete set null;

create index if not exists "invite_pending_idx" on "invite" ("user_id", "status");
