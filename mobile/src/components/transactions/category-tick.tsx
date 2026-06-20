import {useEffect} from 'react';
import {Pressable, StyleSheet} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {IconCheck, IconGrid} from '@/components/icons';
import {SPRINGS, TIMINGS} from '@/constants/motion';
import {colors, radius} from '@/constants/theme';

type CategoryTickProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Match the Save button height so the footer row stays level. */
  size?: number;
};

/**
 * Compact square toggle that shares the Save row when adding a custom expense.
 * Off shows the category glyph (the label is used only for this expense); on
 * cross-fades to a white tick on mint (the label will be saved as a reusable
 * category). Box, border, both glyphs and the press squish animate on the UI
 * thread so the toggle reads as one continuous physical motion.
 */
export function CategoryTick({checked, onChange, size = 54}: CategoryTickProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(checked ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(checked ? 1 : 0, TIMINGS.fast)
      : withSpring(checked ? 1 : 0, SPRINGS.snappy);
  }, [checked, progress, reduceMotion]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.canvas, colors.mint500],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.line, colors.mint500],
    ),
    transform: [
      {scale: interpolate(press.value, [0, 1], [1, 0.9], Extrapolation.CLAMP)},
    ],
  }));

  const offStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [
      {scale: interpolate(progress.value, [0, 1], [1, 0.5], Extrapolation.CLAMP)},
    ],
  }));

  const onStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {scale: interpolate(progress.value, [0, 1], [0.5, 1], Extrapolation.CLAMP)},
    ],
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel="Save as a category"
      accessibilityState={{checked}}
      hitSlop={6}
      onPress={() => onChange(!checked)}
      onPressIn={() => {
        press.value = withSpring(1, SPRINGS.snappy);
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRINGS.snappy);
      }}>
      <Animated.View style={[styles.box, {width: size, height: size}, boxStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, offStyle]}>
          <IconGrid size={22} color={colors.ink400} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, onStyle]}>
          <IconCheck size={24} color={colors.white} strokeWidth={2.6} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {borderRadius: radius.md, borderWidth: 1.5},
  center: {alignItems: 'center', justifyContent: 'center'},
});
