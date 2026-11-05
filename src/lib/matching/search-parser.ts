import { ROLE_TAXONOMY } from "@/lib/constants";
import { normalizeSemanticSkills, SEMANTIC_TAXONOMY } from "./taxonomy";

export interface ParsedQuery {
  raw: string;
  terms: string[];
  skillSlugs: string[];
  explicitSkills: string[];
  contextualConcepts: string[];
  relatedSuggestions: string[];
  excludedSkills: string[];
  roleSlugs: string[];
  teamSize?: number;
  intent: "people" | "teams" | "any";
}

const CONTEXT_PHRASES: Array<[RegExp, string[]]> = [
  [/\b(?:builds?|designs?|develops?)\s+(?:web\s+)?apis?\b/i, ["API Design"]],
  [/\bdeploys?\s+(?:web\s+)?apps?\b/i, ["CI/CD", "Cloud / DevOps"]],
  [/\btrains?\s+(?:ai|ml|machine learning)\s+models?\b/i, ["Model Training", "MLOps"]],
  [/\bbuilds?\s+(?:ai\s+)?chatbots?\b/i, ["LLMs", "NLP"]],
  [/\boptimi[sz]es?\s+sql\s+queries?\b/i, ["Query Optimization", "SQL"]],
  [/\bdesigns?\s+user\s+interfaces?\b/i, ["UI Design", "UX Design"]],
];

const NEGATION_RE = /\b(?:not|without|avoid|except|excluding|exclude|no)\s+(?:any\s+)?$/i;

function normalizedQuery(raw: string): string {
  return raw.toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[._/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function boundaryPattern(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}(?=$|[^a-z0-9+#])`, "i");
}

function isNegated(query: string, start: number): boolean {
  return NEGATION_RE.test(query.slice(Math.max(0, start - 28), start));
}

function skillMatches(query: string) {
  const normalized = normalizedQuery(query);
  const hits: Array<{ slug: string; name: string; index: number; length: number }> = [];
  for (const skill of SEMANTIC_TAXONOMY.skills) {
    const globalAliases = Object.entries(SEMANTIC_TAXONOMY.aliases)
      .filter(([, slug]) => slug === skill.slug)
      .map(([alias]) => alias);
    const names = [skill.name, skill.slug, ...skill.aliases, ...globalAliases];
    for (const name of names) {
      const match = boundaryPattern(normalizedQuery(name)).exec(normalized);
      const start = match ? match.index + match[1].length : -1;
      if (match && !isNegated(normalized, start)) {
        hits.push({ slug: skill.slug, name: skill.name, index: start, length: match[0].length - match[1].length });
        break;
      }
    }
  }
  return hits
    .sort((a, b) => a.index - b.index || b.length - a.length)
    .filter((hit, index, all) => !all.slice(0, index).some((previous) =>
      hit.index < previous.index + previous.length && previous.index < hit.index + hit.length));
}

export function parseSearchQuery(raw: string): ParsedQuery {
  const q = raw.trim();
  const normalized = normalizedQuery(q);
  const hits = skillMatches(q);
  const explicitBySlug = new Map<string, string>();
  for (const hit of hits) explicitBySlug.set(hit.slug, hit.name);
  const excludedSkills = normalizeSemanticSkills(
    SEMANTIC_TAXONOMY.skills
      .filter((skill) => skillMatches(`not ${skill.name}`).length === 0 && /\b(?:not|without|avoid|except|excluding|exclude|no)\s+/i.test(normalized))
      .filter((skill) => {
        const index = normalized.indexOf(normalizedQuery(skill.name));
        return index >= 0 && isNegated(normalized, index);
      })
      .map((skill) => skill.name),
  );
  const contextualConcepts = [...new Set(
    CONTEXT_PHRASES.filter(([pattern]) => pattern.test(q)).flatMap(([, concepts]) => concepts),
  )].filter((concept) => !explicitBySlug.has(normalizedQuery(concept).replace(/\s/g, "-")));
  const relatedSuggestions = [...new Set(
    [...explicitBySlug.keys()]
      .flatMap((slug) => SEMANTIC_TAXONOMY.skills.find((skill) => skill.slug === slug)?.related ?? []),
  )].filter((concept) => !explicitBySlug.has(normalizedQuery(concept).replace(/\s/g, "-")));

  const roleSlugs = new Set<string>();
  for (const role of ROLE_TAXONOMY) {
    if (boundaryPattern(normalizedQuery(role.name)).test(normalized) || boundaryPattern(role.slug).test(normalized)) {
      roleSlugs.add(role.slug);
    }
  }
  const teamSizeMatch = normalized.match(/(\d+)\s*(?:person|people|member)s?(?:\s+team)?/) ?? normalized.match(/team\s+(?:of|with)\s+(\d+)/);
  const teamSize = teamSizeMatch ? Number(teamSizeMatch[1]) : undefined;
  const peopleIntent = /(need|want|looking for|seeking)\s+(someone|a|an|people|person)/i.test(q) ||
    /\b(designer|developer|dev|engineer|pitcher|researcher)\b/i.test(q) || roleSlugs.size > 0;
  const teamIntent = /\bteams?\b/i.test(q) && !peopleIntent;
  const explicitSkills = [...explicitBySlug.values()].sort((a, b) => a.localeCompare(b));
  const consumed = new Set(explicitSkills.flatMap((skill) => normalizedQuery(skill).split(" ")));
  const terms = normalized.split(" ").filter((term) => term.length > 1 && !consumed.has(term) && !/^\d+$/.test(term));

  return {
    raw,
    terms,
    skillSlugs: [...explicitBySlug.keys()].sort(),
    explicitSkills,
    contextualConcepts,
    relatedSuggestions,
    excludedSkills,
    roleSlugs: [...roleSlugs].sort(),
    teamSize,
    intent: peopleIntent ? "people" : teamIntent ? "teams" : "any",
  };
}

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
    ROLE_TAXONOMY.find((role) => role.slug === roleSlug)?.skillCategories.forEach((category) => categories.add(category));
  }
  return {
    q: parsed.terms.length > 0 ? parsed.terms.join(" ") : undefined,
    skillSlugs: parsed.skillSlugs,
    roleSlugs: parsed.roleSlugs,
    categories: [...categories],
    teamSize: parsed.teamSize,
  };
}
