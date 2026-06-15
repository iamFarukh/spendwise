import {useEffect} from 'react';
import {StyleSheet, TextInput, type TextStyle} from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {TIMINGS} from '@/constants/motion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
Animated.addWhitelistedNativeProps({text: true});

type AnimatedNumberProps = {
  /** Target numeric value to count toward. */
  value: number;
  /** Formats the interpolated value into display text (e.g. currency). */
  format: (value: number) => string;
  style?: TextStyle | TextStyle[];
};

/**
 * Counts up to `value` on the UI thread by driving an uneditable TextInput's
 * `text` prop — the standard Reanimated pattern for animating displayed text
 * without per-frame React state. Honors reduced motion.
 */
export function AnimatedNumber({value, format, style}: AnimatedNumberProps) {
  const progress = useSharedValue(value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    progress.value = reduceMotion
      ? value
      : withTiming(value, {duration: 650, easing: TIMINGS.slow.easing});
  }, [value, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => {
    return {text: format(progress.value), defaultValue: format(progress.value)};
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      style={[styles.input, style]}
      // value is driven via animatedProps.text on the UI thread
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 0,
    margin: 0,
    fontVariant: ['tabular-nums'],
  },
});
