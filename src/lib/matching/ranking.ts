import { cosineSimilarity } from "./semantic";

export type RankingWeights = {
  semantic: number;
  explicitSkill: number;
  role: number;
  keyword: number;
  availability: number;
  completeness: number;
};

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  semantic: 0.45,
  explicitSkill: 0.2,
  role: 0.1,
  keyword: 0.1,
  availability: 0.1,
  completeness: 0.05,
};

export type SearchExplanation = {
  semanticScore: number | null;
  matchedSkills: string[];
  matchedRoles: string[];
  keywordScore: number;
  availabilityScore: number | null;
  completenessScore: number;
  reasons: string[];
};

export type RankingSignals = Omit<SearchExplanation, "reasons"> & {
  explicitSkill: number;
  role: number;
};

export function normalizeCosine(score: number): number {
  return Math.max(0, Math.min(1, (score + 1) / 2));
}

export function normalizedKeywordScore(text: string, terms: string[]): number {
  const haystack = text.toLowerCase();
  const meaningful = terms.filter((term) => term.length > 1);
  if (meaningful.length === 0) return 0;
  return meaningful.filter((term) => haystack.includes(term.toLowerCase())).length / meaningful.length;
}

export function safeSemanticScore(query: number[] | null, candidate: number[] | null): number | null {
  if (!query || !candidate) return null;
  const similarity = cosineSimilarity(query, candidate);
  return similarity === null ? null : normalizeCosine(similarity);
}

export function combineScores(
  signals: RankingSignals,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): number {
  const values: Array<[number | null, number]> = [
    [signals.semanticScore, weights.semantic],
    [signals.explicitSkill > 0 ? signals.explicitSkill : null, weights.explicitSkill],
    [signals.role > 0 ? signals.role : null, weights.role],
    [signals.keywordScore > 0 ? signals.keywordScore : null, weights.keyword],
    [signals.availabilityScore, weights.availability],
    [signals.completenessScore, weights.completeness],
  ];
  const usable = values.filter(([value]) => value !== null);
  const denominator = usable.reduce((sum, [, weight]) => sum + weight, 0);
  if (denominator === 0) return 0;
  return usable.reduce((sum, [value, weight]) => sum + (value ?? 0) * weight, 0) / denominator;
}

export function explainSearchMatch(input: {
  semanticScore: number | null;
  matchedSkills?: string[];
  matchedRoles?: string[];
  keywordScore?: number;
  availabilityScore?: number | null;
  completenessScore?: number;
}): SearchExplanation {
  const matchedSkills = [...new Set(input.matchedSkills ?? [])];
  const matchedRoles = [...new Set(input.matchedRoles ?? [])];
  const keywordScore = input.keywordScore ?? 0;
  const availabilityScore = input.availabilityScore ?? null;
  const completenessScore = input.completenessScore ?? 0;
  const reasons: string[] = [];
  if (matchedSkills.length > 0) reasons.push(`Matched skills: ${matchedSkills.join(", ")}`);
  if (matchedRoles.length > 0) reasons.push(`Matched roles: ${matchedRoles.join(", ")}`);
  if (input.semanticScore !== null) reasons.push(`Semantic relevance: ${Math.round(input.semanticScore * 100)}%`);
  if (keywordScore > 0) reasons.push("Matched query context");
  if (availabilityScore !== null) reasons.push(`Availability: ${Math.round(availabilityScore * 100)}% fit`);
  return {
    semanticScore: input.semanticScore,
    matchedSkills,
    matchedRoles,
    keywordScore,
    availabilityScore,
    completenessScore,
    reasons,
  };
}
