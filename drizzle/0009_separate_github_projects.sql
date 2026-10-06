CREATE TABLE IF NOT EXISTS "github_project" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL UNIQUE REFERENCES "user" ("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "repo_url" text NOT NULL,
  "technologies" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_best_work" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "github_project"
  ("user_id", "title", "description", "repo_url", "technologies", "is_best_work")
SELECT "user_id", "project_name", "project_description", "repo_url", "technologies", "is_best_work"
FROM "hackathon_result"
WHERE "hackathon_id" IS NULL
ON CONFLICT ("user_id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "repo_url" = EXCLUDED."repo_url",
  "technologies" = EXCLUDED."technologies",
  "is_best_work" = EXCLUDED."is_best_work",
  "updated_at" = now();

DELETE FROM "hackathon_result" WHERE "hackathon_id" IS NULL;

ALTER TABLE "hackathon_result"
  ALTER COLUMN "hackathon_id" SET NOT NULL;
