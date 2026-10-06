import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ override: true });

async function main() {
  const { db, schema } = await import("@/lib/db");
  const { BADGE_SEED } = await import("@/lib/constants");

  await db.insert(schema.badges).values(BADGE_SEED).onConflictDoNothing({
    target: schema.badges.slug,
  });

  console.log(`Seeded ${BADGE_SEED.length} badge definitions.`);
}

main().catch((error) => {
  console.error("Badge seed failed:", error);
  process.exit(1);
});