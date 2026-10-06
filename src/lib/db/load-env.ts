import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

/**
 * Env loader for standalone scripts (tsx: `db:migrate`, `db:seed`, `db:create`).
 *
 * Next.js loads `.env.local` automatically when the app runs, but standalone
 * scripts do not - tsx only injects a plain `.env`. Without this helper the
 * scripts crash with "DATABASE_URL not set" even though `.env.local` is fully
 * configured, because they look at the wrong file.
 *
 * Loads both `.env` and `.env.local` (when present) in Next.js precedence
 * order: `.env.local` wins over `.env`. Values override the process
 * environment on purpose - some hosts export stale DATABASE_URL values into
 * the shell that would otherwise beat your config file.
 *
 * Also detects the classic Windows corruption: PowerShell's `>>` / `echo`
 * redirect rewrites files as UTF-16, which dotenv cannot read (every variable
 * silently disappears). We warn loudly instead of failing silently.
 */
export function loadEnv(): void {
  for (const file of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    try {
      const head = readFileSync(path, "utf8");
      if (head.includes("\0")) {
        console.warn(
          `! ${file} contains NUL bytes - it was probably rewritten as UTF-16 by a PowerShell ` +
            `"echo ... >>" redirect. Recreate ${file} with a text editor (VS Code or Notepad) ` +
            `and set variables as KEY=value lines.`,
        );
        continue;
      }
    } catch {
      /* unreadable - let dotenv surface the real error */
    }

    config({ path, override: true, quiet: true });
  }
}
