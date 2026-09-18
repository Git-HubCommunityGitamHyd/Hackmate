/**
 * Applies drizzle-kit-generated SQL migrations (./drizzle/*.sql).
 * Works identically against local Postgres and CockroachDB Serverless
 * (just change DATABASE_URL).
 *
 * Usage: bun run scripts/migrate.ts
 */
import { config } from "dotenv";
config({ override: true });

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

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

  const isCockroach = url.includes("cockroachlabs.cloud");
  const sql = postgres(url, {
    max: 1,
    ssl: isCockroach ? "verify-full" : undefined,
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
