-- Cached karma score for sorting. Recomputed from source rows by
-- GET /api/reputation; this column is a denormalised copy, not the truth.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "reputation_score" integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "user_reputation_idx" ON "user" ("reputation_score");
