/**
 * Seed script — system taxonomies ONLY (skills, roles, badges).
 * Run: bun run db:seed   (after bun run db:push)
 *
 * NO demo data: no example hackathons, no example people, no example teams.
 * The database starts empty. To populate hackathons:
 *   1. Put your email in ADMIN_EMAILS (.env.local or Vercel env)
 *   2. Sign in with that account (GitHub OAuth or email magic link)
 *   3. Post hackathons from /hackathons/new (or manage them at /admin)
 */
import { config } from "dotenv";
config({ override: true });

import { sql } from "drizzle-orm";
import { ROLE_TAXONOMY, SKILLS, BADGE_SEED } from "@/lib/constants";

type Db = any;

async function reset(db: Db) {
  console.log("· clearing all existing data…");
  await db.execute(sql`
    truncate table
      notification, bookmark, hackathon_result, user_badge, badge,
      task, message, invite, join_request, team_skill_wanted, team_role_needed,
      team_member, team, hackathon_profile, hackathon, club, college,
      compat_answers, availability, user_role, user_skill, skill, role_taxonomy,
      verification_token, session, account, "user"
    restart identity cascade
  `);
}

async function main() {
  /* Dynamic import: ensure dotenv (override) has run before the DB client
     reads DATABASE_URL. (Handles tsx CJS-interop shapes too.) */
  const mod: any = await import("./index");
  const db: Db = mod.db ?? mod.default?.db;
  const schema = mod.schema ?? mod.default?.schema;

  await reset(db);

  /* ---------------- Taxonomies (system data, not demo data) ---------------- */
  console.log("· seeding skill catalog…");
  await db.insert(schema.skills).values(SKILLS);

  console.log("· seeding role taxonomy…");
  await db.insert(schema.roleTaxonomy).values(
    ROLE_TAXONOMY.map((r, i) => ({
      slug: r.slug,
      name: r.name,
      description: r.description,
      skillCategories: r.skillCategories,
      sortOrder: i,
    })),
  );

  console.log("· seeding badge definitions…");
  await db.insert(schema.badges).values(BADGE_SEED);

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
