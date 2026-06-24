import {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  FadeOut,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {Gradient} from '@/components/ui/gradient';
import {EcosystemLayer} from '@/components/splash/ecosystem-layer';
import {IconCheck, LogoMark} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 196;
const RING_R = 78;
const RING_C = 2 * Math.PI * RING_R;
const SUCCESS_SPRING = {damping: 11, stiffness: 220, mass: 0.7} as const;

export type CompletionPhase = 1 | 2 | 3;

const MESSAGES: Record<CompletionPhase, string> = {
  1: 'Preparing your workspace…',
  2: 'Organizing your financial system…',
  3: 'You’re ready to take control of your money.',
};

const SPARKLES = [0, 60, 120, 180, 240, 300];

/**
 * Full-screen 3-phase setup celebration. Phase 1 — gears turn and a progress
 * ring fills around the mark ("Preparing…"). Phase 2 — every money source
 * connects into one system via the shared ecosystem graph ("Organizing…").
 * Phase 3 — the graph collapses into a glowing success check ("You're ready").
 * All transform/opacity on the UI thread; honors reduced motion.
 */
export function SetupCompletionScene({phase}: {phase: CompletionPhase}) {
  const reduceMotion = useReducedMotion();

  const ringFill = useSharedValue(reduceMotion ? 1 : 0);
  const gear = useSharedValue(0);
  const gearOpacity = useSharedValue(reduceMotion ? 0 : 1);
  const pulse = useSharedValue(0);
  const flow = useSharedValue(reduceMotion && phase >= 2 ? 1 : 0);
  const merge = useSharedValue(reduceMotion && phase >= 3 ? 1 : 0);
  const success = useSharedValue(reduceMotion && phase >= 3 ? 1 : 0);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      ringFill.value = 1;
      gearOpacity.value = 0;
      flow.value = phase >= 2 ? 1 : 0;
      merge.value = phase >= 3 ? 1 : 0;
      success.value = phase >= 3 ? 1 : 0;
      return;
    }
    if (phase === 1) {
      ringFill.value = withTiming(1, {duration: 1300, easing: Easing.out(Easing.cubic)});
      gear.value = withRepeat(withTiming(1, {duration: 2200, easing: Easing.linear}), -1, false);
      pulse.value = withRepeat(
        withTiming(1, {duration: 1700, easing: Easing.inOut(Easing.sin)}),
        -1,
        true,
      );
    } else if (phase === 2) {
      gearOpacity.value = withTiming(0, {duration: 380, easing: Easing.out(Easing.cubic)});
      flow.value = withTiming(1, {duration: 900, easing: Easing.inOut(Easing.cubic)});
    } else if (phase === 3) {
      merge.value = withTiming(1, {duration: 600, easing: Easing.inOut(Easing.cubic)});
      success.value = withDelay(340, withSpring(1, SUCCESS_SPRING));
      burst.value = withDelay(340, withTiming(1, {duration: 760, easing: Easing.out(Easing.cubic)}));
    }
  }, [burst, flow, gear, gearOpacity, merge, phase, pulse, reduceMotion, ringFill, success]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - ringFill.value),
    strokeOpacity: 1 - success.value,
  }));
  const gearStyle = useAnimatedStyle(() => ({
    opacity: gearOpacity.value * 0.7,
    transform: [{rotate: `${interpolate(gear.value, [0, 1], [0, 360])}deg`}],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0.62]) + success.value * 0.25,
    transform: [{scale: (1 + pulse.value * 0.06) * (1 + success.value * 0.18)}],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: 1 - success.value,
    transform: [{scale: interpolate(success.value, [0, 1], [1, 0.6], Extrapolation.CLAMP)}],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: success.value,
    transform: [{scale: interpolate(success.value, [0, 1], [0.4, 1], Extrapolation.CLAMP)}],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.2, 1], [0, 0.5, 0], Extrapolation.CLAMP),
    transform: [{scale: interpolate(burst.value, [0, 1], [0.6, 1.7], Extrapolation.CLAMP)}],
  }));

  return (
    <View style={styles.root}>
      <Gradient
        colors={[colors.mint50, colors.canvas, colors.canvas2]}
        start={{x: 0.15, y: 0}}
        end={{x: 0.85, y: 1}}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.stack}>
          <EcosystemLayer flow={flow} merge={merge} />

          <Animated.View style={[styles.burstRing, burstStyle]} pointerEvents="none" />
          <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />

          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring} pointerEvents="none">
            <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} stroke={colors.mint100} strokeWidth={5} fill="none" />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={colors.mint500}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              animatedProps={arcProps}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>

          <Animated.View style={[styles.gearWrap, gearStyle]} pointerEvents="none">
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R + 14}
                stroke={colors.mint300}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeDasharray="2 12"
              />
            </Svg>
          </Animated.View>

          {SPARKLES.map((angle, i) => (
            <Sparkle key={angle} angle={angle} burst={burst} index={i} />
          ))}

          <View style={styles.hub}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.hubCentre, logoStyle]}>
              <LogoMark size={56} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.hubCentre, styles.checkDisc, checkStyle]}>
              <IconCheck size={48} color={colors.white} strokeWidth={2.6} />
            </Animated.View>
          </View>
        </View>

        <Animated.View
          key={phase}
          entering={reduceMotion ? FadeInDown.duration(220) : FadeInDown.springify().damping(20).stiffness(180)}
          exiting={FadeOut.duration(180)}
          style={styles.messageWrap}>
          <AppText style={styles.message}>{MESSAGES[phase]}</AppText>
        </Animated.View>

        <View style={styles.segments}>
          {[1, 2, 3].map(n => (
            <View key={n} style={[styles.segment, phase >= n && styles.segmentOn]} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Sparkle({
  angle,
  burst,
  index,
}: {
  angle: number;
  burst: SharedValue<number>;
  index: number;
}) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const distance = 70 + (index % 2) * 14;

  const style = useAnimatedStyle(() => {
    const t = burst.value;
    return {
      opacity: interpolate(t, [0, 0.25, 0.85, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        {translateX: dx * distance * t},
        {translateY: dy * distance * t},
        {scale: interpolate(t, [0, 0.3, 1], [0, 1, 0.6], Extrapolation.CLAMP)},
      ],
    };
  });
  return <Animated.View style={[styles.sparkle, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  root: {...StyleSheet.absoluteFillObject, backgroundColor: colors.canvas},
  content: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl},
  stack: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  ring: {position: 'absolute'},
  gearWrap: {position: 'absolute', alignItems: 'center', justifyContent: 'center'},
  glow: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.mint200,
  },
  burstRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: colors.mint400,
  },
  hub: {
    width: 112,
    height: 112,
    borderRadius: radius.xxl,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    ...shadow.lg,
  },
  hubCentre: {alignItems: 'center', justifyContent: 'center'},
  checkDisc: {
    borderRadius: radius.xxl,
    backgroundColor: colors.mint500,
  },
  sparkle: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.mint500,
  },
  messageWrap: {position: 'absolute', bottom: '24%', paddingHorizontal: spacing.xl},
  message: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink800,
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  segments: {position: 'absolute', bottom: '18%', flexDirection: 'row', gap: spacing.sm},
  segment: {
    width: 28,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.mint100,
  },
  segmentOn: {backgroundColor: colors.mint500},
});
