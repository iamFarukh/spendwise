/**
 * Subscription Master Asset Library — offline catalogue of ~250 popular
 * recurring services. Powers search, suggestions, logos, category filters,
 * and analytics. No network, no remote URLs, no PNG logos.
 *
 * Each entry is amount-free — users always enter their own price. To add a
 * service, edit `scripts/build-subscription-catalog.mjs` and regenerate.
 */

export type {
  SubscriptionAsset,
  SubscriptionCatalogCycle,
} from "./types";

export { SUBSCRIPTION_ASSETS } from "./catalog.generated";

import type { SubscriptionBillingCycle } from "../types/subscription";
import type { SubscriptionAsset, SubscriptionCatalogCycle } from "./types";
import { SUBSCRIPTION_ASSETS } from "./catalog.generated";

/** Curated category list — used for filters and custom-subscription picker. */
export const SUBSCRIPTION_CATEGORIES = [
  "AI",
  "Streaming",
  "Music",
  "Cloud Storage",
  "Productivity",
  "Developer Tools",
  "Design & Creative",
  "Security",
  "Learning",
  "Fitness",
  "Finance",
  "Communication",
  "News",
  "Gaming",
  "Shopping",
  "Reading",
  "Other",
] as const;

const ASSET_BY_ID: Map<string, SubscriptionAsset> = new Map(
  SUBSCRIPTION_ASSETS.map((asset) => [asset.id, asset]),
);

const ASSETS_BY_CATEGORY: Map<string, SubscriptionAsset[]> = new Map();

for (const asset of SUBSCRIPTION_ASSETS) {
  const list = ASSETS_BY_CATEGORY.get(asset.category) ?? [];
  list.push(asset);
  ASSETS_BY_CATEGORY.set(asset.category, list);
}

/** O(1) lookup of an asset by its id (persisted as `assetId`). */
export function getSubscriptionAsset(
  id: string | null | undefined,
): SubscriptionAsset | null {
  if (!id) {
    return null;
  }
  return ASSET_BY_ID.get(id) ?? null;
}

/** All assets in a category, alphabetically. */
export function getSubscriptionAssetsByCategory(
  category: string,
): SubscriptionAsset[] {
  const items = ASSETS_BY_CATEGORY.get(category) ?? [];
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

/** Popular catalogue entries for suggestions and quick-add chips. */
export function getPopularSubscriptionAssets(
  limit = 24,
): SubscriptionAsset[] {
  return SUBSCRIPTION_ASSETS.filter((asset) => asset.isPopular)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Map catalogue default cycle → persisted billing cycle enum. */
export function toSubscriptionBillingCycle(
  cycle: SubscriptionCatalogCycle,
): SubscriptionBillingCycle {
  switch (cycle) {
    case "weekly":
      return "WEEKLY";
    case "quarterly":
      return "QUARTERLY";
    case "half_yearly":
      return "HALF_YEARLY";
    case "yearly":
      return "YEARLY";
    case "monthly":
    default:
      return "MONTHLY";
  }
}

/** Effective search keywords — includes legacy `keywords` alias when present. */
export function getSubscriptionSearchKeywords(
  asset: SubscriptionAsset,
): string[] {
  if (asset.searchKeywords?.length) {
    return asset.searchKeywords;
  }
  return asset.keywords ?? [];
}

/** Resolve logo tile props from a saved subscription + optional catalogue asset. */
export function getSubscriptionLogoProps(
  subscription: {
    name: string;
    assetId?: string | null;
    iconSlug?: string | null;
    category: string;
    color?: string | null;
    monogram?: string | null;
  },
  asset?: SubscriptionAsset | null,
): {
  name: string;
  iconSlug: string | null;
  category: string;
  color: string | null;
  monogram: string | null;
} {
  const resolvedAsset = asset ?? getSubscriptionAsset(subscription.assetId);
  return {
    name: subscription.name,
    iconSlug: subscription.iconSlug ?? resolvedAsset?.iconSlug ?? null,
    category: subscription.category,
    color:
      subscription.color ??
      resolvedAsset?.color ??
      (resolvedAsset
        ? null
        : subscription.color ?? null),
    monogram: subscription.monogram ?? resolvedAsset?.mark ?? null,
  };
}
