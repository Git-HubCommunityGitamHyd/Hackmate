import type { SkillCategory } from "./db/schema";

/* ------------------------------------------------------------------ */
/* Role taxonomy — powers gap analysis / Team Composition Intelligence */
/* ------------------------------------------------------------------ */

export interface RoleDef {
  slug: string;
  name: string;
  description: string;
  skillCategories: SkillCategory[];
  icon: string;
}

export const ROLE_TAXONOMY: RoleDef[] = [
  { slug: "frontend", name: "Frontend", description: "Builds the interface users touch", skillCategories: ["frontend"], icon: "monitor" },
  { slug: "backend", name: "Backend", description: "APIs, databases, server logic", skillCategories: ["backend"], icon: "server" },
  { slug: "ai-ml", name: "AI / ML", description: "Models, data pipelines, intelligence", skillCategories: ["ai_ml"], icon: "brain" },
  { slug: "cloud-devops", name: "Cloud / DevOps", description: "Deploys and keeps it running", skillCategories: ["cloud_devops"], icon: "cloud" },
  { slug: "ui-ux-design", name: "UI/UX Design", description: "Designs flows, wireframes, polish", skillCategories: ["ui_ux_design"], icon: "palette" },
  { slug: "pitching", name: "Pitching", description: "Tells the story, wins the judges", skillCategories: ["pitching"], icon: "megaphone" },
  { slug: "product", name: "Product", description: "Scope, roadmap, user research", skillCategories: ["product"], icon: "compass" },
  { slug: "hardware", name: "Hardware", description: "Physical builds, sensors, IoT", skillCategories: ["hardware"], icon: "cpu" },
  { slug: "cybersecurity", name: "Cybersecurity", description: "Secures it, breaks it (ethically)", skillCategories: ["cybersecurity"], icon: "shield" },
  { slug: "research", name: "Research", description: "Deep dives, papers, experiments", skillCategories: ["research"], icon: "flask" },
];

/* ------------------------------------------------------------------ */
/* Skills taxonomy (seed list; category maps to roles)                 */
/* ------------------------------------------------------------------ */

export interface SkillDef {
  slug: string;
  name: string;
  category: SkillCategory;
}

export const SKILLS: SkillDef[] = [
  // frontend
  { slug: "react", name: "React", category: "frontend" },
  { slug: "nextjs", name: "Next.js", category: "frontend" },
  { slug: "typescript", name: "TypeScript", category: "frontend" },
  { slug: "tailwind", name: "Tailwind CSS", category: "frontend" },
  { slug: "vue", name: "Vue", category: "frontend" },
  { slug: "html-css", name: "HTML/CSS", category: "frontend" },
  { slug: "react-native", name: "React Native", category: "frontend" },
  { slug: "flutter", name: "Flutter", category: "frontend" },
  { slug: "dart", name: "Dart", category: "frontend" },
  // backend
  { slug: "nodejs", name: "Node.js", category: "backend" },
  { slug: "express", name: "Express", category: "backend" },
  { slug: "fastapi", name: "FastAPI", category: "backend" },
  { slug: "django", name: "Django", category: "backend" },
  { slug: "flask", name: "Flask", category: "backend" },
  { slug: "spring-boot", name: "Spring Boot", category: "backend" },
  { slug: "postgresql", name: "PostgreSQL", category: "backend" },
  { slug: "mongodb", name: "MongoDB", category: "backend" },
  { slug: "graphql", name: "GraphQL", category: "backend" },
  { slug: "rest-apis", name: "REST APIs", category: "backend" },
  { slug: "firebase", name: "Firebase", category: "backend" },
  // ai_ml
  { slug: "python", name: "Python", category: "ai_ml" },
  { slug: "pytorch", name: "PyTorch", category: "ai_ml" },
  { slug: "tensorflow", name: "TensorFlow", category: "ai_ml" },
  { slug: "scikit-learn", name: "scikit-learn", category: "ai_ml" },
  { slug: "llm-finetuning", name: "LLMs / Fine-tuning", category: "ai_ml" },
  { slug: "computer-vision", name: "Computer Vision", category: "ai_ml" },
  { slug: "nlp", name: "NLP", category: "ai_ml" },
  { slug: "pandas-numpy", name: "Pandas / NumPy", category: "ai_ml" },
  // cloud_devops
  { slug: "aws", name: "AWS", category: "cloud_devops" },
  { slug: "gcp", name: "GCP", category: "cloud_devops" },
  { slug: "docker", name: "Docker", category: "cloud_devops" },
  { slug: "kubernetes", name: "Kubernetes", category: "cloud_devops" },
  { slug: "cicd", name: "CI/CD", category: "cloud_devops" },
  { slug: "terraform", name: "Terraform", category: "cloud_devops" },
  { slug: "vercel", name: "Vercel", category: "cloud_devops" },
  { slug: "linux", name: "Linux", category: "cloud_devops" },
  // ui_ux_design
  { slug: "figma", name: "Figma", category: "ui_ux_design" },
  { slug: "design-systems", name: "Design Systems", category: "ui_ux_design" },
  { slug: "prototyping", name: "Prototyping", category: "ui_ux_design" },
  { slug: "motion-design", name: "Motion Design", category: "ui_ux_design" },
  { slug: "user-research", name: "User Research", category: "ui_ux_design" },
  // pitching
  { slug: "pitch-decks", name: "Pitch Decks", category: "pitching" },
  { slug: "storytelling", name: "Storytelling", category: "pitching" },
  { slug: "demo-videos", name: "Demo Videos", category: "pitching" },
  { slug: "public-speaking", name: "Public Speaking", category: "pitching" },
  // product
  { slug: "product-strategy", name: "Product Strategy", category: "product" },
  { slug: "roadmapping", name: "Roadmapping", category: "product" },
  { slug: "user-stories", name: "User Stories", category: "product" },
  { slug: "market-research", name: "Market Research", category: "product" },
  // hardware
  { slug: "arduino", name: "Arduino", category: "hardware" },
  { slug: "raspberry-pi", name: "Raspberry Pi", category: "hardware" },
  { slug: "esp32", name: "ESP32", category: "hardware" },
  { slug: "sensors", name: "Sensors / IoT", category: "hardware" },
  { slug: "pcb-design", name: "PCB Design", category: "hardware" },
  // cybersecurity
  { slug: "pen-testing", name: "Pen Testing", category: "cybersecurity" },
  { slug: "owasp", name: "OWASP", category: "cybersecurity" },
  { slug: "cryptography", name: "Cryptography", category: "cybersecurity" },
  { slug: "network-security", name: "Network Security", category: "cybersecurity" },
  // research
  { slug: "paper-writing", name: "Paper Writing", category: "research" },
  { slug: "literature-review", name: "Literature Review", category: "research" },
  { slug: "experiment-design", name: "Experiment Design", category: "research" },
];

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

