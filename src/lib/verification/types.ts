export interface OcrBlock {
  text: string;
  label: string | null;
  confidence: number | null;
  readingOrder: number | null;
  bbox: number[] | null;
  skipped: boolean;
  error: boolean;
}

export interface OcrResult {
  blocks: OcrBlock[];
  confidence: number;
}

export interface ExtractedCollegeId {
  name?: string;
  college?: string;
  studentId?: string;
  academicYear?: string;
  department?: string;
  expiryDate?: string;
}

export interface VerificationChecks {
  imageQuality: boolean;
  documentDetected: boolean;
  nameMatch: boolean;
  collegeMatch: boolean;
  duplicateDetected: boolean;
}

export interface VerificationDecision {
  status: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED";
  confidence: number;
  checks: VerificationChecks;
}
