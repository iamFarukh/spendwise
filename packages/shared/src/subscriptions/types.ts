/**
 * Catalog billing cadence — lowercase slugs stored on master assets.
 * Map to {@link SubscriptionBillingCycle} via `toSubscriptionBillingCycle`.
 */
export type SubscriptionCatalogCycle =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly";

/** Master asset entry — offline subscription catalogue (no prices). */
export interface SubscriptionAsset {
  /** Unique slug id, persisted on the subscription as `assetId`. */
  id: string;
  /** Display name, e.g. "ChatGPT Plus". */
  name: string;
  /** Human category label, e.g. "AI", "Streaming", "Cloud Storage". */
  category: string;
  /**
   * Brand icon identifier — resolved via the icon registry to a Simple Icons
   * slug, a bundled custom SVG, or a category fallback glyph.
   */
  iconSlug: string;
  /** Typical billing cadence when the user picks this service. */
  defaultCycle: SubscriptionCatalogCycle;
  /** Surfaces in suggestions, quick-add chips, and popular filters. */
  isPopular: boolean;
  /** Extra search aliases beyond the name + category words. */
  searchKeywords: string[];
  /**
   * Optional brand hex override for the logo tile background.
   * When omitted, resolved from the icon registry.
   */
  color?: string;
  /**
   * Optional short monogram when no vector icon resolves.
   * When omitted, derived from the name.
   */
  mark?: string;
  /** @deprecated Use `searchKeywords`. Kept for transitional reads. */
  keywords?: string[];
}
