ALTER TABLE "user"
  ADD COLUMN "college_name" text,
  ADD COLUMN "id_verified" boolean NOT NULL DEFAULT false,
  ADD COLUMN "id_verification_status" text NOT NULL DEFAULT 'NOT_VERIFIED',
  ADD COLUMN "id_verification_started_at" timestamptz,
  ADD COLUMN "id_verification_image_path" text,
  ADD COLUMN "id_verification_image_hash" text,
  ADD COLUMN "id_verification_student_hash" text,
  ADD COLUMN "id_verification_confidence" real,
  ADD COLUMN "id_verified_at" timestamptz;

ALTER TABLE "user"
  ADD CONSTRAINT "user_id_verification_status_check"
  CHECK ("id_verification_status" IN (
    'NOT_VERIFIED',
    'PROCESSING',
    'VERIFIED',
    'NEEDS_REVIEW',
    'REJECTED'
  ));

ALTER TABLE "user"
  ADD CONSTRAINT "user_id_verified_status_check"
  CHECK ("id_verified" = ("id_verification_status" = 'VERIFIED'));

CREATE INDEX "user_id_verification_student_hash_idx"
  ON "user" ("id_verification_student_hash");

CREATE TABLE "id_verification_claim" (
  "kind" text NOT NULL,
  "value" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "id_verification_claim_pkey" PRIMARY KEY ("kind", "value"),
  CONSTRAINT "id_verification_claim_kind_check"
    CHECK ("kind" IN ('student', 'image'))
);

CREATE INDEX "id_verification_claim_user_idx"
  ON "id_verification_claim" ("user_id");
