ALTER TABLE "hackathon_result"
  ALTER COLUMN "hackathon_id" DROP NOT NULL;

ALTER TABLE "hackathon_result"
  ADD COLUMN "project_description" text;
