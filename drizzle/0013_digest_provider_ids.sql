alter table "user_match"
  add column if not exists "digest_provider_id" text;

alter table "invite"
  add column if not exists "digest_provider_id" text;
