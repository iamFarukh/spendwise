import type {Category} from '@pfos/shared';

/** Merchant keyword → canonical category name. */
const KEYWORD_TO_CATEGORY: Array<[RegExp, string]> = [
  [/swiggy|zomato|dominos|kfc|restaurant|cafe|food/i, 'Food'],
  [/uber|ola|rapido|irctc|metro|fuel|petrol|transport/i, 'Transport'],
  [/amazon|flipkart|myntra|ajio|shop/i, 'Shopping'],
  [/netflix|spotify|hotstar|prime|subscription/i, 'Entertainment'],
  [/electricity|water|gas|broadband|recharge|bill/i, 'Bills'],
];

/**
 * Maps a normalized merchant to one of the user's EXISTING categories by name.
 * Never creates categories; returns undefined when there's no keyword hit or no
 * matching user category (which keeps parse confidence low).
 */
export function predictCategory(
  normalizedMerchant: string | undefined,
  userCategories: Category[],
): string | undefined {
  if (!normalizedMerchant) {
    return undefined;
  }
  for (const [re, name] of KEYWORD_TO_CATEGORY) {
    if (re.test(normalizedMerchant)) {
      const match = userCategories.find(
        c => c.name.toLowerCase() === name.toLowerCase() && !c.system,
      );
      return match?.id;
    }
  }
  return undefined;
}
