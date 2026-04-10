const LEADING_OR_TRAILING_PUNCTUATION =
  /^[\s"'`“”‘’.,!?;:()[\]{}<>《》「」『』【】（）、，。！？；：…—_-]+|[\s"'`“”‘’.,!?;:()[\]{}<>《》「」『』【】（）、，。！？；：…—_-]+$/gu;

const CJK_CHARACTER = /[\p{Unified_Ideograph}\u3040-\u30ff]/u;
const LATIN_OR_DIGIT = /[A-Za-z0-9]/;
const CONNECTOR = /[-']/;

export function normalizeSelectionText(rawText: string): string {
  return rawText.trim().replace(LEADING_OR_TRAILING_PUNCTUATION, "").trim();
}

function countSegmentUnits(segment: string): number {
  const chars = Array.from(segment);
  const hasCjk = chars.some((char) => CJK_CHARACTER.test(char));
  let count = 0;
  let index = 0;

  while (index < chars.length) {
    const current = chars[index];

    if (CJK_CHARACTER.test(current)) {
      count += 1;
      index += 1;
      continue;
    }

    if (LATIN_OR_DIGIT.test(current) || CONNECTOR.test(current)) {
      if (hasCjk && LATIN_OR_DIGIT.test(current)) {
        count += 1;
        index += 1;
        continue;
      }

      let hasAlphaNumeric = LATIN_OR_DIGIT.test(current);
      index += 1;

      while (index < chars.length) {
        const next = chars[index];
        if (!LATIN_OR_DIGIT.test(next) && !CONNECTOR.test(next)) {
          break;
        }

        if (LATIN_OR_DIGIT.test(next)) {
          hasAlphaNumeric = true;
        }

        index += 1;
      }

      if (hasAlphaNumeric) {
        count += 1;
      }

      continue;
    }

    index += 1;
  }

  return count;
}

export function countSelectionUnits(text: string): number {
  const normalized = normalizeSelectionText(text);

  if (!normalized) {
    return 0;
  }

  return normalized
    .split(/\s+/u)
    .filter(Boolean)
    .reduce((total, segment) => total + countSegmentUnits(segment), 0);
}
