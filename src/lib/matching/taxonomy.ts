import { ROLE_TAXONOMY, SKILLS } from "@/lib/constants";
import type { SkillCategory } from "@/lib/db/schema";
export const SEMANTIC_TAXONOMY_VERSION = "hackmate-taxonomy-v1";
export const SEMANTIC_TEXT_PREPARATION_VERSION = "hackmate-semantic-text-v1";

export type TaxonomySkill = {
  slug: string;
  name: string;
  category: SkillCategory;
  aliases: string[];
  related?: string[];
};

const ADDITIONAL_SKILL_ROWS: Array<[string, string, SkillCategory, string[], string[]?]> = [
  ["javascript", "JavaScript", "frontend", ["js", "ecmascript"]],
  ["java", "Java", "backend", []], ["c", "C", "systems", []],
  ["cpp", "C++", "systems", ["c plus plus"]], ["csharp", "C#", "backend", ["c sharp", "dotnet"]],
  ["go", "Go", "backend", ["golang"]], ["rust", "Rust", "systems", []],
  ["ruby", "Ruby", "backend", []], ["php", "PHP", "backend", []],
  ["swift", "Swift", "mobile", []], ["kotlin", "Kotlin", "mobile", []],
  ["r", "R", "data", []], ["julia", "Julia", "data", []],
  ["scala", "Scala", "data", []], ["sql", "SQL", "databases", []],
  ["solidity", "Solidity", "blockchain", []], ["bash", "Bash", "cloud_devops", ["shell scripting"]],
  ["powershell", "PowerShell", "cloud_devops", []], ["matlab", "MATLAB", "data", []],
  ["lua", "Lua", "systems", []], ["elixir", "Elixir", "backend", []], ["haskell", "Haskell", "systems", []],
  ["css", "CSS", "frontend", []], ["sass", "Sass", "frontend", ["scss"]],
  ["nuxt", "Nuxt", "frontend", []], ["angular", "Angular", "frontend", []],
  ["svelte", "Svelte", "frontend", []], ["sveltekit", "SvelteKit", "frontend", []],
  ["astro", "Astro", "frontend", []], ["remix", "Remix", "frontend", []],
  ["redux", "Redux", "frontend", []], ["zustand", "Zustand", "frontend", []],
  ["tanstack-query", "TanStack Query", "frontend", ["react query"]],
  ["vite", "Vite", "frontend", []], ["webpack", "Webpack", "frontend", []],
  ["accessibility", "Accessibility", "ui_ux_design", ["a11y", "wcag"]],
  ["responsive-design", "Responsive Design", "ui_ux_design", []],
  ["ssr", "SSR", "frontend", ["server-side rendering"]],
  ["ssg", "SSG", "frontend", ["static site generation"]],
  ["web-components", "Web Components", "frontend", []],
  ["nestjs", "NestJS", "backend", ["nest.js"]], ["fastify", "Fastify", "backend", []],
  ["aspnet-core", "ASP.NET Core", "backend", ["asp.net core", ".net core"]],
  ["laravel", "Laravel", "backend", []], ["rails", "Rails", "backend", ["ruby on rails"]],
  ["phoenix", "Phoenix", "backend", []], ["grpc", "gRPC", "backend", []],
  ["websockets", "WebSockets", "backend", ["web sockets"]], ["api-design", "API Design", "backend", []],
  ["authentication", "Authentication", "backend", ["auth"]], ["authorization", "Authorization", "backend", ["access control"]],
  ["microservices", "Microservices", "backend", []], ["serverless", "Serverless", "cloud_devops", []],
  ["event-driven-architecture", "Event-Driven Architecture", "backend", []],
  ["android", "Android", "mobile", []], ["ios", "iOS", "mobile", []], ["swiftui", "SwiftUI", "mobile", []],
  ["jetpack-compose", "Jetpack Compose", "mobile", []], ["kotlin-multiplatform", "Kotlin Multiplatform", "mobile", ["kmp"]],
  ["expo", "Expo", "mobile", []], ["ionic", "Ionic", "mobile", []], ["capacitor", "Capacitor", "mobile", []],
  ["offline-first", "Offline-First Apps", "mobile", []], ["push-notifications", "Push Notifications", "mobile", []],
  ["keras", "Keras", "ai_ml", []], ["xgboost", "XGBoost", "ai_ml", []], ["jax", "JAX", "ai_ml", []],
  ["machine-learning", "Machine Learning", "ai_ml", ["ml"]],
  ["deep-learning", "Deep Learning", "ai_ml", []], ["neural-networks", "Neural Networks", "ai_ml", []],
  ["reinforcement-learning", "Reinforcement Learning", "ai_ml", ["rl"]],
  ["classification", "Classification", "ai_ml", []], ["regression", "Regression", "ai_ml", []],
  ["clustering", "Clustering", "ai_ml", []], ["model-training", "Model Training", "ai_ml", []],
  ["feature-engineering", "Feature Engineering", "ai_ml", []], ["model-evaluation", "Model Evaluation", "ai_ml", []],
  ["mlops", "MLOps", "ai_ml", ["ml ops"]],
  ["gpt", "GPT", "ai_ml", []], ["claude", "Claude", "ai_ml", []], ["gemini", "Gemini", "ai_ml", []],
  ["generative-ai", "Generative AI", "ai_ml", ["genai"]],
  ["llms", "LLMs", "ai_ml", ["llm", "large language models", "large language model"]],
  ["transformers", "Transformers", "ai_ml", []], ["embeddings", "Embeddings", "ai_ml", []],
  ["vector-search", "Vector Search", "ai_ml", []], ["rag", "RAG", "ai_ml", ["retrieval augmented generation"]],
  ["graphrag", "GraphRAG", "ai_ml", []], ["langchain", "LangChain", "ai_ml", []],
  ["langgraph", "LangGraph", "ai_ml", []], ["llamaindex", "LlamaIndex", "ai_ml", ["llama index"]],
  ["hugging-face", "Hugging Face", "ai_ml", ["huggingface"]], ["ollama", "Ollama", "ai_ml", []],
  ["vllm", "vLLM", "ai_ml", []], ["fine-tuning", "Fine-Tuning", "ai_ml", ["finetuning"]],
  ["lora", "LoRA", "ai_ml", []], ["qlora", "QLoRA", "ai_ml", []], ["prompt-engineering", "Prompt Engineering", "ai_ml", []],
  ["structured-outputs", "Structured Outputs", "ai_ml", []], ["function-calling", "Function Calling", "ai_ml", []],
  ["ai-agents", "AI Agents", "ai_ml", ["agentic ai"]], ["multimodal-ai", "Multimodal AI", "ai_ml", []],
  ["guardrails", "AI Guardrails", "ai_ml", []],
  ["numpy", "NumPy", "data", []], ["pandas", "Pandas", "data", []], ["polars", "Polars", "data", []],
  ["apache-spark", "Apache Spark", "data", ["spark"]], ["pyspark", "PySpark", "data", []],
  ["kafka", "Kafka", "data", ["apache kafka"]], ["airflow", "Airflow", "data", ["apache airflow"]],
  ["dagster", "Dagster", "data", []], ["dbt", "dbt", "data", []], ["etl", "ETL", "data", []],
  ["elt", "ELT", "data", []], ["data-pipelines", "Data Pipelines", "data", []], ["data-modeling", "Data Modeling", "data", []],
  ["statistics", "Statistics", "data", []], ["forecasting", "Forecasting", "data", []],
  ["tableau", "Tableau", "data", []], ["power-bi", "Power BI", "data", ["powerbi"]], ["metabase", "Metabase", "data", []],
  ["mysql", "MySQL", "databases", []], ["sqlite", "SQLite", "databases", []], ["redis", "Redis", "databases", []],
  ["dynamodb", "DynamoDB", "databases", []], ["cassandra", "Cassandra", "databases", []],
  ["elasticsearch", "Elasticsearch", "databases", ["elastic search"]], ["opensearch", "OpenSearch", "databases", []],
  ["supabase", "Supabase", "databases", []], ["neon", "Neon", "databases", []], ["pgvector", "pgvector", "databases", []],
  ["pinecone", "Pinecone", "databases", []], ["qdrant", "Qdrant", "databases", []], ["weaviate", "Weaviate", "databases", []],
  ["milvus", "Milvus", "databases", []], ["chroma", "Chroma", "databases", []], ["faiss", "FAISS", "databases", []],
  ["vector-databases", "Vector Databases", "databases", []], ["full-text-search", "Full-Text Search", "databases", []],
  ["semantic-search", "Semantic Search", "databases", []], ["hybrid-search", "Hybrid Search", "databases", []],
  ["indexing", "Indexing", "databases", []], ["query-optimization", "Query Optimization", "databases", []],
  ["schema-design", "Schema Design", "databases", []], ["migrations", "Database Migrations", "databases", []],
  ["transactions", "Transactions", "databases", []],
  ["azure", "Azure", "cloud_devops", []], ["google-cloud", "Google Cloud", "cloud_devops", ["gcp"]],
  ["cloudflare", "Cloudflare", "cloud_devops", []], ["netlify", "Netlify", "cloud_devops", []],
  ["flyio", "Fly.io", "cloud_devops", []], ["railway", "Railway", "cloud_devops", []], ["render", "Render", "cloud_devops", []],
  ["helm", "Helm", "cloud_devops", []], ["pulumi", "Pulumi", "cloud_devops", []], ["ansible", "Ansible", "cloud_devops", []],
  ["nginx", "Nginx", "cloud_devops", []], ["networking", "Networking", "cloud_devops", []],
  ["load-balancing", "Load Balancing", "cloud_devops", []], ["infrastructure-as-code", "Infrastructure as Code", "cloud_devops", ["iac"]],
  ["autoscaling", "Autoscaling", "cloud_devops", []], ["disaster-recovery", "Disaster Recovery", "cloud_devops", []],
  ["git", "Git", "cloud_devops", []], ["github-actions", "GitHub Actions", "cloud_devops", []],
  ["gitlab-ci", "GitLab CI", "cloud_devops", []], ["jenkins", "Jenkins", "cloud_devops", []],
  ["cicd", "CI/CD", "cloud_devops", ["ci cd", "continuous integration"]],
  ["gitops", "GitOps", "cloud_devops", []], ["argo-cd", "Argo CD", "cloud_devops", []],
  ["prometheus", "Prometheus", "cloud_devops", []], ["grafana", "Grafana", "cloud_devops", []],
  ["opentelemetry", "OpenTelemetry", "cloud_devops", ["otel"]], ["sentry", "Sentry", "cloud_devops", []],
  ["datadog", "Datadog", "cloud_devops", []], ["monitoring", "Monitoring", "cloud_devops", []],
  ["tracing", "Tracing", "cloud_devops", []], ["sre", "SRE", "cloud_devops", ["site reliability engineering"]],
  ["incident-response", "Incident Response", "cloud_devops", []], ["performance-optimization", "Performance Optimization", "cloud_devops", []],
  ["owasp", "OWASP", "cybersecurity", []], ["penetration-testing", "Penetration Testing", "cybersecurity", ["pentesting", "pen testing"]],
  ["threat-modeling", "Threat Modeling", "cybersecurity", []], ["oauth", "OAuth", "cybersecurity", ["oauth2"]],
  ["openid-connect", "OpenID Connect", "cybersecurity", ["oidc"]], ["saml", "SAML", "cybersecurity", []],
  ["jwt", "JWT", "cybersecurity", []], ["passkeys", "Passkeys", "cybersecurity", []], ["rbac", "RBAC", "cybersecurity", []],
  ["secrets-management", "Secrets Management", "cybersecurity", []], ["vulnerability-scanning", "Vulnerability Scanning", "cybersecurity", []],
  ["secure-coding", "Secure Coding", "cybersecurity", []], ["zero-trust", "Zero Trust", "cybersecurity", []],
  ["privacy-engineering", "Privacy Engineering", "cybersecurity", []],
  ["operating-systems", "Operating Systems", "research", []], ["concurrency", "Concurrency", "systems", []],
  ["multithreading", "Multithreading", "systems", []], ["memory-management", "Memory Management", "systems", []],
  ["compilers", "Compilers", "systems", []], ["llvm", "LLVM", "systems", []], ["webassembly", "WebAssembly", "systems", ["wasm"]],
  ["wasi", "WASI", "systems", []], ["cmake", "CMake", "systems", []], ["embedded-c", "Embedded C", "hardware", []],
  ["firmware", "Firmware", "hardware", []], ["device-drivers", "Device Drivers", "systems", []], ["arm", "ARM", "systems", []],
  ["risc-v", "RISC-V", "systems", ["riscv"]], ["rtos", "RTOS", "hardware", []], ["performance-profiling", "Performance Profiling", "systems", []],
  ["ros", "ROS", "hardware", ["robot operating system"]], ["ros2", "ROS 2", "hardware", []],
  ["stm32", "STM32", "hardware", []], ["control-systems", "Control Systems", "hardware", []], ["slam", "SLAM", "hardware", []],
  ["sensor-fusion", "Sensor Fusion", "hardware", []], ["drones", "Drones", "hardware", []], ["mqtt", "MQTT", "hardware", []],
  ["fpga", "FPGA", "hardware", []], ["verilog", "Verilog", "hardware", []], ["vhdl", "VHDL", "hardware", []],
  ["ethereum", "Ethereum", "blockchain", []], ["solana", "Solana", "blockchain", []], ["smart-contracts", "Smart Contracts", "blockchain", []],
  ["foundry", "Foundry", "blockchain", []], ["hardhat", "Hardhat", "blockchain", []], ["defi", "DeFi", "blockchain", []],
  ["nfts", "NFTs", "blockchain", []], ["web3", "Web3", "blockchain", []], ["zero-knowledge-proofs", "Zero-Knowledge Proofs", "blockchain", ["zk proofs"]],
  ["unity", "Unity", "research", []], ["unreal-engine", "Unreal Engine", "research", []], ["godot", "Godot", "research", []],
  ["computer-graphics", "Computer Graphics", "research", []], ["opengl", "OpenGL", "research", []], ["vulkan", "Vulkan", "research", []],
  ["shaders", "Shaders", "research", []], ["blender", "Blender", "research", []], ["webgpu", "WebGPU", "research", []],
  ["webgl", "WebGL", "research", []], ["arkit", "ARKit", "research", []], ["arcore", "ARCore", "research", []],
  ["openxr", "OpenXR", "research", []], ["webxr", "WebXR", "research", []],
  ["ui-design", "UI Design", "ui_ux_design", []], ["ux-design", "UX Design", "ui_ux_design", []],
  ["figma", "Figma", "ui_ux_design", []], ["user-research", "User Research", "ui_ux_design", []],
  ["usability-testing", "Usability Testing", "ui_ux_design", []], ["product-management", "Product Management", "product", ["pm"]],
  ["product-strategy", "Product Strategy", "product", []], ["roadmapping", "Roadmapping", "product", []],
  ["unit-testing", "Unit Testing", "research", []], ["integration-testing", "Integration Testing", "research", []],
  ["end-to-end-testing", "End-to-End Testing", "research", ["e2e testing"]], ["tdd", "TDD", "research", []],
  ["jest", "Jest", "research", []], ["vitest", "Vitest", "research", []], ["playwright", "Playwright", "research", []],
  ["cypress", "Cypress", "research", []], ["selenium", "Selenium", "research", []], ["pytest", "Pytest", "research", []],
  ["junit", "JUnit", "research", []], ["postman", "Postman", "research", []], ["load-testing", "Load Testing", "research", []],
  ["fuzz-testing", "Fuzz Testing", "research", []], ["test-automation", "Test Automation", "research", []],
  ["code-review", "Code Review", "product", []], ["open-source", "Open-Source Contributions", "product", []],
  ["technical-documentation", "Technical Documentation", "product", []], ["mentoring", "Mentoring", "product", []],
  ["agile", "Agile", "product", []], ["scrum", "Scrum", "product", []], ["kanban", "Kanban", "product", []],
  ["pair-programming", "Pair Programming", "product", []], ["mvp-development", "MVP Development", "product", []],
  ["bioinformatics", "Bioinformatics", "research", []], ["healthcare-technology", "Healthcare Technology", "research", []],
  ["scientific-computing", "Scientific Computing", "research", []], ["gis", "GIS", "research", ["geospatial systems"]],
  ["climate-tech", "Climate Technology", "research", []], ["fintech", "FinTech", "product", ["financial technology"]],
  ["edtech", "EdTech", "product", []], ["medical-imaging", "Medical Imaging", "research", []],
];

