import {useEffect} from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import {SPRINGS} from '@/constants/motion';
import {radius} from '@/constants/theme';

type AnimatedBarProps = {
  /** Fill ratio 0–1. */
  fraction: number;
  color: string;
  trackColor: string;
  height?: number;
  delay?: number;
  style?: ViewStyle;
};

/**
 * Horizontal progress fill that springs from empty to its target ratio on
 * mount. Animates scaleX (GPU-composited) anchored left — never width.
 */
export function AnimatedBar({
  fraction,
  color,
  trackColor,
  height = 10,
  delay = 220,
  style,
}: AnimatedBarProps) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const scaleX = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    scaleX.value = reduceMotion
      ? clamped
      : withDelay(delay, withSpring(clamped, SPRINGS.gentle));
  }, [clamped, delay, reduceMotion, scaleX]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{scaleX: scaleX.value}],
  }));

  return (
    <View style={[styles.track, {height, backgroundColor: trackColor}, style]}>
      <Animated.View
        style={[styles.fill, {backgroundColor: color}, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {borderRadius: radius.pill, overflow: 'hidden', width: '100%'},
  fill: {
    height: '100%',
    width: '100%',
    borderRadius: radius.pill,
    transformOrigin: 'left',
  },
});
