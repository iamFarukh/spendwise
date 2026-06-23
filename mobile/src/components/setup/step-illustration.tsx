import {useEffect, type ComponentType} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Line, Path} from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
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

import {
  IconBag,
  IconBank,
  IconBolt,
  IconCar,
  IconFood,
  IconReceipt,
  IconRepeat,
  IconTrend,
  IconWallet,
  type IconProps,
} from '@/components/icons';
import {colors, radius, shadow} from '@/constants/theme';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const REVEAL = {damping: 14, stiffness: 150, mass: 0.8} as const;

export type StepIllustrationKind =
  | 'welcome'
  | 'accounts'
  | 'expenses'
  | 'goals'
  | 'sip';

/**
 * Small themed motion that anchors each onboarding step — the financial
 * equivalent of the splash's ecosystem language. Pure transform/opacity +
 * SVG stroke on the UI thread; renders its final, settled frame under reduced
 * motion. Sized to ~150pt tall and centred by the parent.
 */
export function StepIllustration({kind}: {kind: StepIllustrationKind}) {
  switch (kind) {
    case 'welcome':
      return <WelcomeIllu />;
    case 'accounts':
      return <AccountsIllu />;
    case 'expenses':
      return <ExpensesIllu />;
    case 'goals':
      return <GoalsIllu />;
    case 'sip':
      return <SipIllu />;
  }
}

/* ----------------------------- Welcome ----------------------------------- */
// Dashboard assembling itself while Bank / UPI / Wallet sources appear above.

function WelcomeIllu() {
  const reduceMotion = useReducedMotion();
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const idle = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    enter.value = withTiming(1, {duration: 900, easing: Easing.out(Easing.cubic)});
    idle.value = withRepeat(
      withTiming(1, {duration: 2400, easing: Easing.inOut(Easing.sin)}),
      -1,
      true,
    );
  }, [enter, idle, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0, 0.35], [0, 1], Extrapolation.CLAMP),
    transform: [
      {scale: interpolate(enter.value, [0, 0.5], [0.86, 1], Extrapolation.CLAMP)},
      {translateY: interpolate(enter.value, [0, 0.5], [12, 0], Extrapolation.CLAMP)},
    ],
  }));

  return (
    <View style={styles.canvas}>
      <FloatChip Icon={IconBank} tint={colors.mint50} color={colors.mint700} idle={idle} left={6} top={2} phase={0} />
      <FloatChip Icon={IconBolt} tint={colors.investBg} color={colors.invest} idle={idle} left={101} top={-12} phase={1} />
      <FloatChip Icon={IconWallet} tint={colors.transferBg} color={colors.transfer} idle={idle} left={196} top={2} phase={2} />

      <Animated.View style={[styles.dashCard, cardStyle]}>
        <View style={styles.dashHeader}>
          <View style={styles.dashDot} />
          <View style={styles.dashLine} />
        </View>
        <View style={styles.barRow}>
          <GrowBar enter={enter} from={0.3} h={28} />
          <GrowBar enter={enter} from={0.42} h={46} />
          <GrowBar enter={enter} from={0.54} h={36} />
          <GrowBar enter={enter} from={0.66} h={56} tint={colors.mint500} />
        </View>
      </Animated.View>
    </View>
  );
}

function GrowBar({
  enter,
  from,
  h,
  tint = colors.mint200,
}: {
  enter: SharedValue<number>;
  from: number;
  h: number;
  tint?: string;
}) {
  const style = useAnimatedStyle(() => ({
    height: interpolate(enter.value, [from, from + 0.3], [4, h], Extrapolation.CLAMP),
    opacity: interpolate(enter.value, [from, from + 0.15], [0, 1], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[styles.bar, {backgroundColor: tint}, style]} />;
}

function FloatChip({
  Icon,
  tint,
  color,
  idle,
  left,
  top,
  phase,
}: {
  Icon: ComponentType<IconProps>;
  tint: string;
  color: string;
  idle: SharedValue<number>;
  left: number;
  top: number;
  phase: number;
}) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    pop.value = withDelay(140 + phase * 130, withSpring(1, REVEAL));
  }, [phase, pop, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [
      {scale: interpolate(pop.value, [0, 1], [0.4, 1], Extrapolation.CLAMP)},
      {translateY: interpolate(idle.value, [0, 1], [0, phase % 2 === 0 ? -6 : -9])},
    ],
  }));

  return (
    <Animated.View style={[styles.chip, {left, top, backgroundColor: tint}, style]}>
      <Icon size={18} color={color} />
    </Animated.View>
  );
}

/* ----------------------------- Accounts ---------------------------------- */
// A wallet connecting to a bank — the connector draws, money flows across.

