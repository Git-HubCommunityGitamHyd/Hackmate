import { createHash } from "node:crypto";
import {
  prepareSemanticText,
  SEMANTIC_TAXONOMY_VERSION,
  SEMANTIC_TEXT_PREPARATION_VERSION,
} from "./taxonomy";

export const SEMANTIC_MODEL_VERSION = "needle3";
export { SEMANTIC_TEXT_PREPARATION_VERSION };
export { SEMANTIC_TAXONOMY_VERSION };

export type StoredEmbedding = {
  vector: number[] | null;
  modelVersion: string | null;
  taxonomyVersion: string | null;
  preparationVersion: string | null;
  sourceHash: string | null;
  status: "ready" | "missing" | "invalid" | "stale";
};

export function normalizeEmbeddingText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function hashEmbeddingText(value: string): string {
  return createHash("sha256").update(normalizeEmbeddingText(value)).digest("hex");
}

export function validateEmbedding(vector: unknown): vector is number[] {
  return Array.isArray(vector) &&
    vector.length > 0 &&
    vector.length <= 4096 &&
    vector.every((value) => typeof value === "number" && Number.isFinite(value)) &&
    vector.some((value) => value !== 0);
}

export function isCurrentEmbedding(
  embedding: StoredEmbedding | null | undefined,
  sourceText: string,
): embedding is StoredEmbedding & { vector: number[] } {
  return !!embedding &&
    embedding.status === "ready" &&
    embedding.modelVersion === SEMANTIC_MODEL_VERSION &&
    embedding.taxonomyVersion === SEMANTIC_TAXONOMY_VERSION &&
    embedding.preparationVersion === SEMANTIC_TEXT_PREPARATION_VERSION &&
    embedding.sourceHash === hashEmbeddingText(sourceText) &&
    validateEmbedding(embedding.vector);
}

export function hasUsableStoredEmbedding(
  embedding: Pick<StoredEmbedding, "vector" | "modelVersion" | "taxonomyVersion" | "preparationVersion" | "status"> | null | undefined,
): embedding is {
  vector: number[];
  modelVersion: string | null;
  taxonomyVersion: string | null;
  preparationVersion: string | null;
  status: "ready" | "missing" | "invalid" | "stale";
} {
  return !!embedding &&
    embedding.status === "ready" &&
    embedding.modelVersion === SEMANTIC_MODEL_VERSION &&
    embedding.taxonomyVersion === SEMANTIC_TAXONOMY_VERSION &&
    embedding.preparationVersion === SEMANTIC_TEXT_PREPARATION_VERSION &&
    validateEmbedding(embedding.vector);
}

export function cosineSimilarity(left: number[], right: number[]): number | null {
  if (!validateEmbedding(left) || !validateEmbedding(right) || left.length !== right.length) return null;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i += 1) {
    dot += left[i] * right[i];
    leftNorm += left[i] ** 2;
    rightNorm += right[i] ** 2;
  }
  if (leftNorm === 0 || rightNorm === 0) return null;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function profileEmbeddingText(input: {
  bio?: string | null;
  skills: string[];
  roles: string[];
  experienceLevel?: string | null;
  commitment?: string | null;
}): string {
  return prepareSemanticText({ ...input, kind: "profile" });
}

export function roleEmbeddingText(input: {
  role: string;
  skills: string[];
  priority?: string | null;
}): string {
  return prepareSemanticText({ kind: "role", roles: [input.role], skills: input.skills, priority: input.priority });
}
