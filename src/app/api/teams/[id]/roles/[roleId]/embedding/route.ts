import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fail, ok, withUser } from "@/lib/api";
import {
  hashEmbeddingText,
  SEMANTIC_MODEL_VERSION,
  SEMANTIC_TAXONOMY_VERSION,
  SEMANTIC_TEXT_PREPARATION_VERSION,
  validateEmbedding,
} from "@/lib/matching/semantic";
import { isPreparedSemanticText } from "@/lib/matching/taxonomy";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> },
) {
  return withUser(async (user) => {
    const { id, roleId } = await params;
    const [admin] = await db.select({ teamId: schema.teamMembers.teamId })
      .from(schema.teamMembers)
      .where(and(
        eq(schema.teamMembers.teamId, id),
        eq(schema.teamMembers.userId, user.id),
        eq(schema.teamMembers.isAdmin, true),
      )).limit(1);
    if (!admin) return fail("Only team admins can update role embeddings", 403);
    const body = await req.json().catch(() => null) as {
      vector?: unknown;
      sourceText?: unknown;
    } | null;
    if (!body || typeof body.sourceText !== "string" || !isPreparedSemanticText(body.sourceText) || !validateEmbedding(body.vector)) {
      return fail("A valid embedding vector and source text are required", 422);
    }
    const updated = await db.update(schema.teamRolesNeeded).set({
      embedding: body.vector,
      embeddingModel: SEMANTIC_MODEL_VERSION,
      embeddingTaxonomy: SEMANTIC_TAXONOMY_VERSION,
      embeddingPreparation: SEMANTIC_TEXT_PREPARATION_VERSION,
      embeddingSourceHash: hashEmbeddingText(body.sourceText),
      embeddingStatus: "ready",
    }).where(and(
      eq(schema.teamRolesNeeded.teamId, id),
      eq(schema.teamRolesNeeded.roleId, roleId),
    )).returning({ teamId: schema.teamRolesNeeded.teamId });
    if (updated.length === 0) return fail("Team role not found", 404);
    return ok({ saved: true, model: SEMANTIC_MODEL_VERSION });
  });
}
