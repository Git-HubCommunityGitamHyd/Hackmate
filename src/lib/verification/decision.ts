import {
  COLLEGE_MATCH_THRESHOLD,
  OCR_MIN_CONFIDENCE,
  STRONG_MISMATCH_THRESHOLD,
  NAME_MATCH_THRESHOLD,
} from "./constants";
import { nameSimilarity, collegeSimilarity } from "./matching";
import type { ExtractedCollegeId, VerificationDecision } from "./types";

export interface VerificationInput {
  extracted: ExtractedCollegeId;
  ocrConfidence: number;
  profileName: string;
  profileCollege: string | null;
  imageQuality: boolean;
  documentDetected: boolean;
  duplicateDetected: boolean;
}

export function decideVerification(
  input: VerificationInput,
): VerificationDecision {
  const nameScore =
    input.extracted.name && input.profileName
      ? nameSimilarity(input.profileName, input.extracted.name)
      : 0;
  const collegeScore =
    input.extracted.college && input.profileCollege
      ? collegeSimilarity(input.profileCollege, input.extracted.college)
      : 0;
  const nameMatch = nameScore >= NAME_MATCH_THRESHOLD;
  const collegeMatch = collegeScore >= COLLEGE_MATCH_THRESHOLD;
  const confidence = Math.max(
    0,
    Math.min(
      1,
      input.ocrConfidence * 0.35 + nameScore * 0.35 + collegeScore * 0.3,
    ),
  );

  const rejected =
    !input.documentDetected ||
    (!!input.extracted.name && nameScore < STRONG_MISMATCH_THRESHOLD) ||
    (!!input.extracted.college && !!input.profileCollege &&
      collegeScore < STRONG_MISMATCH_THRESHOLD);

  const verified =
    !rejected &&
    !input.duplicateDetected &&
    input.imageQuality &&
    input.documentDetected &&
    input.ocrConfidence >= OCR_MIN_CONFIDENCE &&
    nameMatch &&
    collegeMatch;

  return {
    status: rejected ? "REJECTED" : verified ? "VERIFIED" : "NEEDS_REVIEW",
    confidence,
    checks: {
      imageQuality: input.imageQuality,
      documentDetected: input.documentDetected,
      nameMatch,
      collegeMatch,
      duplicateDetected: input.duplicateDetected,
    },
  };
}