export const COMMITMENT_LEVELS = [
  { value: "casual", label: "Casual", hint: "Learn and have fun" },
  { value: "serious", label: "Serious", hint: "Ship something real" },
  { value: "aiming_to_qualify", label: "Aiming to qualify", hint: "Top 10 or bust" },
  { value: "aiming_to_win", label: "Aiming to win", hint: "First place, full send" },
] as const;

export const RECRUITMENT_STATUSES = [
  { value: "looking", label: "Looking for team", tone: "emerald" },
  { value: "partially_formed", label: "Partially formed", tone: "amber" },
  { value: "team_full", label: "Team full", tone: "zinc" },
  { value: "not_looking", label: "Not looking", tone: "zinc" },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner", hint: "First or second hackathon" },
  { value: "intermediate", label: "Intermediate", hint: "A few hackathons in" },
  { value: "advanced", label: "Advanced", hint: "Veteran, mentor energy" },
] as const;

export const SKILL_CATEGORY_META: Record<SkillCategory, { label: string; color: string }> = {
  frontend: { label: "Frontend", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  backend: { label: "Backend", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
  ai_ml: { label: "AI/ML", color: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
  cloud_devops: { label: "Cloud", color: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300 border-lime-200 dark:border-lime-800" },
  ui_ux_design: { label: "Design", color: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800" },
  pitching: { label: "Pitching", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  product: { label: "Product", color: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800" },
  hardware: { label: "Hardware", color: "bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-300 border-stone-300 dark:border-stone-700" },
  cybersecurity: { label: "Security", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800" },
  research: { label: "Research", color: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800" },
};

/** Default workspace checklist inserted for every new team. */
export const DEFAULT_TASKS: { title: string; category: "registration" | "ppt" | "repo" | "prototype" | "video" | "submission" | "pitch" }[] = [
  { title: "Register the team on the hackathon portal", category: "registration" },
  { title: "Finalize idea & problem statement", category: "ppt" },
  { title: "Create GitHub repo + set up project", category: "repo" },
  { title: "Build working prototype", category: "prototype" },
  { title: "Record demo video", category: "video" },
  { title: "Submit before the deadline", category: "submission" },
  { title: "Prepare pitch deck", category: "pitch" },
];

export const BADGE_SEED = [
  { slug: "completed-hackathon", name: "Completed Hackathon", description: "Stayed till submission", icon: "check-circle", category: "participation" as const },
  { slug: "built-project", name: "Built Project", description: "Shipped a working project", icon: "hammer", category: "participation" as const },
  { slug: "finalist", name: "Finalist", description: "Reached the final round", icon: "medal", category: "achievement" as const },
  { slug: "winner", name: "Winner", description: "Won the hackathon", icon: "trophy", category: "achievement" as const },
  { slug: "worked-together", name: "Worked Together", description: "Teammates who shipped together", icon: "users", category: "social" as const },
];
