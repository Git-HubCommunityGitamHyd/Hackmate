const COLLEGE_EXPANSIONS: ReadonlyArray<[RegExp, string]> = [
  [/\biit\b/g, "indian institute of technology"],
  [/\bnit\b/g, "national institute of technology"],
  [/\buniv\b/g, "university"],
  [/\binst\b/g, "institute"],
];

export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[|]/g, "i")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;
  if (left.length === 1 || right.length === 1) {
    return left[0] === right[0] ? 0.9 : 0;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function tokenSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (left[0] === right[0] && (left.length === 1 || right.length === 1)) {
    return 0.9;
  }
  const similarity = editSimilarity(left, right);
  return similarity >= 0.6 ? similarity : 0;
}

function unorderedTokenSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const pairs = left.flatMap((leftToken, leftIndex) =>
    right.map((rightToken, rightIndex) => ({
      leftIndex,
      rightIndex,
      score: tokenSimilarity(leftToken, rightToken),
    })),
  );
  pairs.sort((a, b) => b.score - a.score);

  const usedLeft = new Set<number>();
  const usedRight = new Set<number>();
  let total = 0;
  for (const pair of pairs) {
    if (usedLeft.has(pair.leftIndex) || usedRight.has(pair.rightIndex)) continue;
    usedLeft.add(pair.leftIndex);
    usedRight.add(pair.rightIndex);
    total += pair.score;
  }
  return total / Math.max(left.length, right.length);
}

export function nameSimilarity(profileName: string, extractedName: string): number {
  const excludedTitles = new Set(["mr", "mrs", "ms", "miss", "dr", "prof"]);
  return unorderedTokenSimilarity(
    normalizeText(profileName)
      .split(" ")
      .filter((token) => !excludedTitles.has(token)),
    normalizeText(extractedName)
      .split(" ")
      .filter((token) => !excludedTitles.has(token)),
  );
}

export function collegeSimilarity(
  profileCollege: string,
  extractedCollege: string,
): number {
  const expand = (value: string) =>
    COLLEGE_EXPANSIONS.reduce(
      (text, [pattern, replacement]) => text.replace(pattern, replacement),
      normalizeText(value),
    );
  return unorderedTokenSimilarity(expand(profileCollege).split(" "), expand(extractedCollege).split(" "));
}

export function normalizeStudentId(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "").toUpperCase();
}
