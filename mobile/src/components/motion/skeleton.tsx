import {useEffect} from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {colors, radius} from '@/constants/theme';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  rounded?: number;
  style?: ViewStyle;
};

/** Calming shimmer placeholder. Opacity pulse keeps it on the UI thread. */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = radius.sm,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.5);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(
      withTiming(1, {duration: 800, easing: Easing.inOut(Easing.ease)}),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({opacity: opacity.value}));

  return (
    <Animated.View
      style={[
        styles.base,
        {width, height, borderRadius: rounded},
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Pre-composed row skeleton matching a transaction list row. */
export function RowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} rounded={radius.pill} />
      <View style={styles.rowText}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="35%" height={11} />
      </View>
      <Skeleton width={64} height={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {backgroundColor: colors.canvas2},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowText: {flex: 1, gap: 6},
});
