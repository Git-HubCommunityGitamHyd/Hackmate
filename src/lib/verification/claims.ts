import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type VerificationClaimKind = "student" | "image";
export type ClaimResult = "created" | "owned" | "duplicate";

export async function reserveVerificationClaim(
  kind: VerificationClaimKind,
  value: string,
  userId: string,
): Promise<ClaimResult> {
  const [inserted] = await db
    .insert(schema.idVerificationClaims)
    .values({ kind, value, userId })
    .onConflictDoNothing()
    .returning({ value: schema.idVerificationClaims.value });
  if (inserted) return "created";

  const [existing] = await db
    .select({ userId: schema.idVerificationClaims.userId })
    .from(schema.idVerificationClaims)
    .where(
      and(
        eq(schema.idVerificationClaims.kind, kind),
        eq(schema.idVerificationClaims.value, value),
      ),
    )
    .limit(1);
  return existing?.userId === userId ? "owned" : "duplicate";
}

export async function releaseVerificationClaim(
  kind: VerificationClaimKind,
  value: string,
  userId: string,
): Promise<void> {
  await db
    .delete(schema.idVerificationClaims)
    .where(
      and(
        eq(schema.idVerificationClaims.kind, kind),
        eq(schema.idVerificationClaims.value, value),
        eq(schema.idVerificationClaims.userId, userId),
      ),
    );
}
