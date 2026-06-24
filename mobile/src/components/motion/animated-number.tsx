import {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, type TextStyle} from 'react-native';
import {
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {TIMINGS} from '@/constants/motion';

type AnimatedNumberProps = {
  /** Target numeric value to count toward. */
  value: number;
  /** Formats the interpolated value into display text (e.g. currency). */
  format: (value: number) => string;
  style?: TextStyle | TextStyle[];
};

/**
 * Counts up to `value` over ~650ms — from 0 on first mount (a satisfying
 * dashboard reveal), then from the previous value on later changes. The
 * interpolated number lives on the UI thread (a shared value), but `format`
 * runs on the JS thread via runOnJS — `Intl`-based formatters are NOT worklets
 * and crash if called inside one. We only re-render when the formatted string
 * actually changes.
 */
export function AnimatedNumber({value, format, style}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  // Start at 0 so the first reveal counts up; reduced motion shows the value.
  const progress = useSharedValue(reduceMotion ? value : 0);
  const [display, setDisplay] = useState(() =>
    format(reduceMotion ? value : 0),
  );

  // Keep the latest formatter without destabilizing the JS-thread callback.
  const formatRef = useRef(format);
  formatRef.current = format;

  const update = useCallback((next: number) => {
    const text = formatRef.current(next);
    setDisplay(prev => (prev === text ? prev : text));
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = value;
      update(value);
      return;
    }
    progress.value = withTiming(value, {
      duration: 650,
      easing: TIMINGS.slow.easing,
    });
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  useAnimatedReaction(
    () => progress.value,
    current => {
      runOnJS(update)(current);
    },
  );

  return (
    <Text style={[styles.text, style]} numberOfLines={1}>
      {display}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {fontVariant: ['tabular-nums']},
});
