export function num(v?: string): number | undefined {
  if (!v) {
    return undefined;
  }
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Amount with an explicit currency marker — trustworthy. */
const STRICT_AMOUNT = /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;

/**
 * A line that is just a number, optionally prefixed by a single glyph. On UPI
 * receipts the amount is shown on its own prominent line as "₹20"; OCR frequently
 * misreads the ₹ as F, R, z, T, ¥, $ or ? — so we accept one leading letter/symbol.
 */
const OCR_AMOUNT_LINE =
  /^[₹¥$₨frzt?]?\s?((?:[0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{1,7})(?:\.[0-9]{1,2})?)$/i;

const YEAR = /^(?:19|20)[0-9]{2}$/;

export type AmountResult = {amount?: number; fallback: boolean};

/**
 * Extracts a transaction amount. Prefers an explicit currency match (₹/Rs/INR).
 * Falls back to isolated numeric lines when OCR has mangled the currency symbol,
 * skipping long ids / UTRs / account numbers / years. When two lines carry the
 * same value (receipts often print the amount twice) that value wins. A fallback
 * amount is flagged so callers can lower confidence and prompt the user to verify.
 */
export function extractAmount(cleaned: string): AmountResult {
  const strict = cleaned.match(STRICT_AMOUNT);
  if (strict) {
    const a = num(strict[1]);
    if (a != null) {
      return {amount: a, fallback: false};
    }
  }

  const candidates: number[] = [];
  for (const raw of cleaned.split('\n')) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const m = line.match(OCR_AMOUNT_LINE);
    if (!m) {
      continue;
    }
    const intPart = m[1].split('.')[0].replace(/,/g, '');
    if (intPart.length >= 8) {
      continue; // account / UTR / txn-id digits
    }
    if (YEAR.test(intPart)) {
      continue;
    }
    const n = num(m[1]);
    if (n != null && n < 1_000_000) {
      candidates.push(n);
    }
  }

  if (candidates.length === 0) {
    return {amount: undefined, fallback: false};
  }

  const counts = new Map<number, number>();
  for (const c of candidates) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best = candidates[0];
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return {amount: best, fallback: true};
}
