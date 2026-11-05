CREATE TABLE IF NOT EXISTS "search_embedding" (
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "vector" real[],
  "model_version" text,
  "taxonomy_version" text,
  "preparation_version" text,
  "source_hash" text,
  "status" text NOT NULL DEFAULT 'missing',
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "search_embedding_pk" PRIMARY KEY ("entity_type", "entity_id")
);

CREATE INDEX IF NOT EXISTS "search_embedding_entity_idx"
  ON "search_embedding" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "search_embedding_status_idx"
  ON "search_embedding" ("status");
