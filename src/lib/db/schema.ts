import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Auth.js v5 tables (Drizzle adapter) — user table is extended below  */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "user",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // --- Auth.js adapter fields ---
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    // --- HackMate profile fields ---
    /** Platform access level. "admin" can post/edit/delete hackathons.
     *  Promoted automatically at sign-in when the email is in ADMIN_EMAILS. */
    role: text("role").$type<UserRole>().notNull().default("user"),
    username: text("username"),
    bio: text("bio"),
    githubUsername: text("github_username"),
    githubData: jsonb("github_data").$type<GithubSummary | null>(),
    linkedinUrl: text("linkedin_url"),
    portfolioUrl: text("portfolio_url"),
    collegeId: uuid("college_id").references(() => colleges.id),
    graduationYear: integer("graduation_year"),
    experienceLevel: text("experience_level").$type<ExperienceLevel>(),
    commitment: text("commitment").$type<Commitment>(),
    recruitmentStatus: text("recruitment_status")
      .$type<RecruitmentStatus>()
      .default("looking"),
    activelyLooking: boolean("actively_looking").default(true),
    emergencyAvailableUntil: timestamp("emergency_available_until", {
      withTimezone: true,
    }),
    onboarded: boolean("onboarded").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("user_recruitment_idx").on(t.recruitmentStatus),
    index("user_college_idx").on(t.collegeId),
  ],
);

export const accounts = pgTable(
  "account",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "email">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "session",
  {
    sessionToken: text("session_token").notNull().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ------------------------------------------------------------------ */
/* Taxonomies: skills + roles (normalized, indexable junction tables)  */
/* ------------------------------------------------------------------ */

export const skills = pgTable(
  "skill",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").$type<SkillCategory>().notNull(),
  },
  (t) => [index("skill_category_idx").on(t.category)],
);

export const roleTaxonomy = pgTable("role_taxonomy", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  skillCategories: jsonb("skill_categories").$type<string[]>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ------------------------------------------------------------------ */
/* User profile detail tables                                          */
/* ------------------------------------------------------------------ */

export const userSkills = pgTable(
  "user_skill",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: integer("level").notNull().default(3), // 1..5
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.skillId] }),
    index("user_skill_skill_idx").on(t.skillId),
  ],
);

export const userRoles = pgTable(
  "user_role",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roleTaxonomy.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    index("user_role_role_idx").on(t.roleId),
  ],
);

export const availability = pgTable("availability", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  weekends: boolean("weekends").notNull().default(true),
  evenings: boolean("evenings").notNull().default(true),
  overnight: boolean("overnight").notNull().default(false),
  remoteOnly: boolean("remote_only").notNull().default(false),
  willingToTravel: boolean("willing_to_travel").notNull().default(true),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  hoursPerWeek: integer("hours_per_week").notNull().default(20),
});

export const compatAnswers = pgTable("compat_answers", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  workStyle: text("work_style").$type<"plan_first" | "build_first" | "hybrid">(),
  comfortablePresenting: boolean("comfortable_presenting").notNull().default(false),
  openToIdeaSwaps: boolean("open_to_idea_swaps").notNull().default(true),
});

/* ------------------------------------------------------------------ */
/* Communities                                                         */
/* ------------------------------------------------------------------ */

export const colleges = pgTable("college", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  city: text("city"),
  emailDomain: text("email_domain"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clubs = pgTable("club", {
  id: uuid("id").defaultRandom().primaryKey(),
  collegeId: uuid("college_id").references(() => colleges.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  githubUrl: text("github_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Hackathons                                                          */
/* ------------------------------------------------------------------ */

export const hackathons = pgTable(
  "hackathon",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    organizer: text("organizer"),
    collegeId: uuid("college_id").references(() => colleges.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    registrationDeadline: timestamp("registration_deadline", {
      withTimezone: true,
    }),
    teamSizeMin: integer("team_size_min").notNull().default(1),
    teamSizeMax: integer("team_size_max").notNull().default(4),
    prizePool: text("prize_pool"),
    mode: text("mode").$type<"online" | "offline" | "hybrid">().notNull(),
    location: text("location"),
    themes: jsonb("themes").$type<string[]>().notNull().default([]),
    websiteUrl: text("website_url"),
    logoUrl: text("logo_url"),
    status: text("status")
      .$type<"upcoming" | "ongoing" | "completed">()
      .notNull()
      .default("upcoming"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("hackathon_starts_idx").on(t.startsAt)],
);

/** Hackathon-specific profile: "I want to do ML at this event, backend at that one." */
export const hackathonProfiles = pgTable(
  "hackathon_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hackathonId: uuid("hackathon_id")
      .notNull()
      .references(() => hackathons.id, { onDelete: "cascade" }),
    preferredRoleId: uuid("preferred_role_id").references(
      () => roleTaxonomy.id,
    ),
    motivation: text("motivation"),
    hasIdea: boolean("has_idea").notNull().default(false),
    ideaBlurb: text("idea_blurb"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("hackathon_profile_uniq").on(t.userId, t.hackathonId),
    index("hackathon_profile_hack_idx").on(t.hackathonId),
  ],
);

/* ------------------------------------------------------------------ */
/* Teams                                                               */
/* ------------------------------------------------------------------ */

export const teams = pgTable(
  "team",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hackathonId: uuid("hackathon_id")
      .notNull()
      .references(() => hackathons.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ideaTitle: text("idea_title"),
    ideaDomain: text("idea_domain"), // revealed in anonymous preview
    ideaDescription: text("idea_description"), // full idea (members only)
    ideaAnonymous: boolean("idea_anonymous").notNull().default(true),
    commitment: text("commitment").$type<Commitment>().notNull(),
    targetSize: integer("target_size").notNull().default(4),
    status: text("status")
      .$type<"recruiting" | "full" | "disbanded">()
      .notNull()
      .default("recruiting"),
    lookingForIdea: boolean("looking_for_idea").notNull().default(false),
    chatUrl: text("chat_url"), // external WhatsApp/Discord link after formation
    repoUrl: text("repo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("team_hackathon_idx").on(t.hackathonId),
    index("team_status_idx").on(t.status),
  ],
);

export const teamMembers = pgTable(
  "team_member",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").references(() => roleTaxonomy.id),
    isAdmin: boolean("is_admin").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.userId] }),
    index("team_member_user_idx").on(t.userId),
  ],
);

/** Roles the team wants to fill — powers the completeness meter + gap analysis. */
export const teamRolesNeeded = pgTable(
  "team_role_needed",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roleTaxonomy.id, { onDelete: "cascade" }),
    priority: text("priority")
      .$type<"must" | "nice">()
      .notNull()
      .default("must"),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.roleId] })],
);

