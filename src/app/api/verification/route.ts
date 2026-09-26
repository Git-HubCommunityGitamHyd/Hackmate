import { and, eq, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/api";
import { extractCollegeIdFields, isDocumentLike } from "@/lib/verification/extraction";
import {
  DUPLICATE_HASH_DISTANCE,
  COLLEGE_ID_MAX_BYTES,
  PROCESSING_STALE_AFTER_MS,
} from "@/lib/verification/constants";
import {
  hashStudentId,
  imageHashDistance,
  perceptualImageHash,
  processCollegeIdImage,
  requireCollegeIdFile,
  UploadValidationError,
} from "@/lib/verification/image";
import { normalizeStudentId } from "@/lib/verification/matching";
import { decideVerification } from "@/lib/verification/decision";
import {
  releaseVerificationClaim,
  reserveVerificationClaim,
  type VerificationClaimKind,
} from "@/lib/verification/claims";
import { recognizeWithSurya } from "@/lib/verification/surya-client";
import { deleteCollegeIdImage, storeCollegeIdImage } from "@/lib/verification/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Upload a valid college ID image.", 400);
  }

  let uploaded: File;
  try {
    uploaded = requireCollegeIdFile(form.get("file"));
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return fail(error.message, error.status);
    }
    return fail("Upload a valid college ID image.", 422);
  }
  if (uploaded.size > COLLEGE_ID_MAX_BYTES) {
    return fail("College ID images must be 4 MB or smaller.", 413);
  }

  let image: Awaited<ReturnType<typeof processCollegeIdImage>>;
  try {
    image = await processCollegeIdImage(
      Buffer.from(await uploaded.arrayBuffer()),
      uploaded.type,
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return fail(error.message, error.status);
    }
    console.error("[verification] Image processing failed.");
    return fail("We couldn't read that image. Try another photo.", 422);
  }

  const [profile] = await db
    .select({
      status: schema.users.idVerificationStatus,
      imagePath: schema.users.idVerificationImagePath,
    })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);
  if (!profile) return fail("Profile not found.", 404);
  if (profile.status === "VERIFIED") {
    return fail("Your college ID is already verified.", 409);
  }

  const processingStartedAt = new Date();
  const [claimed] = await db
    .update(schema.users)
    .set({
      idVerificationStatus: "PROCESSING",
      idVerificationStartedAt: processingStartedAt,
      updatedAt: processingStartedAt,
    })
    .where(
      and(
        eq(schema.users.id, user.id),
        or(
          ne(schema.users.idVerificationStatus, "PROCESSING"),
          or(
            isNull(schema.users.idVerificationStartedAt),
            lt(
              schema.users.idVerificationStartedAt,
              new Date(Date.now() - PROCESSING_STALE_AFTER_MS),
            ),
          ),
        ),
        ne(schema.users.idVerificationStatus, "VERIFIED"),
      ),
    )
    .returning({ id: schema.users.id });
  if (!claimed) return fail("A verification is already in progress.", 409);

  let newImagePath: string | null = null;
  const claimsCreated: { kind: VerificationClaimKind; value: string }[] = [];
  try {
    newImagePath = await storeCollegeIdImage(image.buffer);
    const ocr = await recognizeWithSurya(image.buffer);
    const extracted = extractCollegeIdFields(ocr.blocks);
    const imageHash = await perceptualImageHash(image.buffer);
    const authSecret = process.env.AUTH_SECRET;
    if (!authSecret) throw new Error("AUTH_SECRET is not configured.");
    const studentHash = extracted.studentId
      ? hashStudentId(
          normalizeStudentId(extracted.studentId),
          authSecret,
        )
      : null;

    const [existingImageHashes, existingStudent] = await Promise.all([
      db
        .select({ hash: schema.users.idVerificationImageHash })
        .from(schema.users)
        .where(
          and(
            ne(schema.users.id, user.id),
            eq(schema.users.idVerificationStatus, "VERIFIED"),
            isNotNull(schema.users.idVerificationImageHash),
          ),
        ),
      studentHash
        ? db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(
              and(
                ne(schema.users.id, user.id),
                eq(schema.users.idVerificationStatus, "VERIFIED"),
                eq(schema.users.idVerificationStudentHash, studentHash),
              ),
            )
        : Promise.resolve([]),
    ]);
    const duplicateDetected =
      existingStudent.length > 0 ||
      existingImageHashes.some(
        ({ hash }) =>
          hash !== null &&
          imageHashDistance(hash, imageHash) <= DUPLICATE_HASH_DISTANCE,
      );

    const [currentProfile] = await db
      .select({
        name: schema.users.name,
        collegeName: sql<string | null>`coalesce(${schema.users.collegeName}, ${schema.colleges.name})`,
        storedCollegeName: schema.users.collegeName,
        collegeId: schema.users.collegeId,
      })
      .from(schema.users)
      .leftJoin(schema.colleges, eq(schema.users.collegeId, schema.colleges.id))
      .where(
        and(
          eq(schema.users.id, user.id),
          eq(schema.users.idVerificationStatus, "PROCESSING"),
          eq(schema.users.idVerificationStartedAt, processingStartedAt),
        ),
      )
      .limit(1);
    if (!currentProfile) throw new Error("Profile changed during verification.");

    const decisionInput = {
      extracted,
      ocrConfidence: ocr.confidence,
      profileName: currentProfile.name ?? user.name ?? "",
      profileCollege: currentProfile.collegeName,
      imageQuality: image.imageQuality && image.documentImage,
      documentDetected: isDocumentLike(ocr.blocks),
      duplicateDetected,
    };
    let decision = decideVerification(decisionInput);

    if (decision.status === "VERIFIED") {
      const values: { kind: VerificationClaimKind; value: string }[] = [
        { kind: "image", value: imageHash },
        ...(studentHash ? [{ kind: "student" as const, value: studentHash }] : []),
      ];
      for (const claim of values) {
        const result = await reserveVerificationClaim(
          claim.kind,
          claim.value,
          user.id,
        );
        if (result === "created") claimsCreated.push(claim);
        if (result === "duplicate") {
          for (const created of claimsCreated) {
            await releaseVerificationClaim(created.kind, created.value, user.id);
          }
          claimsCreated.length = 0;
          decision = decideVerification({
            ...decisionInput,
            duplicateDetected: true,
          });
          break;
        }
      }
    }
    const [saved] = await db
      .update(schema.users)
      .set({
        idVerified: decision.status === "VERIFIED",
        idVerificationStatus: decision.status,
        idVerificationStartedAt: null,
        idVerificationImagePath: newImagePath,
        idVerificationImageHash: imageHash,
        idVerificationStudentHash: studentHash,
        idVerificationConfidence: decision.confidence,
        idVerifiedAt:
          decision.status === "VERIFIED" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.users.id, user.id),
          eq(schema.users.idVerificationStatus, "PROCESSING"),
          eq(schema.users.idVerificationStartedAt, processingStartedAt),
          sql`${schema.users.name} IS NOT DISTINCT FROM ${currentProfile.name}`,
          sql`${schema.users.collegeName} IS NOT DISTINCT FROM ${currentProfile.storedCollegeName}`,
          sql`${schema.users.collegeId} IS NOT DISTINCT FROM ${currentProfile.collegeId}`,
        ),
      )
      .returning({ id: schema.users.id });

    if (!saved) throw new Error("Profile disappeared during verification.");
    newImagePath = null;
    if (profile.imagePath) {
      try {
        await deleteCollegeIdImage(profile.imagePath);
      } catch {
        console.error("[verification] Previous private document cleanup failed.");
      }
    }

    return ok({
      status: decision.status,
      idVerified: decision.status === "VERIFIED",
      message:
        decision.status === "VERIFIED"
          ? "Your college ID has been successfully verified."
          : decision.status === "NEEDS_REVIEW"
            ? "Your ID needs additional verification."
            : "We couldn't verify this ID. Please upload a clearer photo.",
    });
  } catch (error) {
    if (newImagePath) {
      try {
        await deleteCollegeIdImage(newImagePath);
      } catch {
        console.error("[verification] Failed to remove an unprocessed private document.");
      }
      for (const claim of claimsCreated) {
        try {
          await releaseVerificationClaim(claim.kind, claim.value, user.id);
        } catch {
          console.error("[verification] Failed to release a verification claim.");
        }
      }
    }
    await db
      .update(schema.users)
      .set({
        idVerificationStatus:
          profile.status === "PROCESSING" ? "NOT_VERIFIED" : profile.status,
        idVerificationStartedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.users.id, user.id),
          eq(schema.users.idVerificationStatus, "PROCESSING"),
          eq(schema.users.idVerificationStartedAt, processingStartedAt),
        ),
      );
    console.error(
      "[verification] Processing failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return fail(
      "We couldn't process your ID right now. Please try again shortly.",
      503,
    );
  }
}
