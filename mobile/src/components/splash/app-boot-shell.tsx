import {useEffect, useRef, useState, type ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {SplashScene} from '@/components/splash/splash-scene';
import {hapticMedium} from '@/lib/haptics';
import {colors} from '@/constants/theme';

type AppBootShellProps = {
  /** True until auth resolves and (if signed in) the first settings snapshot arrives. */
  booting: boolean;
  children: ReactNode;
};

// Let the full splash choreography play (logo → ecosystem → reveal) before the
// hand-off, even when auth resolves instantly. Matched to the splash timeline.
const SPLASH_MIN_MS = 2600;
// Gentle cross-fade so the dashboard surfaces underneath rather than hard-cut.
const FADE_OUT = {duration: 460} as const;

/**
 * Single splash handoff: native launch → animated JS splash → cross-fade into
 * the app. The overlay only runs once per process (cold start). It stays until
 * BOTH auth has resolved AND the splash has played its minimum duration, then
 * fires one soft haptic and fades out.
 */
export function AppBootShell({booting, children}: AppBootShellProps) {
  const reduceMotion = useReducedMotion();
  const coldBootFinished = useRef(false);
  const [overlayMounted, setOverlayMounted] = useState(true);
  const [minElapsed, setMinElapsed] = useState(reduceMotion);
  const opacity = useSharedValue(1);

  const showOverlay = !coldBootFinished.current && overlayMounted;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const timer = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (coldBootFinished.current || booting || !minElapsed) {
      return;
    }

    coldBootFinished.current = true;

    if (reduceMotion) {
      opacity.value = 0;
      setOverlayMounted(false);
      return;
    }

    // Subtle "you've arrived" tap as the splash dissolves — once per cold start.
    hapticMedium();
    opacity.value = withTiming(0, FADE_OUT, finished => {
      if (finished) {
        runOnJS(setOverlayMounted)(false);
      }
    });
  }, [booting, minElapsed, opacity, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.root}>
      {children}
      {showOverlay ? (
        <Animated.View
          pointerEvents={booting ? 'auto' : 'none'}
          style={[styles.overlay, overlayStyle]}>
          <SplashScene mode="boot" />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
});
