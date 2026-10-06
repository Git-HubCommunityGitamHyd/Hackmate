CREATE UNIQUE INDEX IF NOT EXISTS "user_badge_user_badge_uniq"
  ON "user_badge" ("user_id", "badge_id");