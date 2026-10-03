/**
 * Post-build hygiene: production must never ship browser source maps.
 *
 * Turbopack currently emits one .map for the legacy polyfill chunk even
 * with browser source maps disabled. This script walks .next/static and
 * deletes every .map file after `next build`, so the deployed output
 * never exposes source (even vendored source) through a public URL.
 *
 * Invoked automatically by `bun run build` / `npm run build`.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(process.cwd(), ".next", "static");
let removed = 0;

(function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; /* .next/static missing - nothing to strip */
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith(".map")) {
      fs.rmSync(full);
      removed += 1;
      console.log(`  stripped ${path.relative(process.cwd(), full)}`);
    }
  }
})(root);

console.log(
  removed === 0
    ? "  no browser source maps found (clean build output)"
    : `  removed ${removed} source map file(s) from .next/static`,
);
