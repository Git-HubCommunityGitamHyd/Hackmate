import { z } from "zod";
import type { OcrResult } from "./types";

const datalabInitialResponseSchema = z.object({
  request_id: z.string().min(1),
  success: z.boolean().optional(),
  error: z.string().nullable().optional(),
});

const datalabResultSchema = z.object({
  status: z.string(),
  success: z.boolean().nullable().optional(),
  error: z.string().nullable().optional(),
  pages: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
});

const DATALAB_URL = "https://www.datalab.to";
const OCR_TIMEOUT_MS = 50_000;
const POLL_INTERVAL_MS = 1_000;

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bboxOrNull(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const bbox = value.map(numberOrNull);
  return bbox.every((item): item is number => item !== null) ? bbox : null;
}

function normalizePages(pages: Array<Record<string, unknown>>): OcrResult {
  const blocks = pages.flatMap((page, pageIndex) => {
    const lines = page.text_lines ?? page.lines ?? page.blocks;
    if (!Array.isArray(lines)) return [];
    return lines.flatMap((line, lineIndex) => {
      if (!line || typeof line !== "object") return [];
      const value = line as Record<string, unknown>;
      const text = typeof value.text === "string" ? value.text.trim() : "";
      if (!text) return [];
      return [{
        text,
        label: typeof value.label === "string" ? value.label : null,
        confidence: numberOrNull(value.confidence),
        readingOrder: pageIndex * 10_000 + lineIndex,
        bbox: bboxOrNull(value.bbox),
        skipped: Boolean(value.skipped),
        error: Boolean(value.error),
      }];
    });
  });
  const confidences = blocks.flatMap((block) =>
    block.confidence === null ? [] : [block.confidence],
  );
  return {
    blocks,
    confidence: confidences.length
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : 0,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("Datalab OCR returned invalid JSON.");
  }
}

/**
 * Send a JPEG to Datalab's managed OCR API and normalize its result.
 * @throws If configuration is missing, the request fails, or the response is invalid.
 */
export async function recognizeWithDatalab(image: Buffer): Promise<OcrResult> {
  const apiKey = process.env.DATALAB_API_KEY;
  if (!apiKey) throw new Error("Datalab API key is missing.");

  const form = new FormData();
  const imageBytes = new Uint8Array(image.byteLength);
  imageBytes.set(image);
  form.append("file", new Blob([imageBytes.buffer], { type: "image/jpeg" }), "college-id.jpg");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
  try {
    const response = await fetch(`${DATALAB_URL}/api/v1/ocr`, {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: form,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Datalab OCR returned HTTP ${response.status}.`);
    }

    const initial = datalabInitialResponseSchema.safeParse(await readJson(response));
    if (!initial.success || initial.data.success === false) {
      throw new Error(
        initial.success
          ? (initial.data.error ?? "Datalab OCR submission failed.")
          : "Datalab OCR returned an invalid response.",
      );
    }

    const checkUrl = `${DATALAB_URL}/api/v1/ocr/${encodeURIComponent(initial.data.request_id)}`;
    while (true) {
      const resultResponse = await fetch(checkUrl, {
        headers: { "X-API-Key": apiKey },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!resultResponse.ok) {
        throw new Error(`Datalab OCR status returned HTTP ${resultResponse.status}.`);
      }
      const result = datalabResultSchema.safeParse(await readJson(resultResponse));
      if (!result.success) throw new Error("Datalab OCR returned an invalid status response.");

      const status = result.data.status.toLowerCase();
      if (status === "complete") {
        if (result.data.success === false || result.data.error) {
          throw new Error(result.data.error ?? "Datalab OCR processing failed.");
        }
        if (!result.data.pages) throw new Error("Datalab OCR completed without pages.");
        return normalizePages(result.data.pages);
      }
      if (["failed", "error", "cancelled"].includes(status)) {
        throw new Error(result.data.error ?? "Datalab OCR processing failed.");
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Datalab OCR timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