const ADDITIONAL_SKILLS: TaxonomySkill[] = ADDITIONAL_SKILL_ROWS.map(
  ([slug, name, category, aliases, related]) => ({ slug, name, category, aliases, related }),
);
export const SEMANTIC_TAXONOMY = {
  roles: ROLE_TAXONOMY.map(({ slug, name, description, skillCategories }) => ({
    slug,
    name,
    description,
    skillCategories,
  })),
  skills: [
    ...SKILLS.map(({ slug, name, category }) => ({ slug, name, category, aliases: [] as string[], related: [] as string[] })),
    ...ADDITIONAL_SKILLS,
  ],
  aliases: {
    k8s: "kubernetes",
    postgres: "postgresql",
    reactjs: "react",
    "next js": "nextjs",
    ts: "typescript",
    js: "javascript",
    tf: "tensorflow",
  },
} as const;

export type CanonicalTaxonomySkill = {
  slug: string;
  name: string;
  category: SkillCategory;
};

/** Return one stable database record per canonical taxonomy slug. */
export function canonicalTaxonomySkills(): CanonicalTaxonomySkill[] {
  const bySlug = new Map<string, CanonicalTaxonomySkill>();
  for (const skill of SEMANTIC_TAXONOMY.skills) {
    if (!bySlug.has(skill.slug)) {
      bySlug.set(skill.slug, {
        slug: skill.slug,
        name: skill.name,
        category: skill.category,
      });
    }
  }
  return [...bySlug.values()];
}

