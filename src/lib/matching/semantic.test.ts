import assert from "node:assert/strict";
import test from "node:test";
import {
  cosineSimilarity,
  hashEmbeddingText,
  isCurrentEmbedding,
  profileEmbeddingText,
  SEMANTIC_MODEL_VERSION,
  SEMANTIC_TAXONOMY_VERSION,
  SEMANTIC_TEXT_PREPARATION_VERSION,
  validateEmbedding,
} from "./semantic";
import {
  normalizeSemanticSkills,
  prepareSemanticText,
  SEMANTIC_TAXONOMY,
} from "./taxonomy";

test("validates finite non-zero vectors and rejects invalid vectors", () => {
  assert.equal(validateEmbedding([0.1, -0.2]), true);
  assert.equal(validateEmbedding([]), false);
  assert.equal(validateEmbedding([0, 0]), false);
  assert.equal(validateEmbedding([1, Number.NaN]), false);
});

test("computes cosine similarity only for compatible vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([1], [1, 0]), null);
});

test("invalidates embeddings when source text or configuration changes", () => {
  const source = profileEmbeddingText({ bio: "React developer", skills: ["react"], roles: ["frontend"] });
  const embedding = {
    vector: [0.2, 0.8],
    modelVersion: SEMANTIC_MODEL_VERSION,
    taxonomyVersion: SEMANTIC_TAXONOMY_VERSION,
    preparationVersion: SEMANTIC_TEXT_PREPARATION_VERSION,
    sourceHash: hashEmbeddingText(source),
    status: "ready" as const,
  };
  assert.equal(isCurrentEmbedding(embedding, source), true);
  assert.equal(isCurrentEmbedding(embedding, `${source} changed`), false);
  assert.equal(isCurrentEmbedding({ ...embedding, modelVersion: "old-model" }, source), false);
});

test("normalizes aliases, deduplicates skills, and keeps related context separate", () => {
  assert.deepEqual(normalizeSemanticSkills(["React", "reactjs", "K8s"]), ["Kubernetes", "React"]);
  const prepared = prepareSemanticText({
    kind: "profile",
    skills: ["reactjs", "React"],
    roles: ["frontend"],
  });
  assert.match(prepared, /explicit-skills:react/);
  assert.match(prepared, /domain-context:/);
  assert.equal(SEMANTIC_TAXONOMY.aliases.k8s, "kubernetes");
  assert.equal(prepared.includes("kubernetes"), false);
});

test("uses a stable preparation version for profile and role inputs", () => {
  const profile = prepareSemanticText({ kind: "profile", skills: ["K8s"], roles: ["devops"] });
  const role = prepareSemanticText({ kind: "role", skills: ["kubernetes"], roles: ["cloud-devops"] });
  assert.notEqual(profile, role);
  assert.match(profile, new RegExp(SEMANTIC_TEXT_PREPARATION_VERSION));
});
