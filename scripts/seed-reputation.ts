/**
 * Seeds a realistic karma history so the Reputation Zone can be exercised by
 * hand. Without it every user legitimately scores 0 and there is nothing to
 * look at.
 *
 * Usage:
 *   npx tsx scripts/seed-reputation.ts            # seed the first user found
 *   npx tsx scripts/seed-reputation.ts <userId>   # seed a specific user
 *   npx tsx scripts/seed-reputation.ts --clean    # remove everything it made
 *
 * Every row it creates is tagged with the REPDEMO slug/email prefix, so
 * --clean removes exactly this fixture and nothing else.
 */
import { loadEnv } from "../src/lib/db/load-env";
loadEnv();

const TAG = "repdemo";

async function main() {
  const { db, schema } = await import("@/lib/db");
  const { eq, like, inArray } = await import("drizzle-orm");

  const arg = process.argv[2];

  if (arg === "--clean") {
    /* Hackathons cascade to teams, attendance, reviews and cancellations. */
    await db.delete(schema.hackathons).where(like(schema.hackathons.slug, `${TAG}-%`));
    await db.delete(schema.users).where(like(schema.users.email, `${TAG}-%@example.test`));
    console.log("Removed the reputation demo fixture.");
    process.exit(0);
  }

  /* Who are we giving a history to? */
  const [target] = arg
    ? await db.select().from(schema.users).where(eq(schema.users.id, arg)).limit(1)
    : await db.select().from(schema.users).limit(1);

  if (!target) {
    console.error("No user found. Sign in once (or run the app) to create one.");
    process.exit(1);
  }

  /* Two teammates to review them — a user cannot review themselves. */
  const reviewers = await db
    .insert(schema.users)
    .values([
      { email: `${TAG}-reviewer-a@example.test`, name: "Demo Teammate A" },
      { email: `${TAG}-reviewer-b@example.test`, name: "Demo Teammate B" },
    ])
    .returning();

  const now = Date.now();
  const day = 86_400_000;
  const hacks = await db
    .insert(schema.hackathons)
    .values([
      { name: "Demo Hack: Winter", slug: `${TAG}-winter`, startsAt: new Date(now - 90 * day), endsAt: new Date(now - 88 * day), mode: "offline" },
      { name: "Demo Hack: Spring", slug: `${TAG}-spring`, startsAt: new Date(now - 60 * day), endsAt: new Date(now - 58 * day), mode: "online" },
      { name: "Demo Hack: Summer", slug: `${TAG}-summer`, startsAt: new Date(now - 30 * day), endsAt: new Date(now - 28 * day), mode: "hybrid" },
      { name: "Demo Hack: Bailed", slug: `${TAG}-bailed`, startsAt: new Date(now - 10 * day), endsAt: new Date(now - 8 * day), mode: "online" },
    ])
    .returning();

  const teams = await db
    .insert(schema.teams)
    .values(
      hacks.map((h, i) => ({
        hackathonId: h.id,
        name: `Demo Team ${i + 1}`,
        commitment: "serious" as const,
      })),
    )
    .returning();

  /* Showed up to the first three; the fourth they cancelled on. */
  await db.insert(schema.attendance).values(
    hacks.slice(0, 3).map((h, i) => ({
      userId: target.id,
      hackathonId: h.id,
      teamId: teams[i].id,
      markedByUserId: reviewers[0].id,
      status: "present" as const,
    })),
  );

  /* Three submissions; one of them won. */
  await db.insert(schema.hackathonResults).values([
    { userId: target.id, hackathonId: hacks[0].id, teamId: teams[0].id, projectName: "Winter Project", placement: 1 },
    { userId: target.id, hackathonId: hacks[1].id, teamId: teams[1].id, projectName: "Spring Project", placement: 6 },
    { userId: target.id, hackathonId: hacks[2].id, teamId: teams[2].id, projectName: "Summer Project", placement: null },
  ]);

  /* Two peer ratings: 5 and 4 -> average 4.5. */
  await db.insert(schema.performanceReviews).values([
    { reviewerId: reviewers[0].id, revieweeId: target.id, hackathonId: hacks[0].id, teamId: teams[0].id, rating: 5, comment: "Carried the backend." },
    { reviewerId: reviewers[1].id, revieweeId: target.id, hackathonId: hacks[0].id, teamId: teams[0].id, rating: 4, comment: "Solid, a bit quiet." },
  ]);

  /* One genuine last-minute bail, plus one early cancel that must NOT count. */
  await db.insert(schema.cancellationHistory).values([
    { userId: target.id, teamId: teams[3].id, hackathonId: hacks[3].id, hoursBeforeStart: 6, isLastMinute: true },
    { userId: target.id, teamId: teams[1].id, hackathonId: hacks[1].id, hoursBeforeStart: 240, isLastMinute: false },
  ]);

  console.log(`Seeded reputation history for ${target.name ?? target.email}`);
  console.log(`  userId: ${target.id}`);
  console.log("");
  console.log("  attendance present x3      +6");
  console.log("  hackathons completed x3   +24");
  console.log("  podium finish x1          +25");
  console.log("  avg rating 4.5            +45");
  console.log("  last-minute cancel x1     -30");
  console.log("  ----------------------------");
  console.log("  expected karma             70");
  console.log("");
  console.log(`  curl "http://localhost:3000/api/reputation?userId=${target.id}"`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err?.cause?.message ?? err);
  process.exit(1);
});
