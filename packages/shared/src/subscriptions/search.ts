import {
  SUBSCRIPTION_ASSETS,
  getSubscriptionSearchKeywords,
  type SubscriptionAsset,
} from "./assets";

/** Search starts after this many characters (Google / Maps-style). */
export const MIN_SUBSCRIPTION_SEARCH_CHARS = 2;
/** Debounce window (ms) applied to keystrokes before searching. */
export const SUBSCRIPTION_SEARCH_DEBOUNCE_MS = 120;
/** Default cap on suggestion rows. */
export const SUBSCRIPTION_SEARCH_LIMIT = 12;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Score an asset against a normalized query. Higher is better; 0 = no match.
 * Ranking mirrors familiar search UX — exact + prefix beats word-prefix beats
 * substring beats keyword/category, so the most relevant brand sits on top.
 */
function scoreAsset(asset: SubscriptionAsset, query: string): number {
  const name = asset.name.toLowerCase();
  if (name === query) {
    return 1000;
  }
  if (name.startsWith(query)) {
    return 800 - name.length;
  }

  const words = name.split(/[\s.+/-]+/);
  if (words.some((word) => word.startsWith(query))) {
    return 600 - name.length;
  }
  if (name.includes(query)) {
    return 400 - name.length;
  }

  const keywords = getSubscriptionSearchKeywords(asset);
  if (keywords.some((kw) => kw.toLowerCase().startsWith(query))) {
    return 300;
  }
  if (keywords.some((kw) => kw.toLowerCase().includes(query))) {
    return 200;
  }
  if (asset.category.toLowerCase().includes(query)) {
    return 100;
  }
  return 0;
}

/**
 * Local, synchronous subscription search — no network. Returns `[]` for queries
 * shorter than {@link MIN_SUBSCRIPTION_SEARCH_CHARS}; otherwise the best matches
 * by relevance, then alphabetically, capped at `limit`.
 */
export function searchSubscriptionAssets(
  rawQuery: string,
  limit: number = SUBSCRIPTION_SEARCH_LIMIT,
): SubscriptionAsset[] {
  const query = normalize(rawQuery);
  if (query.length < MIN_SUBSCRIPTION_SEARCH_CHARS) {
    return [];
  }

  return SUBSCRIPTION_ASSETS.map((asset) => ({
    asset,
    score: scoreAsset(asset, query),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : a.asset.name.localeCompare(b.asset.name),
    )
    .slice(0, limit)
    .map((entry) => entry.asset);
}
