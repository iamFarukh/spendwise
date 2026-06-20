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
} from 'react-native-reanimated';

import {SPRINGS} from '@/constants/motion';
import {colors, radius} from '@/constants/theme';

type ToggleProps = {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
};

/** Spring-animated switch — mirrors `.toggle` / `.toggle.on`. */
export function Toggle({value, onValueChange, disabled}: ToggleProps) {
  const progress = useSharedValue(value ? 1 : 0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    progress.value = reduceMotion
      ? value
        ? 1
        : 0
      : withSpring(value ? 1 : 0, SPRINGS.snappy);
  }, [value, progress, reduceMotion]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.ink300, colors.mint500],
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: 3 + progress.value * 20},
      // Subtle horizontal squish mid-slide — reads as a physical knob.
      {
        scaleX: interpolate(
          progress.value,
          [0, 0.5, 1],
          [1, 1.15, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{checked: value, disabled}}
      disabled={disabled}
      onPress={() => onValueChange?.(!value)}
      hitSlop={8}>
      <Animated.View style={[styles.track, trackStyle, disabled && styles.disabled]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {width: 46, height: 26, borderRadius: radius.pill, justifyContent: 'center'},
  knob: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.white,
    shadowColor: '#0E2A22',
    shadowOpacity: 0.12,
    shadowOffset: {width: 0, height: 1},
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {opacity: 0.5},
});
