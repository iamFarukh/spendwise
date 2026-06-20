import {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {LogoMark} from '@/components/icons';
import {Gradient} from '@/components/ui/gradient';
import {AppText} from '@/components/ui/app-text';
import {BackgroundFinanceLayer} from '@/components/splash/background-finance-layer';
import {EcosystemLayer} from '@/components/splash/ecosystem-layer';
import {colors, radius, shadow, spacing} from '@/constants/theme';

type SplashSceneProps = {
  /** `boot` = cold-start handoff. `loading` = in-app wait (adds message + progress). */
  mode?: 'boot' | 'loading';
  message?: string;
  showProgress?: boolean;
};

// Logo spring — a touch of overshoot so the mark "settles into place".
const LOGO_SPRING = {damping: 12, stiffness: 150, mass: 0.9} as const;
const WORD_SPRING = {damping: 18, stiffness: 180, mass: 0.8} as const;
const LINE_SPRING = {damping: 15, stiffness: 170, mass: 0.7} as const;

/**
 * Branded splash. A single choreographed reveal — the mark springs in, a soft
 * halo blooms, a light sweeps across it, then the wordmark, accent line, and
 * tagline cascade up. All transform/opacity (UI thread) for a 60fps,
 * native-feeling first impression. Honors reduced motion (renders final state).
 */
export function SplashScene({
  mode = 'boot',
  message,
  showProgress = false,
}: SplashSceneProps) {
  const reduceMotion = useReducedMotion();
  const isLoading = mode === 'loading';
  const isBoot = !isLoading;
  const resolvedMessage = isLoading ? message ?? 'Getting things ready…' : undefined;
  const tagline = isBoot ? 'Every rupee. Every account.' : 'Your ledger of truth';

  // Entrance drivers — start at their final values when motion is off.
  const logo = useSharedValue(reduceMotion ? 1 : 0); // 0 → 1 reveal
  const glow = useSharedValue(reduceMotion ? 1 : 0);
  const pulse = useSharedValue(0); // continuous halo breathing
  const sweep = useSharedValue(reduceMotion ? 1 : 0); // shine pass (skipped when done)
  const word = useSharedValue(reduceMotion ? 1 : 0);
  const line = useSharedValue(reduceMotion ? 1 : 0);
  const tag = useSharedValue(reduceMotion ? 1 : 0);
  // Financial-ecosystem drivers (boot mode only): Phase 2 draws in, Phase 3 merges.
  const flow = useSharedValue(reduceMotion ? 1 : 0);
  const merge = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    logo.value = withSpring(1, LOGO_SPRING);
    glow.value = withTiming(1, {duration: 560, easing: Easing.out(Easing.cubic)});
    pulse.value = withDelay(
      560,
      withRepeat(
        withTiming(1, {duration: 1700, easing: Easing.inOut(Easing.sin)}),
        -1,
        true,
      ),
    );
    sweep.value = withDelay(
      300,
      withTiming(1, {duration: 760, easing: Easing.inOut(Easing.cubic)}),
    );

    if (isBoot) {
      // Phase 2 (≈0.7–1.7s): connectors draw from each source into the mark.
      flow.value = withDelay(
        720,
        withTiming(1, {duration: 980, easing: Easing.inOut(Easing.cubic)}),
      );
      // Phase 3 (≈1.9–2.5s): the graph contracts into the logo and fades.
      merge.value = withDelay(
        1880,
        withTiming(1, {duration: 640, easing: Easing.inOut(Easing.cubic)}),
      );
    }

    // Copy reveals immediately when loading, but waits for Phase 3 on cold boot.
    const copyAt = isBoot ? 2040 : 230;
    word.value = withDelay(copyAt, withSpring(1, WORD_SPRING));
    line.value = withDelay(copyAt + 200, withSpring(1, LINE_SPRING));
    tag.value = withDelay(
      copyAt + 150,
      withTiming(1, {duration: 380, easing: Easing.out(Easing.cubic)}),
    );
  }, [flow, glow, isBoot, line, logo, merge, pulse, reduceMotion, sweep, tag, word]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(logo.value, [0, 0.5, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [
      {scale: interpolate(logo.value, [0, 1], [0.82, 1], Extrapolation.CLAMP)},
      {translateY: interpolate(logo.value, [0, 1], [10, 0], Extrapolation.CLAMP)},
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
    transform: [
      {scale: interpolate(glow.value, [0, 1], [0.55, 1], Extrapolation.CLAMP) *
        (1 + pulse.value * 0.07)},
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.5], Extrapolation.CLAMP),
    transform: [
      {scale: interpolate(glow.value, [0, 1], [0.7, 1], Extrapolation.CLAMP) *
        (1 + pulse.value * 0.04)},
    ],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweep.value, [0, 0.2, 0.8, 1], [0, 0.7, 0.7, 0], Extrapolation.CLAMP),
    transform: [
      {rotate: '20deg'},
      {translateX: interpolate(sweep.value, [0, 1], [-110, 110], Extrapolation.CLAMP)},
    ],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: interpolate(word.value, [0, 0.4, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [{translateY: interpolate(word.value, [0, 1], [18, 0], Extrapolation.CLAMP)}],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(line.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{scaleX: interpolate(line.value, [0, 1], [0, 1], Extrapolation.CLAMP)}],
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tag.value,
    transform: [{translateY: interpolate(tag.value, [0, 1], [8, 0], Extrapolation.CLAMP)}],
  }));

  return (
    <View style={styles.root}>
      <Gradient
        colors={[colors.mint50, colors.canvas, colors.canvas2]}
        start={{x: 0.15, y: 0}}
        end={{x: 0.85, y: 1}}
        style={StyleSheet.absoluteFill}
      />

      <AmbientOrb style={styles.orbTop} color={colors.mintBright} size={280} paused={reduceMotion} delay={0} />
      <AmbientOrb style={styles.orbBottom} color={colors.mint300} size={210} paused={reduceMotion} delay={500} />

      {isBoot ? <BackgroundFinanceLayer paused={reduceMotion} /> : null}

      <View style={styles.content}>
        <Animated.View style={[styles.logoStack, logoStyle]}>
          {isBoot ? <EcosystemLayer flow={flow} merge={merge} /> : null}
          <Animated.View style={[styles.logoRing, ringStyle]} pointerEvents="none" />
          <Animated.View style={[styles.logoGlow, glowStyle]} pointerEvents="none" />
          <View style={styles.logoCard}>
            <LogoMark size={80} />
            <Animated.View style={[styles.sweep, sweepStyle]} pointerEvents="none" />
          </View>
        </Animated.View>

        <View style={styles.copy}>
          <Animated.View style={wordStyle}>
            <AppText style={styles.wordmark}>SpendWise</AppText>
          </Animated.View>
          <Animated.View style={[styles.accent, lineStyle]} />
          <Animated.View style={tagStyle}>
            <AppText variant="sm" style={styles.tagline}>
              {tagline}
            </AppText>
          </Animated.View>
        </View>

        {isLoading && showProgress ? (
          <Animated.View style={[styles.progressWrap, tagStyle]}>
            <SplashProgress paused={reduceMotion} />
          </Animated.View>
        ) : null}

        {resolvedMessage ? (
          <Animated.View style={tagStyle}>
            <AppText variant="sm" style={styles.message}>
              {resolvedMessage}
            </AppText>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function AmbientOrb({
  style,
  color,
  size,
  paused,
  delay,
}: {
  style: StyleProp<ViewStyle>;
  color: string;
  size: number;
  paused: boolean;
  delay: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (paused) {
      return;
    }
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, {duration: 2400, easing: Easing.inOut(Easing.sin)}),
          withTiming(0, {duration: 2400, easing: Easing.inOut(Easing.sin)}),
        ),
        -1,
        false,
      ),
    );
  }, [delay, paused, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: paused ? 0.32 : interpolate(t.value, [0, 1], [0.22, 0.5]),
    transform: [
      {translateY: interpolate(t.value, [0, 1], [0, -14])},
      {scale: interpolate(t.value, [0, 1], [1, 1.06])},
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        style,
        {width: size, height: size, borderRadius: size / 2, backgroundColor: color},
        animatedStyle,
      ]}
    />
  );
}

