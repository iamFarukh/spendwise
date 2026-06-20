import {useEffect} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {IconCheck, IconDown} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';

type Edge = 'left' | 'right';
type TagKind = 'value' | 'key' | 'success' | 'flow';

type Tag = {
  id: string;
  kind: TagKind;
  edge: Edge;
  /** Horizontal inset (fraction of width) from the chosen edge. */
  x: number;
  /** Vertical position (fraction of height). */
  y: number;
  delay: number;
  label?: string;
  value?: string;
  dest?: string;
};

// Scattered across the empty top + bottom bands only — the centre (logo + node
// graph) is deliberately left clear. Tuned so ~4–6 are near peak at any moment.
const TAGS: Tag[] = [
  // Top band (above the node graph)
  {id: 'rupee1', kind: 'value', edge: 'left', x: 0.06, y: 0.13, delay: 120, label: '₹1,499'},
  {id: 'upi', kind: 'key', edge: 'right', x: 0.09, y: 0.13, delay: 320, label: 'UPI'},
  {id: 'sip50', kind: 'value', edge: 'left', x: 0.25, y: 0.25, delay: 760, label: '₹50 SIP'},
  {id: 'autopay', kind: 'key', edge: 'right', x: 0.05, y: 0.25, delay: 980, label: 'AutoPay'},
  // Bottom band (below the logo)
  {id: 'savings', kind: 'key', edge: 'left', x: 0.07, y: 0.62, delay: 240, label: 'Savings'},
  {id: 'invest', kind: 'key', edge: 'right', x: 0.06, y: 0.63, delay: 520, label: 'Investment'},
  {id: 'flow1', kind: 'flow', edge: 'left', x: 0.2, y: 0.72, delay: 1000, value: '₹500', dest: 'Bank'},
  {id: 'flow2', kind: 'flow', edge: 'right', x: 0.18, y: 0.73, delay: 1360, value: '₹1,000', dest: 'SIP'},
  {id: 'rupee250', kind: 'value', edge: 'left', x: 0.1, y: 0.84, delay: 1280, label: '₹250'},
  {id: 'emi', kind: 'key', edge: 'right', x: 0.08, y: 0.85, delay: 1540, label: 'EMI'},
  {id: 'expense', kind: 'success', edge: 'left', x: 0.28, y: 0.79, delay: 1760, label: 'Expense added'},
  {id: 'siprec', kind: 'success', edge: 'right', x: 0.24, y: 0.88, delay: 2120, label: 'SIP recorded'},
];

const TONE: Record<TagKind, string> = {
  value: colors.mint700,
  key: colors.ink500,
  success: colors.mint700,
  flow: colors.ink600,
};

/**
 * Ambient finance environment behind the splash centrepiece. Soft chips, two
 * micro value→destination flows, and brief "saved" tags drift up and breathe in
 * the empty canvas — never near the logo, never fast. Pure opacity + translateY
 * on the UI thread. Honors reduced motion (static, faint).
 */
export function BackgroundFinanceLayer({paused}: {paused: boolean}) {
  const {width, height} = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Faint depth blobs (5–8% opacity) for soft layering behind the chips. */}
      <View style={[styles.blobLeft, {top: height * 0.52}]} />
      <View style={[styles.blobRight, {top: height * 0.34}]} />

      {TAGS.map((tag, i) => {
        const pos: StyleProp<ViewStyle> =
          tag.edge === 'left'
            ? {left: Math.round(tag.x * width), top: Math.round(tag.y * height)}
            : {right: Math.round(tag.x * width), top: Math.round(tag.y * height)};
        return (
          <FinanceTag key={tag.id} tag={tag} pos={pos} index={i} paused={paused} />
        );
      })}
    </View>
  );
}

function FinanceTag({
  tag,
  pos,
  index,
  paused,
}: {
  tag: Tag;
  pos: StyleProp<ViewStyle>;
  index: number;
  paused: boolean;
}) {
  const t = useSharedValue(0);
  // Slightly varied peaks/durations so the field breathes organically.
  const peak = 0.42 + (index % 3) * 0.06;
  const duration = 2600 + (index % 4) * 220;

  useEffect(() => {
    if (paused) {
      return;
    }
    t.value = withDelay(
      tag.delay,
      withRepeat(
        withTiming(1, {duration, easing: Easing.inOut(Easing.sin)}),
        -1,
        true,
      ),
    );
  }, [duration, paused, t, tag.delay]);

  const style = useAnimatedStyle(() => {
    if (paused) {
      return {opacity: peak * 0.7, transform: [{translateY: 0}]};
    }
    return {
      // Triangle fade (0 → peak → 0): each tag enters, breathes, exits, so only
      // a handful sit near peak at any instant.
      opacity: interpolate(t.value, [0, 0.5, 1], [0, peak, 0], Extrapolation.CLAMP),
      transform: [{translateY: interpolate(t.value, [0, 1], [8, -8])}],
    };
  });

  const color = TONE[tag.kind];

  if (tag.kind === 'flow') {
    return (
      <Animated.View style={[styles.flow, pos, style]}>
        <AppText style={[styles.flowValue, {color: colors.mint700}]}>
          {tag.value}
        </AppText>
        <IconDown size={11} color={colors.mint400} />
        <AppText style={[styles.flowDest, {color: colors.ink500}]}>
          {tag.dest}
        </AppText>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.chip, pos, style]}>
      {tag.kind === 'success' ? (
        <IconCheck size={11} color={colors.mint600} strokeWidth={3} />
      ) : null}
      <AppText style={[styles.chipText, {color}]}>{tag.label}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  blobLeft: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    left: -90,
    backgroundColor: colors.mint300,
    opacity: 0.06,
  },
  blobRight: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    right: -70,
    backgroundColor: colors.mint200,
    opacity: 0.07,
  },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.xs,
  },
  chipText: {fontSize: 11.5, fontWeight: '700', letterSpacing: 0.1},
  flow: {
    position: 'absolute',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.xs,
  },
  flowValue: {fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums']},
  flowDest: {fontSize: 10, fontWeight: '700', letterSpacing: 0.2},
});