function AccountsIllu() {
  const reduceMotion = useReducedMotion();
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const flow = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    draw.value = withDelay(160, withTiming(1, {duration: 700, easing: Easing.inOut(Easing.cubic)}));
    flow.value = withDelay(
      820,
      withRepeat(withTiming(1, {duration: 1500, easing: Easing.inOut(Easing.cubic)}), -1, false),
    );
  }, [draw, flow, reduceMotion]);

  const lineLen = 132;
  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: lineLen * (1 - draw.value),
  }));
  const dotProps = useAnimatedProps(() => ({
    cx: interpolate(flow.value, [0, 1], [44, 176]),
    opacity: interpolate(flow.value, [0, 0.12, 0.85, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.canvas}>
      <Svg width={240} height={150} style={StyleSheet.absoluteFill}>
        <Line x1={44} y1={66} x2={176} y2={66} stroke={colors.line} strokeWidth={2} strokeLinecap="round" />
        <AnimatedLine
          x1={44}
          y1={66}
          x2={176}
          y2={66}
          stroke={colors.mint400}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={lineLen}
          animatedProps={lineProps}
        />
        <AnimatedCircle r={4.5} cy={66} fill={colors.mint500} animatedProps={dotProps} />
      </Svg>
      <PopBadge Icon={IconWallet} tint={colors.transferBg} color={colors.transfer} delay={60} left={14} />
      <PopBadge Icon={IconBank} tint={colors.mint50} color={colors.mint700} delay={520} left={146} />
    </View>
  );
}

function PopBadge({
  Icon,
  tint,
  color,
  delay,
  left,
}: {
  Icon: ComponentType<IconProps>;
  tint: string;
  color: string;
  delay: number;
  left: number;
}) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    pop.value = withDelay(delay, withSpring(1, REVEAL));
  }, [delay, pop, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{scale: interpolate(pop.value, [0, 1], [0.4, 1], Extrapolation.CLAMP)}],
  }));

  return (
    <Animated.View style={[styles.bigBadge, {left, backgroundColor: tint}, style]}>
      <Icon size={26} color={color} />
    </Animated.View>
  );
}

/* ----------------------------- Expenses ---------------------------------- */
// Transactions flowing from a single inbox down into category buckets.

const EXPENSE_CATS: {Icon: ComponentType<IconProps>; tint: string; color: string; x: number}[] = [
  {Icon: IconFood, tint: colors.expenseBg, color: colors.expense, x: 56},
  {Icon: IconBag, tint: colors.investBg, color: colors.invest, x: 120},
  {Icon: IconCar, tint: colors.transferBg, color: colors.transfer, x: 184},
];

function ExpensesIllu() {
  const reduceMotion = useReducedMotion();
  const flow = useSharedValue(0);
  const enter = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    enter.value = withTiming(1, {duration: 600, easing: Easing.out(Easing.cubic)});
    flow.value = withRepeat(
      withTiming(1, {duration: 1600, easing: Easing.inOut(Easing.cubic)}),
      -1,
      false,
    );
  }, [enter, flow, reduceMotion]);

  return (
    <View style={styles.canvas}>
      <Svg width={240} height={150} style={StyleSheet.absoluteFill}>
        {EXPENSE_CATS.map((cat, i) => (
          <FlowLine key={`l-${i}`} flow={flow} index={i} x={cat.x} />
        ))}
      </Svg>
      <PopBadge Icon={IconReceipt} tint={colors.mint50} color={colors.mint700} delay={40} left={90} />
      <View style={styles.catRow}>
        {EXPENSE_CATS.map((cat, i) => (
          <DropBadge key={`c-${i}`} Icon={cat.Icon} tint={cat.tint} color={cat.color} enter={enter} index={i} />
        ))}
      </View>
    </View>
  );
}

function FlowLine({
  flow,
  index,
  x,
}: {
  flow: SharedValue<number>;
  index: number;
  x: number;
}) {
  const offset = index * 0.18;
  const dotProps = useAnimatedProps(() => {
    const t = interpolate(
      (flow.value + 1 - offset) % 1,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      cx: interpolate(t, [0, 1], [120, x]),
      cy: interpolate(t, [0, 1], [90, 114]),
      opacity: interpolate(t, [0, 0.15, 0.8, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
    };
  });
  return (
    <>
      <Line x1={120} y1={90} x2={x} y2={114} stroke={colors.lineSoft} strokeWidth={1.5} strokeLinecap="round" />
      <AnimatedCircle r={4} fill={colors.mint500} animatedProps={dotProps} />
    </>
  );
}

function DropBadge({
  Icon,
  tint,
  color,
  enter,
  index,
}: {
  Icon: ComponentType<IconProps>;
  tint: string;
  color: string;
  enter: SharedValue<number>;
  index: number;
}) {
  const from = 0.1 + index * 0.18;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [from, from + 0.2], [0, 1], Extrapolation.CLAMP),
    transform: [
      {translateY: interpolate(enter.value, [from, from + 0.3], [10, 0], Extrapolation.CLAMP)},
    ],
  }));
  return (
    <Animated.View style={[styles.catBadge, {backgroundColor: tint}, style]}>
      <Icon size={20} color={color} />
    </Animated.View>
  );
}

