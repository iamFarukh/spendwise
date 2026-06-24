import type { SubscriptionCategoryFallback } from "./fallbacks";
import {
  SUBSCRIPTION_CATEGORY_FALLBACK,
  SUBSCRIPTION_CATEGORY_FALLBACK_HEX,
  SUBSCRIPTION_FALLBACK_ICONS,
  type SubscriptionFallbackIcon,
} from "./fallbacks";
import { SUBSCRIPTION_CUSTOM_BRAND_ICONS } from "./custom-brands.generated";
import { getSubscriptionManualBrandTile } from "./manual-brands";
import { resolveSubscriptionIconSlug } from "./registry";

export type SubscriptionIconSource =
  | "simple-icons"
  | "iconify-simple-icons"
  | "category-fallback";

export interface SubscriptionBrandIcon {
  slug: string;
  title: string;
  hex: string;
  path: string;
  source: "simple-icons" | "iconify-simple-icons";
}

export interface SubscriptionResolvedIcon {
  kind: "brand";
  slug: string;
  hex: string;
  path: string;
  source: SubscriptionIconSource;
}

export interface SubscriptionResolvedMonogram {
  kind: "monogram";
  slug: string;
  hex: string;
  monogram: string;
}

export interface SubscriptionResolvedFallback {
  kind: "fallback";
  category: string;
  fallback: SubscriptionCategoryFallback;
  hex: string;
  icon: SubscriptionFallbackIcon;
}

export type SubscriptionIconData =
  | SubscriptionResolvedIcon
  | SubscriptionResolvedMonogram
  | SubscriptionResolvedFallback;

/** Resolve offline icon data for a catalogue entry or saved subscription. */
export function resolveSubscriptionIcon(
  iconSlug: string | null | undefined,
  category: string,
): SubscriptionIconData {
  const resolvedSlug = resolveSubscriptionIconSlug(iconSlug ?? "");
  const brand = SUBSCRIPTION_CUSTOM_BRAND_ICONS[resolvedSlug];
  if (brand?.path) {
    return {
      kind: "brand",
      slug: resolvedSlug,
      hex: brand.hex,
      path: brand.path,
      source: brand.source,
    };
  }

  // No offline vector logo — use a hand-authored brand-colored monogram tile
  // (recognizable + distinct per brand) before any generic category glyph.
  const manual = getSubscriptionManualBrandTile(resolvedSlug);
  if (manual) {
    return {
      kind: "monogram",
      slug: resolvedSlug,
      hex: manual.hex,
      monogram: manual.monogram,
    };
  }

  const fallback =
    SUBSCRIPTION_CATEGORY_FALLBACK[category] ??
    SUBSCRIPTION_CATEGORY_FALLBACK.Other;
  return {
    kind: "fallback",
    category,
    fallback,
    hex: SUBSCRIPTION_CATEGORY_FALLBACK_HEX[fallback],
    icon: SUBSCRIPTION_FALLBACK_ICONS[fallback],
  };
}

/** Brand tile background — explicit override → icon hex → category tint. */
export function resolveSubscriptionBrandColor(input: {
  color?: string | null;
  iconSlug?: string | null;
  category: string;
}): string {
  if (input.color && /^#([0-9a-f]{6})$/i.test(input.color)) {
    return input.color;
  }
  const icon = resolveSubscriptionIcon(input.iconSlug, input.category);
  return icon.hex;
}

export {
  SUBSCRIPTION_CATEGORY_FALLBACK,
  SUBSCRIPTION_CATEGORY_FALLBACK_HEX,
  SUBSCRIPTION_FALLBACK_ICONS,
};
