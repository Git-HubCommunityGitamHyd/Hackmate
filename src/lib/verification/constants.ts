export const COLLEGE_ID_MAX_BYTES = 4 * 1024 * 1024;
export const COLLEGE_ID_MIN_WIDTH = 160;
export const COLLEGE_ID_MIN_HEIGHT = 120;
export const COLLEGE_ID_MIN_ENTROPY = 0.5;
export const COLLEGE_ID_MIN_SHARPNESS = 0.04;
export const OCR_MIN_CONFIDENCE = 0.7;
export const NAME_MATCH_THRESHOLD = 0.78;
export const COLLEGE_MATCH_THRESHOLD = 0.72;
export const STRONG_MISMATCH_THRESHOLD = 0.4;
export const DUPLICATE_HASH_DISTANCE = 6;
export const PROCESSING_STALE_AFTER_MS = 5 * 60 * 1000;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
