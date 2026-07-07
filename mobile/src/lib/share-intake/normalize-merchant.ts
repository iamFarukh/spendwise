const NOISE_WORDS = [
  'pay',
  'india',
  'private',
  'limited',
  'ltd',
  'pvt',
  'services',
  'payments',
];

/**
 * Collapses merchant variants to one canonical form so category prediction and
 * duplicate detection both see the same value ("AMAZON PAY INDIA", "Amazon Pay"
 * and "Amazon" → "amazon"). Strips UPI handles ("swiggy@okhdfcbank" → "swiggy").
 */
export function normalizeMerchant(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  let s = raw.toLowerCase().trim();
  s = s.split('@')[0]; // strip UPI handle
  s = s.replace(/[^a-z0-9 ]+/g, ' '); // drop punctuation
  const words = s
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => !NOISE_WORDS.includes(w));
  const result = words.join(' ').trim();
  return result.length > 0 ? result : undefined;
}
