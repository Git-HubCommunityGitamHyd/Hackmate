/**
 * Creates the HackMate database without the `createdb` CLI.
 *
 * Why this exists: `createdb` only ships with a local Postgres installation
 * and is not on PATH on Windows unless you added it yourself (the usual
 * "createdb: command not found" error). This script does the same job with
 * plain SQL, and correctly no-ops for CockroachDB Serverless (where the
 * database is created in the cloud console and DATABASE_URL already points
 * at it).
 *
 * Usage: bun run db:create
 */
import { loadEnv } from "../src/lib/db/load-env";
loadEnv();

import postgres from "postgres";

const DEFAULT_LOCAL_URL = "postgres://postgres@127.0.0.1:5432/hackmate";

function pgErrCode(err: unknown): string | undefined {
  const anyErr = err as { code?: string };
  return anyErr?.code;
}

async function main() {
  const url = process.env.DATABASE_URL || DEFAULT_LOCAL_URL;
  const isCockroach =
    url.includes("cockroachlabs.cloud") || url.includes(".crdb.io");

  if (isCockroach) {
    console.log(
      "CockroachDB Serverless URL detected — the database lives on your\n" +
        "cluster already and migrations create all tables. Nothing to do here.",
    );
    return;
  }

  let dbName = "hackmate";
  let adminUrl: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      console.error(
        "! DATABASE_URL is set but is not a Postgres connection string:\n  " + url +
        "\n  It must start with postgres:// or postgresql://",
      );
      process.exit(1);
    }
    dbName = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "hackmate";
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(dbName)) {
      console.error(`! database name "${dbName}" in DATABASE_URL is not a safe identifier`);
      process.exit(1);
    }
    parsed.pathname = "/postgres"; // maintenance database
    adminUrl = parsed.toString();
  } catch {
    console.error("! DATABASE_URL is not a valid connection URL:\n  " + url);
    process.exit(1);
  }

  console.log(`· checking for database "${dbName}"…`);

  try {
    const sql = postgres(adminUrl, {
      max: 1,
      connect_timeout: 5,
      /* plain local Postgres: no TLS. Keep any explicit sslmode from the URL. */
      ssl: new URL(adminUrl).searchParams.get("sslmode") === "disable" ? false : undefined,
      prepare: false,
    });

    try {
      await sql.unsafe(`CREATE DATABASE ${dbName}`);
      console.log(`✔ database "${dbName}" created`);
    } catch (err) {
      if (pgErrCode(err) === "42P04") {
        console.log(`✔ database "${dbName}" already exists`);
      } else {
        throw err;
      }
    } finally {
      await sql.end();
    }
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error(`! could not reach the Postgres server (${message.split("\n")[0]})`);
    console.error("");
    console.error("  Pick ONE of these two paths:");
    console.error("");
    console.error("  A) Use free CockroachDB Serverless instead (recommended, no install):");
    console.error("     1. https://cockroachlabs.cloud -> Create cluster (Serverless, free)");
    console.error("     2. SQL user + connect -> copy the General connection string");
    console.error("     3. Put it in .env.local as DATABASE_URL=... then: bun run db:migrate");
    console.error("     (db:create is not needed on CockroachDB)");
    console.error("");
    console.error("  B) Install a local Postgres:");
    console.error("     winget install PostgreSQL.PostgreSQL.17");
    console.error("     (or the installer from postgresql.org; note the postgres password");
    console.error("     you choose, and put it in the URL:");
    console.error("     postgres://postgres:YOURPASSWORD@127.0.0.1:5432/hackmate)");
    console.error("     Then run: bun run db:create && bun run db:migrate && bun run db:seed");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
