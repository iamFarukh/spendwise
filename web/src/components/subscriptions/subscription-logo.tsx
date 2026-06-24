import {
  deriveSubscriptionMonogram,
  resolveSubscriptionBrandColor,
  resolveSubscriptionIcon,
} from "@pfos/shared";

type SubscriptionLogoProps = {
  name: string;
  iconSlug?: string | null;
  category?: string | null;
  color?: string | null;
  monogram?: string | null;
  size?: number;
  className?: string;
};

/** Relative luminance → readable foreground over the brand tile. */
function readableForeground(hex: string): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return "#FFFFFF";
  }
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.6 ? "#0E2A22" : "#FFFFFF";
}

/**
 * Brand tile with offline SVG logo (Simple Icons + bundled paths) or a
 * category fallback glyph / monogram. Mirrors the mobile `SubscriptionLogo`.
 */
export function SubscriptionLogo({
  name,
  iconSlug,
  category = "Other",
  color,
  monogram,
  size = 44,
  className,
}: SubscriptionLogoProps) {
  const resolvedCategory = category?.trim() || "Other";
  const bg = resolveSubscriptionBrandColor({
    color,
    iconSlug,
    category: resolvedCategory,
  });
  const fg = readableForeground(bg);
  const icon = iconSlug
    ? resolveSubscriptionIcon(iconSlug, resolvedCategory)
    : null;
  const iconMonogram = icon?.kind === "monogram" ? icon.monogram : null;
  const mark = (
    monogram?.trim() ||
    iconMonogram ||
    deriveSubscriptionMonogram(name)
  ).slice(0, 3);
  const glyphSize = size * 0.56;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center leading-none ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: bg,
        color: fg,
        fontSize: mark.length >= 3 ? size * 0.3 : size * 0.4,
        fontWeight: 800,
        boxShadow: "inset 0 0 0 1px rgba(14,42,34,0.10)",
      }}
      aria-hidden
    >
      {icon?.kind === "brand" ? (
        <svg
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d={icon.path} fill="currentColor" />
        </svg>
      ) : icon?.kind === "fallback" ? (
        <svg
          width={glyphSize}
          height={glyphSize}
          viewBox={icon.icon.viewBox}
          aria-hidden
        >
          {icon.icon.paths.map((d, index) => (
            <path
              key={index}
              d={d}
              fill={icon.icon.stroke ? "none" : "currentColor"}
              stroke={icon.icon.stroke ? "currentColor" : undefined}
              strokeWidth={icon.icon.stroke ? 1.75 : undefined}
              strokeLinecap={icon.icon.stroke ? "round" : undefined}
              strokeLinejoin={icon.icon.stroke ? "round" : undefined}
            />
          ))}
        </svg>
      ) : (
        mark
      )}
    </span>
  );
}
