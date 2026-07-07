import type {Confidence, ParsedShare, ParserStrategy} from './types';
import {genericParser} from './generic';
import {googlePayParser} from './google-pay';
import {phonePeParser} from './phonepe';

/** App-specific strategies first, generic floor last. */
const STRATEGIES: ParserStrategy[] = [
  googlePayParser,
  phonePeParser,
  genericParser,
];

/** Cleaned copy used for matching; the original is preserved separately. */
function clean(text: string): string {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function toConfidence(
  score: number,
  hasAmount: boolean,
  hasMerchant: boolean,
): Confidence {
  if (score >= 90 && hasAmount && hasMerchant) {
    return 'high';
  }
  if (score >= 70) {
    return 'medium';
  }
  return 'low';
}

export function parseSharedText(rawText: string): ParsedShare {
  const cleaned = clean(rawText ?? '');

  let best = STRATEGIES[0].parse(cleaned);
  for (const strategy of STRATEGIES.slice(1)) {
    const result = strategy.parse(cleaned);
    if (result.score > best.score) {
      best = result;
    }
  }

  if (__DEV__) {
    // Parser debug mode: surface which strategy won and why.
    console.info('[share-parser]', {
      parser: best.parserName,
      score: best.score,
      fieldsFound: best.fieldsFound,
    });
  }

  const f = best.fields;
  const hasAmount = f.amount != null;
  const hasMerchant = Boolean(f.merchant);

  return {
    type: f.type ?? 'EXPENSE',
    amount: f.amount,
    merchant: f.merchant,
    date: f.date ?? new Date().toISOString(),
    txnRef: f.txnRef,
    categoryId: undefined,
    score: best.score,
    confidence: toConfidence(best.score, hasAmount, hasMerchant),
    parserName: best.parserName,
    parserVersion: best.parserVersion,
    rawText: rawText ?? '',
  };
}
