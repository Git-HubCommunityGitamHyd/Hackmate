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

export async function PUT(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json().catch(() => null) as {
      entityType?: unknown;
      entityId?: unknown;
      vector?: unknown;
      sourceText?: unknown;
    } | null;
    if (
      !body ||
      (body.entityType !== "team" && body.entityType !== "hackathon") ||
      typeof body.entityId !== "string" ||
      typeof body.sourceText !== "string" ||
      !isPreparedSemanticText(body.sourceText) ||
      !validateEmbedding(body.vector)
    ) {
      return fail("A valid entity embedding and source text are required", 422);
    }

    let allowed = false;
    if (body.entityType === "team") {
      const [membership] = await db.select({ teamId: schema.teamMembers.teamId })
        .from(schema.teamMembers)
        .where(and(
          eq(schema.teamMembers.teamId, body.entityId),
          eq(schema.teamMembers.userId, user.id),
          eq(schema.teamMembers.isAdmin, true),
        )).limit(1);
      allowed ||= Boolean(membership);
    } else {
      const [hackathon] = await db.select({ createdBy: schema.hackathons.createdBy })
        .from(schema.hackathons)
        .where(eq(schema.hackathons.id, body.entityId))
        .limit(1);
      allowed ||= hackathon?.createdBy === user.id;
    }
    if (!allowed) return fail("You cannot update this entity embedding", 403);

    await db.insert(schema.searchEmbeddings).values({
      entityType: body.entityType,
      entityId: body.entityId,
      vector: body.vector,
      modelVersion: SEMANTIC_MODEL_VERSION,
      taxonomyVersion: SEMANTIC_TAXONOMY_VERSION,
      preparationVersion: SEMANTIC_TEXT_PREPARATION_VERSION,
      sourceHash: hashEmbeddingText(body.sourceText),
      status: "ready",
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [schema.searchEmbeddings.entityType, schema.searchEmbeddings.entityId],
      set: {
        vector: body.vector,
        modelVersion: SEMANTIC_MODEL_VERSION,
        taxonomyVersion: SEMANTIC_TAXONOMY_VERSION,
        preparationVersion: SEMANTIC_TEXT_PREPARATION_VERSION,
        sourceHash: hashEmbeddingText(body.sourceText),
        status: "ready",
        updatedAt: new Date(),
      },
    });
    return ok({ saved: true, model: SEMANTIC_MODEL_VERSION });
  });
}
