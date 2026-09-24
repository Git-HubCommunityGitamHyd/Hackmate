import { SKILLS, ROLE_TAXONOMY } from "@/lib/constants";

/**
 * Natural-language search parser — deterministic, no AI.
 *
 * Understands queries like:
 *   "Need someone who knows Next.js and has ML experience for a 4-person team"
 *   "looking for a backend dev with AWS for HackVerse"
 *   "designer who can pitch, weekends only"
 *
 * Extracts: skill slugs, roles, team size, and search intent (people vs teams).
 */

export interface ParsedQuery {
  raw: string;
  terms: string[]; // leftover free-text terms
  skillSlugs: string[]; // matched skill slugs (from SKILLS)
  roleSlugs: string[]; // matched role slugs
  teamSize?: number; // "4-person team", "team of 5"
  intent: "people" | "teams" | "any"; // "need someone" → people, "team" alone → teams
}

const SKILL_ALIASES: Record<string, string> = {
  ml: "scikit-learn",
  ai: "llm-finetuning",
  "machine learning": "scikit-learn",
  "deep learning": "pytorch",
  llm: "llm-finetuning",
  llms: "llm-finetuning",
  aws: "aws",
  postgres: "postgresql",
  sql: "postgresql",
  mongo: "mongodb",
  k8s: "kubernetes",
  reactjs: "react",
  "next js": "nextjs",
  "react.js": "react",
  figma: "figma",
  tailwindcss: "tailwind",
};

const ROLE_KEYWORDS: Record<string, string> = {
  frontend: "frontend",
  frontenddeveloper: "frontend",
  backend: "backend",
  backenddeveloper: "backend",
  devops: "cloud-devops",
  cloud: "cloud-devops",
  designer: "ui-ux-design",
  design: "ui-ux-design",
  ui: "ui-ux-design",
  ux: "ui-ux-design",
  ml: "ai-ml",
  ai: "ai-ml",
  pitcher: "pitching",
  pitch: "pitching",
  pm: "product",
  product: "product",
  hardware: "hardware",
  security: "cybersecurity",
  researcher: "research",
};

export function parseSearchQuery(raw: string): ParsedQuery {
  const q = raw.toLowerCase().trim();
  const tokens = q.split(/[^a-z0-9+#.]+/).filter(Boolean);
  const joined = tokens.join(" ");

  const skillSlugs = new Set<string>();
  const consumed = new Set<number>();

  // Multi-word skill names first ("machine learning", "next js")
  for (const skill of SKILLS) {
    const lower = skill.name.toLowerCase();
    if (lower.includes(" ") || lower.includes("/")) {
      const idx = joined.indexOf(lower);
      if (idx >= 0 && raw.toLowerCase().includes(lower)) skillSlugs.add(skill.slug);
    }
  }
  // Alias multi-word phrases
  for (const [phrase, slug] of Object.entries(SKILL_ALIASES)) {
    if (phrase.includes(" ") && q.includes(phrase)) skillSlugs.add(slug);
  }

  // Single-token skills + aliases + roles
  tokens.forEach((tok, i) => {
    const skill = SKILLS.find((s) => s.name.toLowerCase() === tok || s.slug === tok);
    if (skill) {
      skillSlugs.add(skill.slug);
      consumed.add(i);
      return;
    }
    const alias = SKILL_ALIASES[tok];
    if (alias && !alias.includes(" ")) {
      const target = SKILLS.find((s) => s.slug === alias);
      if (target) skillSlugs.add(target.slug);
      consumed.add(i);
      return;
    }
  });

  const roleSlugs = new Set<string>();
  tokens.forEach((tok, i) => {
    const roleKey = ROLE_KEYWORDS[tok] ?? ROLE_KEYWORDS[tok.replace(/\./g, "")];
    if (roleKey && ROLE_TAXONOMY.some((r) => r.slug === roleKey)) {
      roleSlugs.add(roleKey);
      consumed.add(i);
    }
  });

  // Team size: "4-person team", "team of 5", "4 person"
  let teamSize: number | undefined;
  const sizeMatch = q.match(/(\d+)\s*(?:-|\s)?\s*(?:person|people|member)s?\s*(?:team)?/) ??
    q.match(/team\s*(?:of|with)\s*(\d+)/);
  if (sizeMatch) teamSize = parseInt(sizeMatch[1], 10);

  // Intent detection
  const peopleIntent = /(need|want|looking for|seeking)\s+(someone|a|an|people|person)/.test(q) ||
    /\b(designer|developer|dev|engineer|pitcher|researcher)\b/.test(q) ||
    roleSlugs.size > 0;
  const teamIntent = /\bteams?\b/.test(q) && !peopleIntent;

  const terms = tokens.filter((_, i) => !consumed.has(i)).filter((t) => !/^\d+$/.test(t));

  return {
    raw,
    terms,
    skillSlugs: [...skillSlugs],
    roleSlugs: [...roleSlugs],
    teamSize,
    intent: peopleIntent ? "people" : teamIntent ? "teams" : "any",
  };
}

/** Turn a parsed query into structured DB filters. */
export interface StructuredFilters {
  q?: string;
  skillSlugs: string[];
  roleSlugs: string[];
  categories: string[];
  teamSize?: number;
}

export function toStructuredFilters(parsed: ParsedQuery): StructuredFilters {
  const categories = new Set<string>();
  for (const roleSlug of parsed.roleSlugs) {
    const role = ROLE_TAXONOMY.find((r) => r.slug === roleSlug);
    role?.skillCategories.forEach((c) => categories.add(c));
  }
  return {
    q: parsed.terms.length > 0 ? parsed.terms.join(" ") : undefined,
    skillSlugs: parsed.skillSlugs,
    roleSlugs: parsed.roleSlugs,
    categories: [...categories],
    teamSize: parsed.teamSize,
  };
}
