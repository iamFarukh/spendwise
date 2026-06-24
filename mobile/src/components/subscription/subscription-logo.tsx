import {memo, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';

import {
  deriveSubscriptionMonogram,
  resolveSubscriptionBrandColor,
  resolveSubscriptionIcon,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {colors} from '@/constants/theme';

type SubscriptionLogoProps = {
  name: string;
  /** Brand icon slug from the master catalogue. */
  iconSlug?: string | null;
  /** Category label — used for fallback glyphs. */
  category?: string | null;
  /** Brand color (hex). Falls back to resolved icon / category tint. */
  color?: string | null;
  /** Explicit monogram when no vector icon resolves. */
  monogram?: string | null;
  size?: number;
};

/** Relative luminance → choose readable text/icon color over the brand tile. */
function readableForeground(hex: string): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return '#FFFFFF';
  }
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.6 ? colors.ink900 : '#FFFFFF';
}

/**
 * Brand tile with an offline SVG logo (Simple Icons + bundled paths) or a
 * category fallback glyph / monogram. No network, no PNG assets.
 */
export const SubscriptionLogo = memo(function SubscriptionLogo({
  name,
  iconSlug,
  category = 'Other',
  color,
  monogram,
  size = 44,
}: SubscriptionLogoProps) {
  const resolvedCategory = category?.trim() || 'Other';
  const bg = useMemo(
    () =>
      resolveSubscriptionBrandColor({
        color,
        iconSlug,
        category: resolvedCategory,
      }),
    [color, iconSlug, resolvedCategory],
  );
  const fg = useMemo(() => readableForeground(bg), [bg]);
  const icon = useMemo(
    () =>
      iconSlug
        ? resolveSubscriptionIcon(iconSlug, resolvedCategory)
        : null,
    [iconSlug, resolvedCategory],
  );
  const iconMonogram = icon?.kind === 'monogram' ? icon.monogram : null;
  const mark = (
    monogram?.trim() ||
    iconMonogram ||
    deriveSubscriptionMonogram(name)
  ).slice(0, 3);
  const fontSize = mark.length >= 3 ? size * 0.3 : size * 0.4;
  const tileRadius = Math.round(size * 0.28);
  const glyphSize = size * 0.56;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: tileRadius,
          backgroundColor: bg,
        },
      ]}
      accessibilityLabel={`${name} logo`}>
      {icon?.kind === 'brand' ? (
        <Svg
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 24 24"
          accessible={false}>
          <Path d={icon.path} fill={fg} />
        </Svg>
      ) : icon?.kind === 'fallback' ? (
        <Svg
          width={glyphSize}
          height={glyphSize}
          viewBox={icon.icon.viewBox}
          accessible={false}>
          {icon.icon.paths.map((d, index) => (
            <Path
              key={index}
              d={d}
              fill={icon.icon.stroke ? 'none' : fg}
              stroke={icon.icon.stroke ? fg : undefined}
              strokeWidth={icon.icon.stroke ? 1.75 : undefined}
              strokeLinecap={icon.icon.stroke ? 'round' : undefined}
              strokeLinejoin={icon.icon.stroke ? 'round' : undefined}
            />
          ))}
        </Svg>
      ) : (
        <AppText
          style={[styles.mark, {color: fg, fontSize}]}
          numberOfLines={1}
          allowFontScaling={false}>
          {mark}
        </AppText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Hairline ring so pale brand tiles (yellow, white) stay crisp on cards.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(14,42,34,0.10)',
  },
  mark: {
    fontWeight: '800',
    letterSpacing: -0.4,
    includeFontPadding: false,
  },
});
