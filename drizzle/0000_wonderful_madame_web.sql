CREATE TABLE "account" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"weekends" boolean DEFAULT true NOT NULL,
	"evenings" boolean DEFAULT true NOT NULL,
	"overnight" boolean DEFAULT false NOT NULL,
	"remote_only" boolean DEFAULT false NOT NULL,
	"willing_to_travel" boolean DEFAULT true NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"hours_per_week" integer DEFAULT 20 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text DEFAULT 'award' NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "badge_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bookmark" (
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmark_user_id_target_type_target_id_pk" PRIMARY KEY("user_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE "club" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"college_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"github_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "college" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"city" text,
	"email_domain" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "college_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "compat_answers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"work_style" text,
	"comfortable_presenting" boolean DEFAULT false NOT NULL,
	"open_to_idea_swaps" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hackathon_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"preferred_role_id" uuid,
	"motivation" text,
	"has_idea" boolean DEFAULT false NOT NULL,
	"idea_blurb" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hackathon_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"team_id" uuid,
	"project_name" text,
	"project_url" text,
	"devpost_url" text,
	"repo_url" text,
	"placement" integer,
	"technologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hackathon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"organizer" text,
	"college_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"registration_deadline" timestamp with time zone,
	"team_size_min" integer DEFAULT 1 NOT NULL,
	"team_size_max" integer DEFAULT 4 NOT NULL,
	"prize_pool" text,
	"mode" text NOT NULL,
	"location" text,
	"themes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"website_url" text,
	"logo_url" text,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hackathon_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"role_id" uuid,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "join_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_taxonomy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"skill_categories" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "role_taxonomy_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "skill_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"due_date" timestamp with time zone,
	"assignee_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid,
	"is_admin" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_member_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "team_role_needed" (
	"team_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"priority" text DEFAULT 'must' NOT NULL,
	CONSTRAINT "team_role_needed_team_id_role_id_pk" PRIMARY KEY("team_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "team_skill_wanted" (
	"team_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "team_skill_wanted_team_id_skill_id_pk" PRIMARY KEY("team_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"name" text NOT NULL,
	"idea_title" text,
	"idea_domain" text,
	"idea_description" text,
	"idea_anonymous" boolean DEFAULT true NOT NULL,
	"commitment" text NOT NULL,
	"target_size" integer DEFAULT 4 NOT NULL,
	"status" text DEFAULT 'recruiting' NOT NULL,
	"looking_for_idea" boolean DEFAULT false NOT NULL,
	"chat_url" text,
	"repo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"hackathon_id" uuid,
	"awarded_with_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_role_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "user_skill" (
	"user_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"level" integer DEFAULT 3 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_skill_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"username" text,
	"bio" text,
	"github_username" text,
	"github_data" jsonb,
	"linkedin_url" text,
	"portfolio_url" text,
	"college_id" uuid,
	"graduation_year" integer,
	"experience_level" text,
	"commitment" text,
	"recruitment_status" text DEFAULT 'looking',
	"actively_looking" boolean DEFAULT true,
	"emergency_available_until" timestamp with time zone,
	"onboarded" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_token" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club" ADD CONSTRAINT "club_college_id_college_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."college"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compat_answers" ADD CONSTRAINT "compat_answers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hackathon_profile" ADD CONSTRAINT "hackathon_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hackathon_profile" ADD CONSTRAINT "hackathon_profile_hackathon_id_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hackathon_profile" ADD CONSTRAINT "hackathon_profile_preferred_role_id_role_taxonomy_id_fk" FOREIGN KEY ("preferred_role_id") REFERENCES "public"."role_taxonomy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hackathon_result" ADD CONSTRAINT "hackathon_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hackathon_result" ADD CONSTRAINT "hackathon_result_hackathon_id_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hackathon_result" ADD CONSTRAINT "hackathon_result_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hackathon" ADD CONSTRAINT "hackathon_college_id_college_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."college"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hackathon" ADD CONSTRAINT "hackathon_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_role_id_role_taxonomy_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role_taxonomy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_role_id_role_taxonomy_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role_taxonomy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_role_id_role_taxonomy_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role_taxonomy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_role_needed" ADD CONSTRAINT "team_role_needed_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_role_needed" ADD CONSTRAINT "team_role_needed_role_id_role_taxonomy_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role_taxonomy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_skill_wanted" ADD CONSTRAINT "team_skill_wanted_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_skill_wanted" ADD CONSTRAINT "team_skill_wanted_skill_id_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_hackathon_id_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_badge_id_badge_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_hackathon_id_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."hackathon"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_awarded_with_user_id_user_id_fk" FOREIGN KEY ("awarded_with_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_role_taxonomy_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role_taxonomy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skill" ADD CONSTRAINT "user_skill_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skill" ADD CONSTRAINT "user_skill_skill_id_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_college_id_college_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."college"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hackathon_profile_uniq" ON "hackathon_profile" USING btree ("user_id","hackathon_id");--> statement-breakpoint
CREATE INDEX "hackathon_profile_hack_idx" ON "hackathon_profile" USING btree ("hackathon_id");--> statement-breakpoint
CREATE INDEX "hackathon_result_user_idx" ON "hackathon_result" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hackathon_result_team_idx" ON "hackathon_result" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "hackathon_starts_idx" ON "hackathon" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_uniq" ON "invite" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "invite_user_idx" ON "invite" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "join_request_uniq" ON "join_request" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "join_request_user_idx" ON "join_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_team_idx" ON "message" USING btree ("team_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "skill_category_idx" ON "skill" USING btree ("category");--> statement-breakpoint
CREATE INDEX "task_team_idx" ON "task" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_member_user_idx" ON "team_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_hackathon_idx" ON "team" USING btree ("hackathon_id");--> statement-breakpoint
CREATE INDEX "team_status_idx" ON "team" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_badge_user_idx" ON "user_badge" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_role_idx" ON "user_role" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_skill_skill_idx" ON "user_skill" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "user_recruitment_idx" ON "user" USING btree ("recruitment_status");--> statement-breakpoint
CREATE INDEX "user_college_idx" ON "user" USING btree ("college_id");