import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchQuery } from "./search-parser";
import { canonicalTaxonomySkills, taxonomyAliasMap } from "./taxonomy";

const cases: Array<{ query: string; explicit: string[] }> = [
  { query: "Need a React and TypeScript frontend developer", explicit: ["React", "TypeScript"] },
  { query: "Build APIs with Python, FastAPI, PostgreSQL and Redis", explicit: ["FastAPI", "PostgreSQL", "Python", "Redis"] },
  { query: "Looking for someone with PyTorch, TensorFlow, NLP and computer vision", explicit: ["Computer Vision", "NLP", "PyTorch", "TensorFlow"] },
  { query: "Need an LLM engineer experienced with RAG, LangChain, embeddings and vector search", explicit: ["Embeddings", "LangChain", "LLMs", "RAG", "Vector Search"] },
  { query: "Deploy apps using Docker, k8s, Terraform and GitHub Actions", explicit: ["Docker", "GitHub Actions", "Kubernetes", "Terraform"] },
  { query: "Mobile developer using React Native, Flutter, SwiftUI and Expo", explicit: ["Expo", "Flutter", "React Native", "SwiftUI"] },
  { query: "Security engineer familiar with OAuth2, JWT, OWASP and threat modeling", explicit: ["JWT", "OAuth", "OWASP", "Threat Modeling"] },
  { query: "Data engineer with Pandas, NumPy, Spark, Kafka, Airflow and dbt", explicit: ["Airflow", "Apache Spark", "dbt", "Kafka", "NumPy", "Pandas"] },
  { query: "Designer who knows Figma, accessibility, responsive design and design systems", explicit: ["Accessibility", "Design Systems", "Figma", "Responsive Design"] },
  { query: "Build chatbots, optimize SQL queries, and deploy apps", explicit: ["SQL"] },
];

for (const { query, explicit } of cases) {
  test(`extracts every explicit skill: ${query}`, () => {
    const parsed = parseSearchQuery(query);
    assert.deepEqual(parsed.explicitSkills, explicit);
    assert.equal(new Set(parsed.skillSlugs).size, parsed.skillSlugs.length);
  });
}

test("keeps conversational context separate from explicit skills", () => {
  const parsed = parseSearchQuery("Build chatbots and deploy apps with Python");
  assert.deepEqual(parsed.explicitSkills, ["Python"]);
  assert.ok(parsed.contextualConcepts.includes("LLMs"));
  assert.ok(parsed.contextualConcepts.includes("CI/CD"));
  assert.ok(!parsed.explicitSkills.includes("LLMs"));
});

test("normalizes aliases and preserves negation", () => {
  const parsed = parseSearchQuery("Need ReactJS, k8s and OAuth2, but not Docker");
  assert.deepEqual(parsed.explicitSkills, ["Kubernetes", "OAuth", "React"]);
  assert.ok(parsed.excludedSkills.includes("Docker"));
  assert.ok(!parsed.explicitSkills.includes("Docker"));
});

test("handles empty, long, and duplicate-heavy queries without truncating", () => {
  assert.deepEqual(parseSearchQuery("").explicitSkills, []);
  const parsed = parseSearchQuery(
    "JavaScript TypeScript Python Java Go Rust Ruby PHP Swift Kotlin Dart R Julia Scala SQL Solidity Bash PowerShell Docker Kubernetes AWS Azure GCP React Vue Angular Svelte",
  );
  assert.equal(parsed.explicitSkills.length, 27);
  assert.equal(new Set(parsed.explicitSkills).size, parsed.explicitSkills.length);
});

test("covers canonical database records and aliases across taxonomy categories", () => {
  const skills = canonicalTaxonomySkills();
  const bySlug = new Map(skills.map((skill) => [skill.slug, skill]));
  assert.equal(skills.length, bySlug.size);
  for (const slug of ["react", "flutter", "pytorch", "kafka", "postgresql", "kubernetes", "oauth", "ros", "ethereum", "figma", "pytest", "fintech"]) {
    assert.ok(bySlug.has(slug), `missing canonical database skill: ${slug}`);
  }
  const aliases = taxonomyAliasMap();
  assert.equal(aliases.get("k8s"), "kubernetes");
  assert.equal(aliases.get("oauth2"), "oauth");
  assert.equal(aliases.get("ml"), "machine-learning");
  assert.equal(aliases.get("genai"), "generative-ai");
  for (const slug of aliases.values()) assert.ok(bySlug.has(slug), `alias target is not seeded: ${slug}`);
  assert.equal(parseSearchQuery("Find a k8s, Kafka, and Flutter developer").skillSlugs.sort().join(","), "flutter,kafka,kubernetes");
});