export function taxonomyAliasMap(): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const skill of SEMANTIC_TAXONOMY.skills) {
    for (const alias of skill.aliases) {
      aliases.set(alias.trim().toLowerCase(), skill.slug);
    }
  }
  for (const [alias, slug] of Object.entries(SEMANTIC_TAXONOMY.aliases)) {
    aliases.set(alias.trim().toLowerCase(), slug);
  }
  return aliases;
}

function resolveAlias(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return SEMANTIC_TAXONOMY.aliases[normalized as keyof typeof SEMANTIC_TAXONOMY.aliases] ?? normalized;
}

export function normalizeSemanticSkills(skills: string[]): string[] {
  const known = new Map(SEMANTIC_TAXONOMY.skills.flatMap((skill) => [
    [skill.slug, skill.name] as const,
    [skill.name.toLowerCase(), skill.name] as const,
    ...skill.aliases.map((alias) => [alias, skill.name] as const),
  ]));
  return [...new Map(skills.map(resolveAlias).map((skill) => [skill, known.get(skill) ?? skill])).values()]
    .sort((left, right) => left.localeCompare(right));
}

export function taxonomyContext(skills: string[], roles: string[]): string {
  const skillSet = new Set(normalizeSemanticSkills(skills).map((skill) => skill.toLowerCase()));
  const roleSet = new Set(roles.map((role) => role.trim().toLowerCase()));
  const matchedSkills = SEMANTIC_TAXONOMY.skills
    .filter((skill) => skillSet.has(skill.slug) || skillSet.has(skill.name.toLowerCase()))
    .map((skill) => `${skill.name} (${skill.category})`);
  const matchedRoles = SEMANTIC_TAXONOMY.roles
    .filter((role) => roleSet.has(role.slug) || roleSet.has(role.name.toLowerCase()))
    .map((role) => role.name);
  return [...matchedRoles, ...matchedSkills].join(", ");
}

