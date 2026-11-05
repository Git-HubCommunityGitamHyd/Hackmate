ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "profile_embedding" real[],
  ADD COLUMN IF NOT EXISTS "profile_embedding_model" text,
  ADD COLUMN IF NOT EXISTS "profile_embedding_taxonomy" text,
  ADD COLUMN IF NOT EXISTS "profile_embedding_preparation" text,
  ADD COLUMN IF NOT EXISTS "profile_embedding_source_hash" text,
  ADD COLUMN IF NOT EXISTS "profile_embedding_status" text NOT NULL DEFAULT 'missing';

ALTER TABLE "team_role_needed"
  ADD COLUMN IF NOT EXISTS "embedding" real[],
  ADD COLUMN IF NOT EXISTS "embedding_model" text,
  ADD COLUMN IF NOT EXISTS "embedding_taxonomy" text,
  ADD COLUMN IF NOT EXISTS "embedding_preparation" text,
  ADD COLUMN IF NOT EXISTS "embedding_source_hash" text,
  ADD COLUMN IF NOT EXISTS "embedding_status" text NOT NULL DEFAULT 'missing';

CREATE INDEX IF NOT EXISTS "user_profile_embedding_status_idx"
  ON "user" ("profile_embedding_status");
CREATE INDEX IF NOT EXISTS "team_role_embedding_status_idx"
  ON "team_role_needed" ("embedding_status");