/* ----------------------------- Goals ------------------------------------- */
// A progress ring filling toward a target — financial growth.

const RING_R = 46;
const RING_C = 2 * Math.PI * RING_R;
const RING_TARGET = 0.72;

function GoalsIllu() {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(reduceMotion ? RING_TARGET : 0);
  const pop = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    fill.value = withDelay(220, withTiming(RING_TARGET, {duration: 1300, easing: Easing.out(Easing.cubic)}));
    pop.value = withDelay(160, withSpring(1, REVEAL));
  }, [fill, pop, reduceMotion]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - fill.value),
  }));
  const centreStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{scale: interpolate(pop.value, [0, 1], [0.5, 1], Extrapolation.CLAMP)}],
  }));

  return (
    <View style={styles.canvas}>
      <Svg width={130} height={130}>
        <Circle cx={65} cy={65} r={RING_R} stroke={colors.line} strokeWidth={9} fill="none" />
        <AnimatedCircle
          cx={65}
          cy={65}
          r={RING_R}
          stroke={colors.mint500}
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          animatedProps={arcProps}
          transform="rotate(-90 65 65)"
        />
      </Svg>
      <Animated.View style={[styles.ringCentre, centreStyle]}>
        <IconTrend size={30} color={colors.mint600} />
      </Animated.View>
    </View>
  );
}

/* ----------------------------- SIP --------------------------------------- */
// Recurring investment compounding upward — a repeat cycle + a rising trend.

const TREND_PATH = 'M40 112 L84 88 L120 96 L160 56 L208 34';
const TREND_LEN = 200;

function SipIllu() {
  const reduceMotion = useReducedMotion();
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const spin = useSharedValue(0);
  const pop = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    pop.value = withDelay(100, withSpring(1, REVEAL));
    draw.value = withDelay(
      360,
      withRepeat(withTiming(1, {duration: 1900, easing: Easing.inOut(Easing.cubic)}), -1, false),
    );
    spin.value = withRepeat(withTiming(1, {duration: 2600, easing: Easing.inOut(Easing.cubic)}), -1, false);
  }, [draw, pop, spin, reduceMotion]);

  const pathProps = useAnimatedProps(() => {
    const t = draw.value;
    return {
      strokeDashoffset: TREND_LEN * (1 - interpolate(t, [0, 0.7], [0, 1], Extrapolation.CLAMP)),
      strokeOpacity: interpolate(t, [0, 0.1, 0.85, 1], [0, 1, 1, 0.15], Extrapolation.CLAMP),
    };
  });
  const tipProps = useAnimatedProps(() => ({
    opacity: interpolate(draw.value, [0.55, 0.7, 0.95, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));
  const repeatStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [
      {scale: interpolate(pop.value, [0, 1], [0.4, 1], Extrapolation.CLAMP)},
      {rotate: `${interpolate(spin.value, [0, 1], [0, 360])}deg`},
    ],
  }));

  return (
    <View style={styles.canvas}>
      <Svg width={240} height={150} style={StyleSheet.absoluteFill}>
        <Path d={TREND_PATH} stroke={colors.lineSoft} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <AnimatedPath
          d={TREND_PATH}
          stroke={colors.mint500}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={TREND_LEN}
          animatedProps={pathProps}
        />
        <AnimatedCircle cx={208} cy={34} r={5} fill={colors.mint500} animatedProps={tipProps} />
      </Svg>
      <Animated.View style={[styles.sipRepeat, repeatStyle]}>
        <IconRepeat size={22} color={colors.invest} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: 240,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ---- Welcome ----
  dashCard: {
    width: 184,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    marginTop: 22,
    ...shadow.md,
  },
  dashHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14},
  dashDot: {width: 12, height: 12, borderRadius: 6, backgroundColor: colors.mint300},
  dashLine: {flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.lineSoft},
  barRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 60},
  bar: {flex: 1, borderRadius: 5},
  chip: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...shadow.sm,
  },
  // ---- Accounts / Expenses badges ----
  bigBadge: {
    position: 'absolute',
    top: 36,
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  catRow: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  catBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  // ---- Goals ----
  ringCentre: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.mint50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ---- SIP ----
  sipRepeat: {
    position: 'absolute',
    left: 8,
    top: 6,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.investBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
});
