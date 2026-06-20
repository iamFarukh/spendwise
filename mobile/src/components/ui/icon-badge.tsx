import {type ComponentType} from 'react';
import {StyleSheet, View} from 'react-native';

import {type IconProps} from '@/components/icons';
import {colors} from '@/constants/theme';

export type BadgeTone =
  | 'mint'
  | 'income'
  | 'expense'
  | 'invest'
  | 'transfer'
  | 'pending';

const TONES: Record<BadgeTone, {bg: string; fg: string}> = {
  mint: {bg: colors.mint100, fg: colors.mint700},
  income: {bg: colors.incomeBg, fg: colors.income},
  expense: {bg: colors.expenseBg, fg: colors.expense},
  invest: {bg: colors.investBg, fg: colors.invest},
  transfer: {bg: colors.transferBg, fg: colors.transfer},
  pending: {bg: colors.pendingBg, fg: colors.pending},
};

const SIZES = {
  sm: {box: 30, radius: 9, icon: 16},
  md: {box: 40, radius: 12, icon: 20},
  lg: {box: 50, radius: 15, icon: 25},
} as const;

type IconBadgeProps = {
  icon: ComponentType<IconProps>;
  /** Semantic tone — sets background + icon color. */
  tone?: BadgeTone;
  /** Explicit overrides (used for category palette colors outside the tone set). */
  bg?: string;
  color?: string;
  size?: keyof typeof SIZES;
};

/** Colored rounded-square icon container — mirrors `.ic` / `.ic-sm` / `.ic-lg`. */
export function IconBadge({
  icon: Icon,
  tone = 'mint',
  bg,
  color,
  size = 'md',
}: IconBadgeProps) {
  const dims = SIZES[size];
  const palette = TONES[tone];
  return (
    <View
      style={[
        styles.box,
        {
          width: dims.box,
          height: dims.box,
          borderRadius: dims.radius,
          backgroundColor: bg ?? palette.bg,
        },
      ]}>
      <Icon size={dims.icon} color={color ?? palette.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {alignItems: 'center', justifyContent: 'center'},
});
