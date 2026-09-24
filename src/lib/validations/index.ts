import { z } from "zod";
import { ROLE_TAXONOMY, SKILLS } from "@/lib/constants";

export const commitmentSchema = z.enum([
  "casual",
  "serious",
  "aiming_to_qualify",
  "aiming_to_win",
]);
export const experienceSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const recruitmentStatusSchema = z.enum([
  "looking",
  "partially_formed",
  "team_full",
  "not_looking",
]);
export const workStyleSchema = z.enum(["plan_first", "build_first", "hybrid"]);

export const profileSchema = z.object({
  name: z.string().min(2).max(80),
  username: z.string().min(2).max(40).regex(/^[a-z0-9_-]+$/, "lowercase letters, numbers, - _").optional().or(z.literal("")),
  bio: z.string().max(600).optional().or(z.literal("")),
  githubUsername: z.string().max(80).optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  collegeId: z.string().uuid().nullable().optional(),
  graduationYear: z.number().int().min(2000).max(2035).nullable().optional(),
  experienceLevel: experienceSchema,
  commitment: commitmentSchema,
  recruitmentStatus: recruitmentStatusSchema,
  skills: z
    .array(z.object({ slug: z.string(), level: z.number().int().min(1).max(5), isPrimary: z.boolean() }))
    .max(25),
  roles: z.array(z.object({ slug: z.string(), isPrimary: z.boolean() })).max(6),
  availability: z.object({
    weekends: z.boolean(),
    evenings: z.boolean(),
    overnight: z.boolean(),
    remoteOnly: z.boolean(),
    willingToTravel: z.boolean(),
    hoursPerWeek: z.number().int().min(2).max(80),
  }),
  compat: z.object({
    workStyle: workStyleSchema,
    comfortablePresenting: z.boolean(),
    openToIdeaSwaps: z.boolean(),
  }),
});

export const hackathonSchema = z.object({
  name: z.string().min(3).max(120),
  tagline: z.string().max(160).optional().or(z.literal("")),
  description: z.string().max(4000).optional().or(z.literal("")),
  organizer: z.string().max(120).optional().or(z.literal("")),
  startsAt: z.string(), // ISO
  endsAt: z.string(),
  registrationDeadline: z.string().optional().or(z.literal("")),
  teamSizeMin: z.number().int().min(1).max(10),
  teamSizeMax: z.number().int().min(1).max(10),
  /** Prize — free text. Prizes aren't always money: internships, goodies,
   *  credits, hardware all welcome. e.g. "₹1,00,000 pool + internship offers". */
  prizePool: z.string().max(100).optional().or(z.literal("")),
  mode: z.enum(["online", "offline", "hybrid"]),
  location: z.string().max(120).optional().or(z.literal("")),
  themes: z.array(z.string().max(40)).max(8),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

export const teamSchema = z
  .object({
    hackathonId: z.string().uuid(),
    name: z.string().min(2).max(60),
    ideaTitle: z.string().max(120).optional().or(z.literal("")),
    ideaDomain: z.string().max(60).optional().or(z.literal("")),
    ideaDescription: z.string().max(4000).optional().or(z.literal("")),
    ideaAnonymous: z.boolean(),
    commitment: commitmentSchema,
    targetSize: z.number().int().min(2).max(10),
    lookingForIdea: z.boolean(),
    roleSlugs: z.array(z.enum(ROLE_TAXONOMY.map((r) => r.slug) as [string, ...string[]])).max(10),
    skillSlugs: z.array(z.string()).max(15),
  })
  .refine((t) => !t.ideaTitle || t.ideaTitle.length >= 3, {
    message: "Idea title too short",
    path: ["ideaTitle"],
  });

export const joinRequestSchema = z.object({
  message: z.string().min(10, "Tell the team a bit about yourself (10+ chars)").max(500),
  roleSlug: z.string().optional(),
});

export const inviteSchema = z.object({
  userId: z.string().uuid(),
  roleSlug: z.string().optional(),
  message: z.string().max(300).optional().or(z.literal("")),
});

export const taskSchema = z.object({
  title: z.string().min(2).max(120),
  category: z.enum(["registration", "ppt", "repo", "prototype", "video", "submission", "pitch", "other"]),
  dueDate: z.string().optional().or(z.literal("")),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(1000),
});

export const hackathonProfileSchema = z.object({
  hackathonId: z.string().uuid(),
  roleSlug: z.string().optional(),
  motivation: z.string().max(400).optional().or(z.literal("")),
  hasIdea: z.boolean(),
  ideaBlurb: z.string().max(300).optional().or(z.literal("")),
});

export const emergencySchema = z.object({
  enabled: z.boolean(),
  hours: z.number().int().min(6).max(72).default(24),
});
