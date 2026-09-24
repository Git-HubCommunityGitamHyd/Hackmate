import type {
  Commitment,
  ExperienceLevel,
  RecruitmentStatus,
  SkillCategory,
} from "@/lib/db/schema";
import type { MatchBreakdown } from "@/lib/matching/engine";
import type { CompositionReport } from "@/lib/matching/composition";

/* Shared DTOs between API routes and the client. */

export interface SkillDTO {
  id: string;
  slug: string;
  name: string;
  category: SkillCategory;
  level?: number;
  isPrimary?: boolean;
}

export interface RoleDTO {
  id: string;
  slug: string;
  name: string;
  isPrimary?: boolean;
}

export interface PersonCardDTO {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  collegeName: string | null;
  experienceLevel: ExperienceLevel | null;
  commitment: Commitment | null;
  recruitmentStatus: RecruitmentStatus | null;
  emergencyAvailable: boolean;
  githubUsername: string | null;
  topSkills: SkillDTO[];
  roles: RoleDTO[];
  hoursPerWeek: number;
  matchScore?: number;
  matchReasons?: string[];
  matchBreakdown?: MatchBreakdown;
}

export interface HackathonCardDTO {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  mode: "online" | "offline" | "hybrid";
  location: string | null;
  themes: string[];
  prizePool: string | null;
  startsAt: string;
  endsAt: string;
  registrationDeadline: string | null;
  teamSizeMin: number;
  teamSizeMax: number;
  status: "upcoming" | "ongoing" | "completed";
  organizer: string | null;
  recruitingTeamCount: number;
  peopleLookingCount: number;
}

export interface TeamCardDTO {
  id: string;
  name: string;
  hackathonId: string;
  hackathonName: string;
  hackathonSlug: string;
  ideaDomain: string | null;
  ideaTitle: string | null;
  ideaAnonymous: boolean;
  commitment: Commitment;
  targetSize: number;
  memberCount: number;
  status: "recruiting" | "full" | "disbanded";
  lookingForIdea: boolean;
  openRoles: string[];
  missingSkills: string[];
  completeness: number;
  matchScore?: number;
  matchReasons?: string[];
  memberNames: string[];
  createdAt: string;
}

export interface TeamDetailDTO extends TeamCardDTO {
  ideaDescription: string | null;
  chatUrl: string | null;
  repoUrl: string | null;
  members: {
    userId: string;
    name: string;
    image: string | null;
    isAdmin: boolean;
    role: RoleDTO | null;
    topSkills: SkillDTO[];
    experienceLevel: ExperienceLevel | null;
    githubUsername: string | null;
  }[];
  rolesNeeded: { slug: string; name: string; priority: "must" | "nice" }[];
  skillsWanted: SkillDTO[];
  composition: CompositionReport;
  viewer: {
    isMember: boolean;
    isAdmin: boolean;
    hasPendingRequest: boolean;
    hasPendingInvite: boolean;
    matchScore: number | null;
    matchReasons: string[];
  };
  tasks: {
    id: string;
    title: string;
    category: string;
    done: boolean;
    dueDate: string | null;
    assigneeName: string | null;
  }[];
}

export interface ProfileDTO extends PersonCardDTO {
  email: string;
  username: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubData: {
    login: string;
    publicRepos: number;
    totalStars: number;
    topLanguages: { name: string; percentage: number }[];
    recentRepoNames: string[];
    activeThisYear: boolean;
  } | null;
  availability: {
    weekends: boolean;
    evenings: boolean;
    overnight: boolean;
    remoteOnly: boolean;
    willingToTravel: boolean;
    hoursPerWeek: number;
  } | null;
  compat: {
    workStyle: string | null;
    comfortablePresenting: boolean;
    openToIdeaSwaps: boolean;
  } | null;
  skills: SkillDTO[];
  badges: { slug: string; name: string; icon: string; category: string; hackathonName: string | null }[];
  history: {
    hackathonName: string;
    hackathonId: string;
    projectName: string | null;
    placement: number | null;
    repoUrl: string | null;
    technologies: string[];
    teamId: string | null;
    teammates: string[];
  }[];
  previousTeammates: { id: string; name: string; image: string | null; count: number }[];
  collegeName: string | null;
  graduationYear: number | null;
}
