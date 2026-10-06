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
  collegeName: z.string().max(160).optional().or(z.literal("")),
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

export const bestWorkSchema = z.object({
  resultId: z.string().uuid().nullable().optional(),
  githubProject: z
    .object({
      title: z.string().trim().min(1).max(120),
      description: z.string().trim().min(1).max(600),
      repoUrl: z.string().url().regex(/^https:\/\/github\.com\/[^/]+\/[^/#?]+\/?$/, "Enter a public GitHub repository URL"),
      technologies: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
    })
    .optional(),
}).refine(
  (value) =>
    (value.resultId !== undefined) !== (value.githubProject !== undefined),
  { message: "Choose exactly one best-work option" },
);

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
  /** Prize - free text. Prizes aren't always money: internships, goodies,
   *  credits, hardware all welcome. e.g. "₹1,00,000 pool + internship offers". */
  prizePool: z.string().max(100).optional().or(z.literal("")),
  mode: z.enum(["online", "offline", "hybrid"]),
  location: z.string().max(120).optional().or(z.literal("")),
  themes: z.array(z.string().max(40)).max(8),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

export const teamSchema = z
  .object({
    /** Optional: idea-first teams skip the event and attach one later. */
    hackathonId: z.string().uuid().nullable().optional(),
    name: z.string().min(2).max(60),
    ideaTitle: z.string().max(120).optional().or(z.literal("")),
    ideaDomain: z.string().max(60).optional().or(z.literal("")),
    ideaDescription: z.string().max(4000).optional().or(z.literal("")),
    ideaAnonymous: z.boolean(),
    commitment: commitmentSchema,
    targetSize: z.number().int().min(2).max(10),
    lookingForIdea: z.boolean(),
    roleSlugs: z.array(z.enum(ROLE_TAXONOMY.map((r) => r.slug) as [string, ...string[]])).max(10),
    /** Parallel to roleSlugs (by index): how critical each open role is. */
    rolePriorities: z.array(z.enum(["must", "nice"])).max(10).optional(),
    skillSlugs: z.array(z.string()).max(15),
  })
  .refine((t) => !t.ideaTitle || t.ideaTitle.length >= 3, {
    message: "Idea title too short",
    path: ["ideaTitle"],
  })
  .refine((t) => !!t.hackathonId || !!(t.ideaTitle && t.ideaTitle.length >= 3), {
    message: "Pick a hackathon, or describe your idea to post it first",
    path: ["hackathonId"],
  });

export const teamPatchSchema = z
  .object({
    /** Attach (or switch) the event for an idea-first team. */
    hackathonId: z.string().uuid().nullable().optional(),
    name: z.string().min(2).max(60).optional(),
    ideaTitle: z.string().max(120).optional(),
    ideaDomain: z.string().max(60).optional(),
    ideaDescription: z.string().max(4000).optional(),
    ideaAnonymous: z.boolean().optional(),
    commitment: commitmentSchema.optional(),
    targetSize: z.number().int().min(2).max(10).optional(),
    lookingForIdea: z.boolean().optional(),
    status: z.enum(["recruiting", "full", "disbanded"]).optional(),
    chatUrl: z.string().url().optional(),
    repoUrl: z.string().url().optional(),
  })
  .refine((t) => Object.keys(t).length > 0, { message: "Nothing to update" });

export const teamResultSchema = z.object({
  projectName: z.string().min(2).max(120),
  projectUrl: z.string().url().optional().or(z.literal("")),
  devpostUrl: z.string().url().optional().or(z.literal("")),
  repoUrl: z.string().url().optional().or(z.literal("")),
  /** Numeric placement: 1 = winner, 2-3 = podium/finalist, null = participated. */
  placement: z.number().int().min(1).max(999).nullable().optional(),
  technologies: z.array(z.string().max(40)).max(12).optional(),
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

/* ------------------------------------------------------------------ */
/* Track-Record Validations                                           */
/* ------------------------------------------------------------------ */

export const attendanceStatusSchema = z.enum(["present", "late", "absent"]);

export const attendancePostSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  hackathonId: z.string().uuid("Invalid hackathon ID"),
  status: attendanceStatusSchema,
});

export const reviewPostSchema = z.object({
  revieweeId: z.string().uuid("Invalid reviewee ID"),
  hackathonId: z.string().uuid("Invalid hackathon ID"),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Minimum rating is 1")
    .max(5, "Maximum rating is 5"),
  comment: z
    .string()
    .max(1000, "Comment cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
});
