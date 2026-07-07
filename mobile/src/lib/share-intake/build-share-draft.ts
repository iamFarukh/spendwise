import type {Category, Transaction} from '@pfos/shared';

import {findDuplicate} from './find-duplicate';
import {normalizeMerchant} from './normalize-merchant';
import type {SharePayload} from './native';
import {parseSharedText} from './parser';
import {predictCategory} from './predict-category';
import type {ShareDraft} from './types';

/**
 * The intake pipeline: parse → normalize merchant → predict category → detect
 * duplicate. Pure and UI-free so it can be unit-tested without the provider tree.
 * Merchant is normalized before prediction and dedup so brand variants collapse.
 */
export function buildShareDraft(
  payload: SharePayload,
  categories: Category[],
  recent: Transaction[],
): ShareDraft {
  const parsed = parseSharedText(payload.text);
  parsed.sourceApp = payload.sourceApp;

  // Keep the merchant's original casing for display/save; normalize only for
  // category prediction and duplicate detection (findDuplicate normalizes both
  // sides internally).
  const normalized = normalizeMerchant(parsed.merchant);
  parsed.categoryId = predictCategory(normalized, categories);

  const duplicate = findDuplicate(parsed, recent);
  return {parsed, duplicate};
}
