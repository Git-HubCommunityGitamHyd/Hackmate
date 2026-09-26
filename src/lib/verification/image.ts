import { createHmac } from "node:crypto";
import sharp from "sharp";
import {
  ALLOWED_IMAGE_FORMATS,
  ALLOWED_IMAGE_TYPES,
  COLLEGE_ID_MAX_BYTES,
  COLLEGE_ID_MIN_ENTROPY,
  COLLEGE_ID_MIN_HEIGHT,
  COLLEGE_ID_MIN_SHARPNESS,
  COLLEGE_ID_MIN_WIDTH,
} from "./constants";

export class UploadValidationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export interface ProcessedImage {
  buffer: Buffer;
  imageQuality: boolean;
  documentImage: boolean;
}

export function requireCollegeIdFile(
  value: FormDataEntryValue | null,
): File {
  if (!(value instanceof File)) {
    throw new UploadValidationError(
      value === null
        ? "Choose a college ID image to upload."
        : "Upload a valid college ID image.",
      422,
    );
  }
  return value;
}

export async function processCollegeIdImage(
  bytes: Buffer,
  claimedType: string,
): Promise<ProcessedImage> {
  if (bytes.length === 0) {
    throw new UploadValidationError("Choose an image to upload.", 422);
  }
  if (bytes.length > COLLEGE_ID_MAX_BYTES) {
    throw new UploadValidationError("College ID images must be 4 MB or smaller.", 413);
  }
  if (!ALLOWED_IMAGE_TYPES.has(claimedType)) {
    throw new UploadValidationError(
      "Upload a JPEG, PNG, or WebP image of your college ID.",
      415,
    );
  }

  let source = sharp(bytes, {
    failOn: "error",
    limitInputPixels: 20_000_000,
    animated: false,
  });
  let metadata: sharp.Metadata;
  try {
    metadata = await source.metadata();
  } catch {
    throw new UploadValidationError("The uploaded file is not a readable image.", 422);
  }
  const format = metadata.format;
  const expectedFormat =
    claimedType === "image/jpeg" ? "jpeg" : claimedType.slice("image/".length);
  if (
    !format ||
    !ALLOWED_IMAGE_FORMATS.has(format) ||
    format !== expectedFormat ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new UploadValidationError(
      "The file contents do not match a supported image type.",
      415,
    );
  }

  const width = metadata.width;
  const height = metadata.height;
  source = sharp(bytes, {
    failOn: "error",
    limitInputPixels: 20_000_000,
    animated: false,
  });
  const buffer = await source
    .rotate()
    .resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  const stats = await sharp(buffer).stats();
  const dimensionsValid =
    width >= COLLEGE_ID_MIN_WIDTH && height >= COLLEGE_ID_MIN_HEIGHT;
  const documentImage = stats.entropy >= COLLEGE_ID_MIN_ENTROPY;

  return {
    buffer,
    documentImage,
    imageQuality:
      dimensionsValid && stats.sharpness >= COLLEGE_ID_MIN_SHARPNESS,
  };
}

export async function perceptualImageHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(9, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let hash = "";
  let nibble = 0;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const left = data[row * 9 + column];
      const right = data[row * 9 + column + 1];
      nibble = (nibble << 1) | (left > right ? 1 : 0);
      if ((row * 8 + column) % 4 === 3) {
        hash += nibble.toString(16);
        nibble = 0;
      }
    }
  }
  return hash;
}

export function hashStudentId(studentId: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(studentId)
    .digest("hex");
}

export function imageHashDistance(left: string, right: string): number {
  if (!/^[0-9a-f]{16}$/i.test(left) || !/^[0-9a-f]{16}$/i.test(right)) {
    return Number.MAX_SAFE_INTEGER;
  }
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let bits = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    while (bits > 0) {
      distance += bits & 1;
      bits >>= 1;
    }
  }
  return distance;
}