function SplashProgress({paused}: {paused: boolean}) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (paused) {
      shimmer.value = 0.35;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, {duration: 1400, easing: Easing.inOut(Easing.cubic)}),
      -1,
      true,
    );
  }, [paused, shimmer]);

  const fillStyle = useAnimatedStyle(() => ({
    width: 46 + shimmer.value * 72,
    opacity: 0.55 + shimmer.value * 0.45,
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{translateX: -48 + shimmer.value * 96}],
    opacity: 0.25 + shimmer.value * 0.35,
  }));

  return (
    <View style={styles.progressTrack} accessibilityLabel="Loading">
      <Animated.View style={[styles.progressFill, fillStyle]} />
      <Animated.View style={[styles.progressHighlight, highlightStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.canvas, overflow: 'hidden'},
  orb: {position: 'absolute'},
  orbTop: {top: -80, right: -90},
  orbBottom: {bottom: 40, left: -80},
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  logoStack: {alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md},
  logoRing: {
    position: 'absolute',
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 1.5,
    borderColor: colors.mint300,
  },
  logoGlow: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: colors.mint200,
  },
  logoCard: {
    width: 128,
    height: 128,
    borderRadius: radius.xxl,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.lg,
  },
  sweep: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 38,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  copy: {alignItems: 'center', gap: 8},
  wordmark: {fontWeight: '700', fontSize: 34, letterSpacing: -1.1, color: colors.ink900},
  accent: {
    width: 56,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.mint400,
  },
  tagline: {color: colors.ink500, fontWeight: '600', fontSize: 15},
  progressWrap: {marginTop: spacing.lg, width: '100%', alignItems: 'center'},
  progressTrack: {
    width: 132,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.mint500,
    borderRadius: radius.pill,
  },
  progressHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 36,
    backgroundColor: colors.mintBright,
    borderRadius: radius.pill,
  },
  message: {marginTop: spacing.sm, color: colors.ink400, fontWeight: '600', letterSpacing: 0.1},
});
