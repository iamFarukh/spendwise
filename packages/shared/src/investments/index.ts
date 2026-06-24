import type { SipInvestmentType } from "../types/recurring";

/** Minimum characters before an investment search request is issued. */
export const MIN_INVESTMENT_SEARCH_CHARS = 3;
/** Debounce window (ms) applied to keystrokes before searching. */
export const INVESTMENT_SEARCH_DEBOUNCE_MS = 500;

/** A single result row from the mutual-fund search endpoint. */
export interface MutualFundSearchResult {
  schemeCode: number;
  schemeName: string;
}

const MFAPI_SEARCH_URL = "https://api.mfapi.in/mf/search";

/**
 * Search Indian mutual funds via the public mfapi.in endpoint. No backend
 * required — callable directly from the browser and from React Native.
 *
 * Pass an {@link AbortSignal} so callers can cancel a stale in-flight request
 * when the query changes (prevents race conditions — only the latest wins).
 * Returns `[]` for queries shorter than {@link MIN_INVESTMENT_SEARCH_CHARS}.
 */
export async function searchMutualFunds(
  query: string,
  signal?: AbortSignal,
): Promise<MutualFundSearchResult[]> {
  const q = query.trim();
  if (q.length < MIN_INVESTMENT_SEARCH_CHARS) {
    return [];
  }

  const response = await fetch(
    `${MFAPI_SEARCH_URL}?q=${encodeURIComponent(q)}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Mutual fund search failed (${response.status})`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(isMutualFundSearchResult).map((item) => ({
    schemeCode: item.schemeCode,
    schemeName: item.schemeName,
  }));
}

function isMutualFundSearchResult(item: unknown): item is MutualFundSearchResult {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as MutualFundSearchResult).schemeCode === "number" &&
    typeof (item as MutualFundSearchResult).schemeName === "string"
  );
}

/** Whether an investment type is wired to a live search endpoint. */
export function isSearchableInvestmentType(
  type?: SipInvestmentType | null,
): boolean {
  // Only mutual funds have a public search API today; the others are entered
  // by hand. Wire new endpoints here as they become available.
  return type === "MUTUAL_FUND";
}

/** Placeholder for the SIP "Name" field, driven by the chosen type. */
export function getInvestmentNamePlaceholder(
  type?: SipInvestmentType | null,
): string {
  switch (type) {
    case "MUTUAL_FUND":
      return "Search mutual fund...";
    case "STOCK":
      return "Search stock...";
    case "ETF":
      return "Search ETF...";
    case "GOLD":
      return "Gold investment name";
    case "RECURRING_DEPOSIT":
      return "Recurring deposit name";
    case "FIXED_DEPOSIT":
      return "Fixed deposit name";
    case "OTHER":
      return "Investment name";
    default:
      return "Select investment type first";
  }
}
