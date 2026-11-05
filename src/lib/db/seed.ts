/**
 * Seed script - system taxonomies ONLY (skills, roles, badges).
 * Run: npm run db:seed   (after npm run db:push)
 *
 * NO demo data: no example hackathons, no example people, no example teams.
 * The database starts empty. To populate hackathons:
 *   1. Put your email in ADMIN_EMAILS (.env.local or Vercel env)
 *   2. Sign in with that account (GitHub OAuth or email magic link)
 *   3. Post hackathons from /hackathons/new (or manage them at /admin)
 */
import { loadEnv } from "./load-env";
loadEnv();

import { ROLE_TAXONOMY, BADGE_SEED } from "@/lib/constants";
import { canonicalTaxonomySkills } from "@/lib/matching/taxonomy";

type Db = any;

async function main() {
  /* Dynamic import: ensure dotenv (override) has run before the DB client
     reads DATABASE_URL. (Handles tsx CJS-interop shapes too.) */
  const mod: any = await import("./index");
  const db: Db = mod.db ?? mod.default?.db;
  const schema = mod.schema ?? mod.default?.schema;

  /* ---------------- Taxonomies (system data, not demo data) ---------------- */
  console.log("· seeding skill catalog…");
  const skillCatalog = canonicalTaxonomySkills();
  await db.insert(schema.skills).values(skillCatalog).onConflictDoNothing();

  console.log("· seeding role taxonomy…");
  await db.insert(schema.roleTaxonomy).values(
    ROLE_TAXONOMY.map((r, i) => ({
      slug: r.slug,
      name: r.name,
      description: r.description,
      skillCategories: r.skillCategories,
      sortOrder: i,
    })),
  ).onConflictDoNothing();

  console.log("· seeding badge definitions…");
  await db.insert(schema.badges).values(BADGE_SEED).onConflictDoNothing();

  const skillRows: any[] = await db.select().from(schema.skills);
  const roleRows: any[] = await db.select().from(schema.roleTaxonomy);
  const badgeRows: any[] = await db.select().from(schema.badges);

  console.log("");
  console.log("✔ Seed complete (taxonomies only):");
  console.log(`  · ${skillRows.length} skills`);
  console.log(`  · ${roleRows.length} roles`);
  console.log(`  · ${badgeRows.length} badges`);
  console.log("");
  console.log("  No example hackathons / people / teams were created.");
  console.log("  Next steps:");
  console.log("  1. Set ADMIN_EMAILS=your@email.com in .env.local");
  console.log("  2. Sign in with that account");
  console.log("  3. Post your first hackathon at /hackathons/new");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .then(() => process.exit(0));
