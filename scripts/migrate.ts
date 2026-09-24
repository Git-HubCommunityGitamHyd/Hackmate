/**
 * Applies drizzle-kit-generated SQL migrations (./drizzle/*.sql).
 * Works identically against local Postgres and CockroachDB Serverless
 * (just change DATABASE_URL).
 *
 * Usage: bun run scripts/migrate.ts
 */
import { config } from "dotenv";
config({ override: true });

import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

/** Same TLS resolution as the app client (see src/lib/db/index.ts). */
function resolveSsl(url: string): false | "require" | { ca: string; rejectUnauthorized: boolean } | undefined {
  const rootCertPath = process.env.DATABASE_SSL_ROOT_CERT;
  if (rootCertPath) {
    return { ca: readFileSync(rootCertPath, "utf-8"), rejectUnauthorized: true };
  }
  let sslmode = "";
  try {
    sslmode = new URL(url).searchParams.get("sslmode") ?? "";
  } catch {
    /* not a parseable URL */
  }
  if (sslmode === "disable") return false;
  if (sslmode) return "require";
  return url.includes("cockroachlabs.cloud") ? "require" : undefined;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const dir = path.resolve(process.cwd(), "drizzle");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  if (files.length === 0) {
    console.log("No migration files found in ./drizzle");
    process.exit(0);
  }

  const sql = postgres(url, {
    max: 1,
    ssl: resolveSsl(url),
    prepare: false,
  });

  /* Bookkeeping table (idempotent). */
  await sql`
    create table if not exists __migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = new Set(
    (await sql`select name from __migrations`).map((r) => r.name as string),
  );

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`· ${file} — already applied`);
      continue;
    }
    console.log(`· applying ${file}…`);
    const content = await readFile(path.join(dir, file), "utf8");
    try {
      await sql.unsafe(content);
      await sql`insert into __migrations (name) values (${file})`;
      console.log(`✔ ${file}`);
    } catch (err) {
      console.error(`✘ ${file} failed:`, err);
      process.exit(1);
    }
  }

  console.log("✔ migrations complete");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
