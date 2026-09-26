import type { ExtractedCollegeId, OcrBlock } from "./types";

const FIELD_LABELS: Record<keyof ExtractedCollegeId, RegExp> = {
  name: /^(?:full\s+name|student\s+name|name)\s*[:\-]?\s*(.*)$/i,
  college:
    /^(?:college|university|institution|institute|school)\s*(?:name)?\s*[:\-]?\s*(.*)$/i,
  studentId:
    /^(?:student\s*(?:id|no\.?|number)|registration\s*(?:id|no\.?|number)|enrol(?:l)?ment\s*(?:id|no\.?|number)|roll\s*(?:no\.?|number))\s*[:\-]?\s*(.*)$/i,
  academicYear:
    /^(?:academic\s+year|year|batch|class)\s*[:\-]?\s*(.*)$/i,
  department: /^(?:department|course|program|programme|branch)\s*[:\-]?\s*(.*)$/i,
  expiryDate: /^(?:expiry|expires|valid\s+until|validity)\s*[:\-]?\s*(.*)$/i,
};

const INSTITUTION_WORDS =
  /\b(?:university|universities|college|institute|institution|campus|school of)\b/i;

function linesFromBlocks(blocks: OcrBlock[]): string[] {
  return blocks
    .filter((block) => !block.skipped && !block.error)
    .flatMap((block) => block.text.split(/\r?\n/))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function readField(
  lines: string[],
  pattern: RegExp,
  index: number,
): string | undefined {
  const match = lines[index].match(pattern);
  if (!match) return undefined;
  const value = match[1]?.trim();
  if (value) return value;
  const nextLine = lines[index + 1];
  if (nextLine && Object.values(FIELD_LABELS).some((label) => label.test(nextLine))) {
    return undefined;
  }
  return nextLine || undefined;
}

export function extractCollegeIdFields(
  blocks: OcrBlock[],
): ExtractedCollegeId {
  const lines = linesFromBlocks(blocks);
  const extracted: ExtractedCollegeId = {};

  for (let index = 0; index < lines.length; index += 1) {
    for (const field of Object.keys(FIELD_LABELS) as (keyof ExtractedCollegeId)[]) {
      if (extracted[field]) continue;
      const value = readField(lines, FIELD_LABELS[field], index);
      if (value) extracted[field] = value;
    }
  }

  if (!extracted.college) {
    extracted.college = lines.find((line) => INSTITUTION_WORDS.test(line));
  }

  return extracted;
}

export function isDocumentLike(blocks: OcrBlock[]): boolean {
  const readable = blocks.filter(
    (block) => !block.skipped && !block.error && block.text.trim().length > 0,
  );
  const text = readable.map((block) => block.text).join(" ");
  const labelCues = (text.match(
    /\b(?:name|student|registration|enrollment|department|university|college|valid|expiry|course|id)\b/gi,
  ) ?? []).length;

  return (
    (readable.length >= 2 && text.replace(/\s/g, "").length >= 24) ||
    (text.replace(/\s/g, "").length >= 40 && labelCues >= 2)
  );
}
