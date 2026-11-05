import assert from "node:assert/strict";
import test from "node:test";
import {
  combineScores,
  explainSearchMatch,
  normalizeCosine,
  normalizedKeywordScore,
  safeSemanticScore,
} from "./ranking";

test("normalizes cosine values into a bounded semantic score", () => {
  assert.equal(normalizeCosine(-1), 0);
  assert.equal(normalizeCosine(0), 0.5);
  assert.equal(normalizeCosine(1), 1);
});

test("rejects missing and incompatible semantic vectors", () => {
  assert.equal(safeSemanticScore(null, [1, 0]), null);
  assert.equal(safeSemanticScore([1], [1, 0]), null);
  assert.equal(safeSemanticScore([1, 0], [1, 0]), 1);
});

test("combines explicit matches and availability when semantic data is absent", () => {
  const score = combineScores({
    semanticScore: null,
    matchedSkills: [],
    matchedRoles: [],
    explicitSkill: 1,
    role: 1,
    keywordScore: 0,
    availabilityScore: 1,
    completenessScore: 1,
  });
  assert.ok(score > 0.8);
});

test("returns explainable matched skills, roles, and semantic relevance", () => {
  const explanation = explainSearchMatch({
    semanticScore: 0.8,
    matchedSkills: ["React", "React"],
    matchedRoles: ["Frontend"],
    keywordScore: 1,
    availabilityScore: 0.75,
  });
  assert.deepEqual(explanation.matchedSkills, ["React"]);
  assert.ok(explanation.reasons.some((reason) => reason.includes("React")));
  assert.ok(explanation.reasons.some((reason) => reason.includes("80%")));
});

test("scores synonyms only when the parser has already canonicalized them", () => {
  assert.equal(normalizedKeywordScore("Kubernetes cloud deployment", ["k8s"]), 0);
  assert.equal(normalizedKeywordScore("Kubernetes cloud deployment", ["kubernetes"]), 1);
});
