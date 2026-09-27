CREATE TABLE "attendance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "hackathon_id" uuid NOT NULL REFERENCES "hackathon" ("id") ON DELETE CASCADE,
  "team_id" uuid NOT NULL REFERENCES "team" ("id") ON DELETE CASCADE,
  "marked_by_user_id" uuid NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'present',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "attendance_status_check" CHECK ("status" IN ('present', 'late', 'absent'))
);

CREATE UNIQUE INDEX "attendance_user_hackathon_uniq" ON "attendance" ("user_id", "hackathon_id");
CREATE INDEX "attendance_hackathon_idx" ON "attendance" ("hackathon_id");
CREATE INDEX "attendance_team_idx" ON "attendance" ("team_id");

CREATE TABLE "performance_review" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reviewer_id" uuid NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "reviewee_id" uuid NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "hackathon_id" uuid NOT NULL REFERENCES "hackathon" ("id") ON DELETE CASCADE,
  "team_id" uuid NOT NULL REFERENCES "team" ("id") ON DELETE CASCADE,
  "rating" integer NOT NULL,
  "comment" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5),
  CONSTRAINT "review_no_self_check" CHECK ("reviewer_id" <> "reviewee_id"),
  CONSTRAINT "review_comment_len_check" CHECK ("comment" IS NULL OR length("comment") <= 1000)
);

CREATE UNIQUE INDEX "review_reviewer_reviewee_hackathon_uniq" ON "performance_review" ("reviewer_id", "reviewee_id", "hackathon_id");
CREATE INDEX "review_reviewee_idx" ON "performance_review" ("reviewee_id");

CREATE TABLE "cancellation_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "team_id" uuid NOT NULL REFERENCES "team" ("id") ON DELETE CASCADE,
  "hackathon_id" uuid NOT NULL REFERENCES "hackathon" ("id") ON DELETE CASCADE,
  "hours_before_start" integer NOT NULL,
  "is_last_minute" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "cancellation_last_minute_check" CHECK (
    NOT "is_last_minute"
    OR ("hours_before_start" >= 0 AND "hours_before_start" <= 48)
  )
);

CREATE INDEX "cancellation_user_idx" ON "cancellation_history" ("user_id");
CREATE INDEX "cancellation_hackathon_idx" ON "cancellation_history" ("hackathon_id");
