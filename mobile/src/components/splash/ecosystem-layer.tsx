import {type ComponentType} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Line} from 'react-native-svg';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import {
  IconBank,
  IconBolt,
  IconCard,
  IconTrend,
  IconWallet,
  type IconProps,
} from '@/components/icons';
import {colors, shadow} from '@/constants/theme';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 360;
const CENTER = SIZE / 2;
const NODE = 42;

type NodeDef = {
  key: string;
  Icon: ComponentType<IconProps>;
  dx: number;
  dy: number;
};

// Sources fan across the top and sides, all flowing down into the logo. Kept
// above centre so they never collide with the wordmark that reveals below.
const NODES: NodeDef[] = [
  {key: 'bank', Icon: IconBank, dx: -116, dy: -46},
  {key: 'wallet', Icon: IconWallet, dx: -78, dy: -120},
  {key: 'upi', Icon: IconBolt, dx: 0, dy: -146},
  {key: 'card', Icon: IconCard, dx: 78, dy: -120},
  {key: 'sip', Icon: IconTrend, dx: 116, dy: -46},
];

/** Per-node reveal range within `flow` (0→1), lightly staggered. */
function rangeFor(index: number): [number, number] {
  const start = index * 0.1;
  return [start, start + 0.55];
}

type LayerProps = {
  /** 0 → 1: connectors draw in and nodes appear (Phase 2). */
  flow: SharedValue<number>;
  /** 0 → 1: nodes + lines collapse into the logo and fade (Phase 3). */
  merge: SharedValue<number>;
};

/**
 * Phase 2/3 of the splash — "all your money flows into one place." Thin lines
 * draw from each source (bank, wallet, UPI, card, SIP) into the logo, then the
 * whole graph contracts into the mark and fades. Apple-style: linear, thin,
 * no bounce. Pure SVG stroke + transform on the UI thread.
 */
export function EcosystemLayer({flow, merge}: LayerProps) {
  return (
    <View style={styles.layer} pointerEvents="none">
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        {NODES.map((node, i) => (
          <Connector
            key={node.key}
            flow={flow}
            merge={merge}
            dx={node.dx}
            dy={node.dy}
            range={rangeFor(i)}
          />
        ))}
      </Svg>
      {NODES.map((node, i) => (
        <Node
          key={node.key}
          flow={flow}
          merge={merge}
          dx={node.dx}
          dy={node.dy}
          Icon={node.Icon}
          range={rangeFor(i)}
        />
      ))}
    </View>
  );
}

function Connector({
  flow,
  merge,
  dx,
  dy,
  range,
}: {
  flow: SharedValue<number>;
  merge: SharedValue<number>;
  dx: number;
  dy: number;
  range: [number, number];
}) {
  const length = Math.hypot(dx, dy);
  const lineProps = useAnimatedProps(() => {
    const draw = interpolate(
      flow.value,
      [range[0], range[1]],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      strokeDashoffset: length * (1 - draw),
      strokeOpacity: draw * (1 - merge.value) * 0.55,
    };
  });

  // A single particle flows along the line from the source into the hub —
  // "money lands in one place" — then dissolves as it reaches the logo.
  const dotProps = useAnimatedProps(() => {
    const t = interpolate(
      flow.value,
      [range[0] + 0.12, range[1] + 0.2],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      cx: CENTER + dx * (1 - t),
      cy: CENTER + dy * (1 - t),
      opacity:
        interpolate(t, [0, 0.12, 0.82, 1], [0, 1, 1, 0], Extrapolation.CLAMP) *
        (1 - merge.value),
    };
  });

  return (
    <>
      <AnimatedLine
        x1={CENTER + dx}
        y1={CENTER + dy}
        x2={CENTER}
        y2={CENTER}
        stroke={colors.mint400}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={length}
        animatedProps={lineProps}
      />
      <AnimatedCircle r={3} fill={colors.mint500} animatedProps={dotProps} />
    </>
  );
}

function Node({
  flow,
  merge,
  dx,
  dy,
  Icon,
  range,
}: {
  flow: SharedValue<number>;
  merge: SharedValue<number>;
  dx: number;
  dy: number;
  Icon: ComponentType<IconProps>;
  range: [number, number];
}) {
  const style = useAnimatedStyle(() => {
    const reveal = interpolate(
      flow.value,
      [range[0], range[1]],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const m = merge.value;
    return {
      opacity: reveal * (1 - m),
      transform: [
        {translateX: -dx * m * 0.85},
        {translateY: -dy * m * 0.85},
        {
          scale:
            interpolate(reveal, [0, 1], [0.5, 1], Extrapolation.CLAMP) *
            (1 - 0.2 * m),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.node,
        {left: CENTER + dx - NODE / 2, top: CENTER + dy - NODE / 2},
        style,
      ]}>
      <Icon size={18} color={colors.mint700} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Bare absolute box, centred by the parent's alignItems/justifyContent — the
  // same way the logo ring/glow centre themselves. (An explicit left/top:50%
  // offset fought that and pushed the whole graph off-centre.)
  layer: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    position: 'absolute',
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.mint200,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
});
