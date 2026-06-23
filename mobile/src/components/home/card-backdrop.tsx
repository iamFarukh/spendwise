import {memo, useEffect, useState} from 'react';
import {Platform, StyleSheet, View, type LayoutChangeEvent} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import Svg, {Circle, Defs, RadialGradient, Stop} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Drifting cx/cy continuously re-rasterizes the RadialGradient fills, which is
// expensive on Android. There, keep positions static and animate only opacity
// (cheap) — the orbs still "breathe"; iOS keeps the full drift.
const DRIFT = Platform.OS !== 'android';

/**
 * Living ambience for the net-worth hero: soft radial-gradient orbs that drift
 * and breathe behind the content, giving the flat gradient slab depth and
 * motion. Pure SVG + UI-thread opacity/position; static under reduced motion.
 * Sits behind the card content and is clipped by the card's rounded corners.
 */
export const CardBackdrop = memo(function CardBackdrop() {
  const reduceMotion = useReducedMotion();
  const isFocused = useIsFocused();
  const [size, setSize] = useState({w: 0, h: 0});
  const a = useSharedValue(0);
  const b = useSharedValue(0);

  // Only run the infinite drift while Home is the focused tab — pausing it off
  // screen (and cancelling on unmount) keeps these loops off the UI thread.
  useEffect(() => {
    if (reduceMotion || !isFocused) {
      return;
    }
    a.value = withRepeat(withTiming(1, {duration: 4200, easing: Easing.inOut(Easing.sin)}), -1, true);
    b.value = withDelay(
      900,
      withRepeat(withTiming(1, {duration: 5400, easing: Easing.inOut(Easing.sin)}), -1, true),
    );
    return () => {
      cancelAnimation(a);
      cancelAnimation(b);
    };
  }, [a, b, reduceMotion, isFocused]);

  const {w, h} = size;

  const orbBright = useAnimatedProps(() => ({
    cx: w * 0.84 + (DRIFT ? interpolate(a.value, [0, 1], [6, -10]) : 0),
    cy: h * 0.1 + (DRIFT ? interpolate(a.value, [0, 1], [-6, 8]) : 0),
    opacity: interpolate(a.value, [0, 1], [0.34, 0.55]),
  }));
  const orbDeep = useAnimatedProps(() => ({
    cx: w * 0.12 + (DRIFT ? interpolate(b.value, [0, 1], [-8, 10]) : 0),
    cy: h * 0.96 + (DRIFT ? interpolate(b.value, [0, 1], [8, -8]) : 0),
    opacity: interpolate(b.value, [0, 1], [0.22, 0.4]),
  }));
  const orbSoft = useAnimatedProps(() => ({
    cx: w * 0.55 + (DRIFT ? interpolate(b.value, [0, 1], [10, -10]) : 0),
    cy: h * 0.36 + (DRIFT ? interpolate(a.value, [0, 1], [4, -8]) : 0),
    opacity: interpolate(a.value, [0, 1], [0.1, 0.18]),
  }));

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e: LayoutChangeEvent) =>
        setSize({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})
      }>
      {w > 0 && h > 0 ? (
        <Svg width={w} height={h}>
          <Defs>
            <RadialGradient id="orbBright" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#3DF2B4" stopOpacity={1} />
              <Stop offset="1" stopColor="#3DF2B4" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="orbDeep" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#0FD692" stopOpacity={1} />
              <Stop offset="1" stopColor="#0FD692" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="orbSoft" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <AnimatedCircle r={w * 0.5} fill="url(#orbBright)" animatedProps={orbBright} />
          <AnimatedCircle r={w * 0.42} fill="url(#orbDeep)" animatedProps={orbDeep} />
          <AnimatedCircle r={w * 0.28} fill="url(#orbSoft)" animatedProps={orbSoft} />
        </Svg>
      ) : null}
    </View>
  );
});
