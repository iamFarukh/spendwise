import type {Transaction} from '@pfos/shared';

import {normalizeMerchant} from './normalize-merchant';
import type {ParsedShare} from './parser/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function sameDayWindow(a: string, b: string): boolean {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) {
    return false;
  }
  return Math.abs(ta - tb) <= DAY_MS;
}

/**
 * Finds an existing transaction that looks like this shared draft. Strong match:
 * the shared txn reference appears in a stored transaction's raw import text.
 * Otherwise: same amount + normalized merchant within a ±1 day window. Merchant
 * is normalized on both sides so "Amazon Pay" and "AMAZON PAY INDIA" match.
 */
export function findDuplicate(
  parsed: ParsedShare,
  recent: Transaction[],
): Transaction | null {
  if (parsed.txnRef) {
    for (const t of recent) {
      if (t.importMeta?.rawText?.includes(parsed.txnRef)) {
        return t;
      }
    }
  }

  if (parsed.amount == null) {
    return null;
  }

  const pMerchant = normalizeMerchant(parsed.merchant);

  for (const t of recent) {
    if (t.amount !== parsed.amount) {
      continue;
    }
    if (!sameDayWindow(parsed.date, t.date)) {
      continue;
    }
    const tMerchant = normalizeMerchant(t.merchant);
    if (pMerchant && tMerchant && pMerchant === tMerchant) {
      return t;
    }
    if (!pMerchant && !tMerchant) {
      return t;
    }
  }
  return null;
}