export function prepareSemanticText(input: {
  kind: "profile" | "role" | "query" | "team" | "hackathon";
  text?: string | null;
  skills?: string[];
  roles?: string[];
  experienceLevel?: string | null;
  commitment?: string | null;
  priority?: string | null;
}): string {
  const skills = normalizeSemanticSkills(input.skills ?? []);
  const roles = [...new Set((input.roles ?? []).map((role) => role.trim().toLowerCase()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const context = taxonomyContext(skills, roles);
  return [
    `format:${SEMANTIC_TEXT_PREPARATION_VERSION}`,
    `kind:${input.kind}`,
    input.text?.trim() ? `text:${input.text.trim()}` : "",
    `explicit-skills:${skills.length ? skills.join(", ") : "none"}`,
    `explicit-roles:${roles.length ? roles.join(", ") : "none"}`,
    context ? `domain-context:${context}` : "",
    input.experienceLevel ? `experience:${input.experienceLevel}` : "",
    input.commitment ? `commitment:${input.commitment}` : "",
    input.priority ? `priority:${input.priority}` : "",
  ].filter(Boolean).join(" | ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function isPreparedSemanticText(value: string): boolean {
  return value.startsWith(`format:${SEMANTIC_TEXT_PREPARATION_VERSION} | `);
}
