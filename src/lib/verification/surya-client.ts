import { z } from "zod";
import type { OcrResult } from "./types";

const ocrResponseSchema = z.object({
  blocks: z.array(
    z.object({
      text: z.string(),
      label: z.string().nullable(),
      confidence: z.number().nullable(),
      readingOrder: z.number().nullable(),
      bbox: z.array(z.number()).nullable(),
      skipped: z.boolean(),
      error: z.boolean(),
    }),
  ),
  confidence: z.number().min(0).max(1),
});

export async function recognizeWithSurya(image: Buffer): Promise<OcrResult> {
  const serviceUrl = process.env.SURYA_SERVICE_URL;
  const serviceToken = process.env.SURYA_SERVICE_TOKEN;
  if (!serviceUrl || !serviceToken) {
    throw new Error("Surya service configuration is missing.");
  }

  const form = new FormData();
  const imageBytes = new Uint8Array(image.byteLength);
  imageBytes.set(image);
  form.append(
    "file",
    new Blob([imageBytes.buffer], { type: "image/jpeg" }),
    "college-id.jpg",
  );

  const response = await fetch(new URL("/ocr", serviceUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceToken}` },
    body: form,
    signal: AbortSignal.timeout(50_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Surya service returned HTTP ${response.status}.`);
  }
  const parsed = ocrResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Surya service returned an invalid response.");
  }
  return parsed.data;
}
