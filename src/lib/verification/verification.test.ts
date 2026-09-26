import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { decideVerification } from "./decision";
import { extractCollegeIdFields, isDocumentLike } from "./extraction";
import {
  hashStudentId,
  imageHashDistance,
  perceptualImageHash,
  processCollegeIdImage,
  requireCollegeIdFile,
  UploadValidationError,
} from "./image";
import { collegeSimilarity, nameSimilarity } from "./matching";
import type { OcrBlock } from "./types";

function block(text: string, readingOrder: number): OcrBlock {
  return {
    text,
    label: "Text",
    confidence: 0.95,
    readingOrder,
    bbox: null,
    skipped: false,
    error: false,
  };
}

const cardBlocks = [
  block("ABC UNIVERSITY", 0),
  block("Name: RAHUL K SHARMA", 1),
  block("Student ID: 23CS1042", 2),
  block("Department: Computer Science", 3),
];

test("extracts labeled college ID fields and institution context", () => {
  assert.deepEqual(extractCollegeIdFields(cardBlocks), {
    name: "RAHUL K SHARMA",
    studentId: "23CS1042",
    department: "Computer Science",
    college: "ABC UNIVERSITY",
  });
  assert.equal(isDocumentLike(cardBlocks), true);
  assert.equal(isDocumentLike([block("A landscape photo with no readable text", 0)]), false);
});

test("matches reordered names, initials, accents, and college abbreviations", () => {
  assert.ok(nameSimilarity("Rahul Kumar Sharma", "SHARMA Rahul K.") >= 0.78);
  assert.ok(nameSimilarity("Rahul Kumar Sharma", "Amit Kumar Singh") < 0.4);
  assert.equal(
    collegeSimilarity(
      "Indian Institute of Technology Bombay",
      "IIT Bombay",
    ),
    1,
  );
});

test("verification only succeeds with strong, complete matching evidence", () => {
  const input = {
    extracted: {
      name: "RAHUL K SHARMA",
      college: "IIT Bombay",
      studentId: "23CS1042",
    },
    ocrConfidence: 0.94,
    profileName: "Rahul Kumar Sharma",
    profileCollege: "Indian Institute of Technology Bombay",
    imageQuality: true,
    documentDetected: true,
    duplicateDetected: false,
  };
  assert.equal(decideVerification(input).status, "VERIFIED");
  assert.equal(
    decideVerification({ ...input, duplicateDetected: true }).status,
    "NEEDS_REVIEW",
  );
  assert.equal(
    decideVerification({ ...input, ocrConfidence: 0.4 }).status,
    "NEEDS_REVIEW",
  );
  assert.equal(
    decideVerification({
      ...input,
      extracted: { ...input.extracted, name: "Amit Singh" },
    }).status,
    "REJECTED",
  );
  assert.equal(
    decideVerification({
      ...input,
      extracted: { ...input.extracted, college: "Somewhere Else University" },
    }).status,
    "REJECTED",
  );
  assert.equal(
    decideVerification({ ...input, documentDetected: false }).status,
    "REJECTED",
  );
  assert.equal(
    decideVerification({ ...input, profileCollege: null }).status,
    "NEEDS_REVIEW",
  );
});

test("student ID hashes are keyed and perceptual hash distance is bounded", () => {
  const normalizedId = "23CS1042";
  assert.notEqual(
    hashStudentId(normalizedId, "first-secret"),
    hashStudentId(normalizedId, "second-secret"),
  );
  assert.equal(imageHashDistance("0000000000000000", "0000000000000001"), 1);
  assert.equal(imageHashDistance("invalid", "0000000000000001"), Number.MAX_SAFE_INTEGER);
});

test("rejects oversized and non-image uploads before OCR", async () => {
  assert.throws(
    () => requireCollegeIdFile(null),
    (error: unknown) =>
      error instanceof UploadValidationError && error.status === 422,
  );
  assert.throws(
    () => requireCollegeIdFile("not a file"),
    (error: unknown) =>
      error instanceof UploadValidationError && error.status === 422,
  );
  await assert.rejects(
    processCollegeIdImage(Buffer.alloc(4 * 1024 * 1024 + 1), "image/jpeg"),
    (error: unknown) =>
      error instanceof UploadValidationError && error.status === 413,
  );
  await assert.rejects(
    processCollegeIdImage(Buffer.from("not an image"), "image/png"),
    (error: unknown) =>
      error instanceof UploadValidationError && error.status === 422,
  );
  await assert.rejects(
    processCollegeIdImage(Buffer.from("not an image"), "application/pdf"),
    (error: unknown) =>
      error instanceof UploadValidationError && error.status === 415,
  );
});

test("preprocesses valid images to metadata-stripped JPEGs and hashes them", async () => {
  const source = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 210, g: 150, b: 90 },
    },
  })
    .jpeg()
    .toBuffer();
  const processed = await processCollegeIdImage(source, "image/jpeg");
  const outputMetadata = await sharp(processed.buffer).metadata();

  assert.equal(outputMetadata.format, "jpeg");
  assert.equal(outputMetadata.width, 400);
  assert.equal(outputMetadata.height, 300);
  const imageHash = await perceptualImageHash(processed.buffer);
  assert.match(imageHash, /^[0-9a-f]{16}$/);
  assert.equal(imageHashDistance(imageHash, imageHash), 0);
});
