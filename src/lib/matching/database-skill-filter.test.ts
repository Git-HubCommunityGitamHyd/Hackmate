import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { people } from "@/lib/queries/people";
import { parseSearchQuery } from "./search-parser";

test("an extracted alias resolves to a seeded skill and filters a profile", async () => {
  const parsed = parseSearchQuery("Find a developer with k8s");
  assert.deepEqual(parsed.skillSlugs, ["kubernetes"]);

  const [skill] = await db
    .select({ id: schema.skills.id, slug: schema.skills.slug })
    .from(schema.skills)
    .where(eq(schema.skills.slug, parsed.skillSlugs[0]!))
    .limit(1);
  assert.ok(skill, "the canonical skill must be seeded before filtering");

  const userId = randomUUID();
  const email = `skill-filter-${userId}@example.invalid`;
  try {
    await db.insert(schema.users).values({
      id: userId,
      email,
      name: "Taxonomy filter fixture",
      recruitmentStatus: "looking",
      openToOpportunities: true,
    });
    await db.insert(schema.userSkills).values({
      userId,
      skillId: skill.id,
      level: 4,
      isPrimary: true,
    });

    const matches = await people({ skillIds: [skill.id], limit: 40 });
    assert.ok(matches.some((person) => person.id === userId));
    assert.ok(matches.find((person) => person.id === userId)?.topSkills.some((item) => item.slug === "kubernetes"));
  } finally {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  }
});
