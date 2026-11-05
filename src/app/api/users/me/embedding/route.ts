import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
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

export async function PUT(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json().catch(() => null) as {
      vector?: unknown;
      sourceText?: unknown;
    } | null;
    if (!body || typeof body.sourceText !== "string" || !isPreparedSemanticText(body.sourceText) || !validateEmbedding(body.vector)) {
      return fail("A valid embedding vector and source text are required", 422);
    }
    await db.update(schema.users).set({
      profileEmbedding: body.vector,
      profileEmbeddingModel: SEMANTIC_MODEL_VERSION,
      profileEmbeddingTaxonomy: SEMANTIC_TAXONOMY_VERSION,
      profileEmbeddingPreparation: SEMANTIC_TEXT_PREPARATION_VERSION,
      profileEmbeddingSourceHash: hashEmbeddingText(body.sourceText),
      profileEmbeddingStatus: "ready",
      updatedAt: new Date(),
    }).where(eq(schema.users.id, user.id));
    return ok({ saved: true, model: SEMANTIC_MODEL_VERSION });
  });
}
