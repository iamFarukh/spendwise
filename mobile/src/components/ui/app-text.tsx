import {Text, TextProps, StyleSheet} from 'react-native';

import {colors, fontSize} from '@/constants/theme';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'sm' | 'xs' | 'label';

const variantStyles: Record<Variant, object> = {
  display: {fontSize: fontSize.display, fontWeight: '700', color: colors.ink900},
  h1: {fontSize: fontSize.h1, fontWeight: '700', color: colors.ink900},
  h2: {fontSize: fontSize.h2, fontWeight: '700', color: colors.ink900},
  h3: {fontSize: fontSize.h3, fontWeight: '700', color: colors.ink900},
  body: {fontSize: fontSize.body, color: colors.ink600},
  sm: {fontSize: fontSize.sm, color: colors.ink500},
  xs: {fontSize: fontSize.xs, color: colors.ink400},
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.ink600,
  },
};

type AppTextProps = TextProps & {
  variant?: Variant;
  muted?: boolean;
};

export function AppText({
  variant = 'body',
  muted,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[
        styles.base,
        variantStyles[variant],
        muted && styles.muted,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
  },
  muted: {
    color: colors.ink400,
  },
});
