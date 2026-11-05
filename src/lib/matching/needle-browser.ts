"use client";

export const NEEDLE_MODEL_VERSION = "needle3";
let sessionPromise: Promise<{ embed(input?: string): Promise<Float32Array> }> | null = null;
const vectorCache = new Map<string, Promise<number[]>>();

export type NeedleDownloadProgress = {
  loaded: number;
  total?: number;
  percentage?: number;
};

export type NeedleEmbedding = {
  vector: number[];
  dimension: number;
  model: string;
};

function validateVector(vector: Float32Array, label: string): number[] {
  if (!(vector instanceof Float32Array) || vector.length === 0) {
    throw new Error(`${label} embedding is empty or has an invalid shape.`);
  }
  const values = Array.from(vector);
  if (!values.every(Number.isFinite)) {
    throw new Error(`${label} embedding contains non-finite values.`);
  }
  if (values.every((value) => value === 0)) {
    throw new Error(`${label} embedding is an invalid all-zero vector.`);
  }
  return values;
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    throw new Error("Embeddings must have the same non-zero dimension.");
  }
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  if (leftNorm === 0 || rightNorm === 0) {
    throw new Error("Cannot compare a zero-norm embedding.");
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export async function embedNeedlePair(
  firstText: string,
  secondText: string,
  onProgress?: (progress: NeedleDownloadProgress) => void,
): Promise<{
  first: NeedleEmbedding;
  second: NeedleEmbedding;
  similarity: number;
}> {
  if (!firstText.trim() || !secondText.trim()) {
    throw new Error("Both texts are required.");
  }

  const { createNeedle } = await import("cactus-needle/browser");
  const needle = await createNeedle({
    cache: true,
    onDownloadProgress: onProgress,
  });
  try {
    const first = validateVector(await needle.embed(firstText), "First");
    const second = validateVector(await needle.embed(secondText), "Second");
    if (first.length !== second.length) {
      throw new Error("Needle returned embeddings with different dimensions.");
    }
    return {
      first: { vector: first, dimension: first.length, model: NEEDLE_MODEL_VERSION },
      second: { vector: second, dimension: second.length, model: NEEDLE_MODEL_VERSION },
      similarity: cosineSimilarity(first, second),
    };
  } finally {
    await needle.close();
  }
}

async function getNeedleSession() {
  const { createNeedle } = await import("cactus-needle/browser");
  sessionPromise ??= createNeedle({ cache: true });
  return sessionPromise;
}

export async function embedNeedleText(text: string): Promise<number[]> {
  const cached = vectorCache.get(text);
  if (cached) return cached;
  const pending = (async () => {
    const vector = await (await getNeedleSession()).embed(text);
    return validateVector(vector, "Text");
  })();
  vectorCache.set(text, pending);
  return pending;
}

export async function saveProfileEmbedding(sourceText: string): Promise<void> {
  const vector = await embedNeedleText(sourceText);
  const response = await fetch("/api/users/me/embedding", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vector, sourceText }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not save semantic profile embedding.");
  }

}

export async function saveRoleEmbedding(
  teamId: string,
  roleId: string,
  sourceText: string,
): Promise<void> {
  const vector = await embedNeedleText(sourceText);
  const response = await fetch(`/api/teams/${teamId}/roles/${roleId}/embedding`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vector, sourceText }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not save semantic role embedding.");
  }
}

export async function saveEntityEmbedding(
  entityType: "team" | "hackathon",
  entityId: string,
  sourceText: string,
): Promise<void> {
  const vector = await embedNeedleText(sourceText);
  const response = await fetch("/api/search/embeddings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType, entityId, vector, sourceText }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Could not save semantic ${entityType} embedding.`);
  }
}
