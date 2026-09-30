import { readFileSync } from "node:fs";
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
 *
 * TLS notes (the most common CockroachDB + Node failure):
 *   Node does not ship with the CA that signs CockroachDB Serverless
 *   certificates, so a strict `sslmode=verify-full` fails with
 *   "unable to verify the first certificate" unless you supply the root
 *   cert yourself. Resolution:
 *     - default: encrypted TLS, certificate not pinned (equivalent to
 *       sslmode=require) — works everywhere, zero setup
 *     - optional strict mode: set DATABASE_SSL_ROOT_CERT to the path of
 *       the downloaded ccrl root certificate for full verification
 */
const envUrl = process.env.DATABASE_URL;

if (!envUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and configure it.",
  );
}
/* Narrowed to `string` once so closures below see the non-optional type. */
const connectionString: string = envUrl;

function resolveSsl(): ResolvedSsl {
  /* Explicit root cert → full verification (sslmode=verify-full equivalent). */
  const rootCertPath = process.env.DATABASE_SSL_ROOT_CERT;
  if (rootCertPath) {
    try {
      return { ca: readFileSync(rootCertPath, "utf-8"), rejectUnauthorized: true };
    } catch (err) {
      throw new Error(
        `DATABASE_SSL_ROOT_CERT is set but could not be read (${(err as Error).message}). ` +
          "Remove the variable or point it at the downloaded CockroachDB root certificate.",
      );
    }
  }

  let sslmode = "";
  try {
    sslmode = new URL(connectionString).searchParams.get("sslmode") ?? "";
  } catch {
    /* Not a parseable URL — fall through to the host-based default below. */
  }

  if (sslmode === "disable") return false;
  /* Any other sslmode (require, prefer, allow, verify-ca, verify-full) on
     any host: encrypted without pinning. Local Postgres with no sslmode
     stays plain. */
  if (sslmode) return "require";
  return connectionString.includes("cockroachlabs.cloud") ? "require" : undefined;
}

const isCockroach = connectionString.includes("cockroachlabs.cloud");

/* Acceptable ssl option shapes for postgres-js (kept loose on purpose). */
type ResolvedSsl = false | "require" | { ca: string; rejectUnauthorized: boolean } | undefined;

const client = postgres(connectionString, {
  max: isCockroach ? 2 : 10, // keep small on serverless
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: resolveSsl(),
  prepare: false, // CockroachDB + serverless-safe: use simple query protocol
});

export const db = drizzle(client, { schema });
export { schema };