/** Skills the team is explicitly looking for. */
export const teamSkillsWanted = pgTable(
  "team_skill_wanted",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.skillId] })],
);

/* ------------------------------------------------------------------ */
/* Communication: join requests, invites, chat                         */
/* ------------------------------------------------------------------ */

export const joinRequests = pgTable(
  "join_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").references(() => roleTaxonomy.id),
    message: text("message"),
    status: text("status")
      .$type<"pending" | "accepted" | "declined">()
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("join_request_uniq").on(t.teamId, t.userId),
    index("join_request_user_idx").on(t.userId),
  ],
);

export const invites = pgTable(
  "invite",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").references(() => roleTaxonomy.id),
    message: text("message"),
    status: text("status")
      .$type<"pending" | "accepted" | "declined">()
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("invite_uniq").on(t.teamId, t.userId),
    index("invite_user_idx").on(t.userId),
  ],
);

export const messages = pgTable(
  "message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("message_team_idx").on(t.teamId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Team workspace                                                      */
/* ------------------------------------------------------------------ */

export const tasks = pgTable(
  "task",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category")
      .$type<TaskCategory>()
      .notNull()
      .default("other"),
    done: boolean("done").notNull().default(false),
    dueDate: timestamp("due_date", { withTimezone: true }),
    assigneeId: uuid("assignee_id").references(() => users.id),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("task_team_idx").on(t.teamId)],
);

/* ------------------------------------------------------------------ */
/* Reputation                                                          */
/* ------------------------------------------------------------------ */

export const badges = pgTable("badge", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("award"), // Lucide icon name
  category: text("category")
    .$type<"participation" | "achievement" | "social">()
    .notNull(),
});

export const userBadges = pgTable(
  "user_badge",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    hackathonId: uuid("hackathon_id").references(() => hackathons.id, {
      onDelete: "set null",
    }),
    awardedWithUserId: uuid("awarded_with_user_id").references(
      (): AnyPgColumn => users.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("user_badge_user_idx").on(t.userId)],
);

export const hackathonResults = pgTable(
  "hackathon_result",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hackathonId: uuid("hackathon_id")
      .notNull()
      .references(() => hackathons.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    projectName: text("project_name"),
    projectUrl: text("project_url"),
    devpostUrl: text("devpost_url"),
    repoUrl: text("repo_url"),
    placement: integer("placement"),
    technologies: jsonb("technologies").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("hackathon_result_user_idx").on(t.userId),
    index("hackathon_result_team_idx").on(t.teamId),
  ],
);

/* ------------------------------------------------------------------ */
/* Bookmarks + notifications                                           */
/* ------------------------------------------------------------------ */

export const bookmarks = pgTable(
  "bookmark",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type")
      .$type<"team" | "person" | "hackathon">()
      .notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetId] })],
);

export const notifications = pgTable(
  "notification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<
        | "join_request"
        | "invite"
        | "request_accepted"
        | "request_declined"
        | "deadline"
        | "team_update"
        | "system"
      >()
      .notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notification_user_idx").on(t.userId, t.read)],
);

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type UserRole = "user" | "admin";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Commitment =
  | "casual"
  | "serious"
  | "aiming_to_qualify"
  | "aiming_to_win";
export type RecruitmentStatus =
  | "looking"
  | "partially_formed"
  | "team_full"
  | "not_looking";
export type SkillCategory =
  | "frontend"
  | "backend"
  | "ai_ml"
  | "cloud_devops"
  | "ui_ux_design"
  | "pitching"
  | "product"
  | "hardware"
  | "cybersecurity"
  | "research";
export type TaskCategory =
  | "registration"
  | "ppt"
  | "repo"
  | "prototype"
  | "video"
  | "submission"
  | "pitch"
  | "other";

export interface GithubSummary {
  login: string;
  avatarUrl: string;
  publicRepos: number;
  totalStars: number;
  topLanguages: { name: string; percentage: number }[];
  recentRepoNames: string[];
  activeThisYear: boolean;
  fetchedAt: string;
}

export type User = typeof users.$inferSelect;
export type Hackathon = typeof hackathons.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type RoleTaxonomy = typeof roleTaxonomy.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Message = typeof messages.$inferSelect;
