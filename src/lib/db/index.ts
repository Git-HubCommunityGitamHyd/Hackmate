import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database client — Drizzle ORM over postgres-js.
 *
 * In production this connects to CockroachDB Serverless (Postgres
 * wire-compatible) via DATABASE_URL:
 *   postgresql://<user>:<password>@<cluster>.cockroachlabs.cloud:26257/hackmate?sslmode=verify-full
 *
 * Connection pool is sized for serverless (1 connection per lambda; Vercel
 * reuses warm instances). CockroachDB Serverless handles multiplexing.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and configure it.",
  );
}

const isCockroach = connectionString.includes("cockroachlabs.cloud");

const client = postgres(connectionString, {
  max: isCockroach ? 2 : 10, // keep small on serverless
  idle_timeout: 20,
  connect_timeout: 10,
  // CockroachDB Serverless uses verified TLS; local dev uses none.
  ssl: isCockroach ? "verify-full" : undefined,
  prepare: false, // CockroachDB + serverless-safe: use simple query protocol
});

export const db = drizzle(client, { schema });
export { schema };
