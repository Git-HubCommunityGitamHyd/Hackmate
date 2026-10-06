ALTER TABLE "hackathon_result"
  ADD COLUMN "is_best_work" boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "hackathon_result_one_best_work_per_user_idx"
  ON "hackathon_result" ("user_id")
  WHERE "is_best_work" = true;
