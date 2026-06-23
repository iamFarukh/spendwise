import {memo, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View, type LayoutChangeEvent} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import Svg, {Circle, Defs, Line, LinearGradient, Path, Stop} from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type {NetWorthTrend} from '@/lib/home/net-worth-series';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HEIGHT = 84;
const BAND_TOP = 16;
const BAND_BOTTOM = 70;
const PAD_L = 2;
const PAD_R = 14; // headroom so the "now" dot + halo never clip the card edge

const TREND_COLOR: Record<NetWorthTrend, string> = {
  up: '#3DF2B4',
  down: '#F7B0A3',
  flat: '#86E8C4',
};

type Geometry = {
  line: string;
  area: string;
  length: number;
  xs: number[];
  ys: number[];
  frac: number[];
  endX: number;
  endY: number;
};

function buildGeometry(points: number[], width: number): Geometry {
  const n = points.length;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const flat = max === min;
  const innerW = Math.max(1, width - PAD_L - PAD_R);

  const xs = points.map((_, i) => PAD_L + (i / (n - 1)) * innerW);
  const ys = points.map(v =>
    flat
      ? (BAND_TOP + BAND_BOTTOM) / 2
      : BAND_BOTTOM - ((v - min) / (max - min)) * (BAND_BOTTOM - BAND_TOP),
  );
  const frac = points.map((_, i) => i / (n - 1));

  let line = `M${xs[0]},${ys[0]}`;
  let length = 0;
  for (let i = 1; i < n; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2;
    const my = (ys[i - 1] + ys[i]) / 2;
    line += ` Q${xs[i - 1]},${ys[i - 1]} ${mx},${my}`;
    length += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  }
  line += ` L${xs[n - 1]},${ys[n - 1]}`;

  const area = `${line} L${xs[n - 1]},${BAND_BOTTOM} L${xs[0]},${BAND_BOTTOM} Z`;
  return {
    line,
    area,
    length: length || innerW,
    xs,
    ys,
    frac,
    endX: xs[n - 1],
    endY: ys[n - 1],
  };
}

/**
 * Net-worth trend sparkline — a real 30-day line drawn from the ledger. It
 * draws itself in (and re-draws on data updates), fills with a soft gradient
 * over faint gridlines so it reads as a proper graph, a quiet pulse rides along
 * the line, and the "now" dot keeps a steady halo beat. Colour follows the
 * trend (rising = mint, falling = coral). UI-thread only; static when reduced.
 */
export const NetWorthSparkline = memo(function NetWorthSparkline({
  points,
  trend,
}: {
  points: number[];
  trend: NetWorthTrend;
}) {
  const reduceMotion = useReducedMotion();
  const isFocused = useIsFocused();
  const [width, setWidth] = useState(0);
  const color = TREND_COLOR[trend];

  const geo = useMemo(
    () => (points.length > 1 ? buildGeometry(points, width) : null),
    [points, width],
  );

  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const pulse = useSharedValue(0);
  const travel = useSharedValue(0);

  // `geo` gets a fresh identity whenever the data (or width) changes, so this
  // re-runs the draw on mount AND on every live update.
  useEffect(() => {
    if (!geo) {
      return;
    }
    if (reduceMotion) {
      draw.value = 1;
      return;
    }
    draw.value = 0;
    draw.value = withDelay(
      120,
      withTiming(1, {duration: 1000, easing: Easing.out(Easing.cubic)}),
    );
  }, [draw, geo, reduceMotion]);

  // Infinite loops — pause them while Home is off-screen and cancel on unmount.
  useEffect(() => {
    if (reduceMotion || !isFocused) {
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, {duration: 1500, easing: Easing.inOut(Easing.sin)}),
      -1,
      false,
    );
    travel.value = withDelay(
      1100,
      withRepeat(withTiming(1, {duration: 2600, easing: Easing.inOut(Easing.cubic)}), -1, false),
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(travel);
    };
  }, [pulse, reduceMotion, travel, isFocused]);

  const hasGeo = geo !== null;
  const xs = geo?.xs ?? [0, 0];
  const ys = geo?.ys ?? [0, 0];
  const frac = geo?.frac ?? [0, 1];
  const length = geo?.length ?? 1;

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - draw.value),
  }));
  const areaProps = useAnimatedProps(() => ({
    fillOpacity: interpolate(draw.value, [0, 0.5, 1], [0, 0.4, 1], Extrapolation.CLAMP),
  }));
  const dotProps = useAnimatedProps(() => ({
    opacity: interpolate(draw.value, [0.7, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const haloProps = useAnimatedProps(() => ({
    r: 4 + pulse.value * 7,
    opacity:
      interpolate(draw.value, [0.7, 1], [0, 1], Extrapolation.CLAMP) *
      interpolate(pulse.value, [0, 1], [0.5, 0], Extrapolation.CLAMP),
  }));
  const travelProps = useAnimatedProps(() => {
    const u = travel.value;
    return {
      cx: interpolate(u, frac, xs, Extrapolation.CLAMP),
      cy: interpolate(u, frac, ys, Extrapolation.CLAMP),
      opacity:
        interpolate(draw.value, [0.9, 1], [0, 1], Extrapolation.CLAMP) *
        interpolate(u, [0, 0.12, 0.85, 1], [0, 0.9, 0.9, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <View
      style={styles.wrap}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {hasGeo && width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="nwSpark" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.34} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Faint gridlines → "proper graph" structure. */}
          <Line x1={PAD_L} y1={(BAND_TOP + BAND_BOTTOM) / 2} x2={width - PAD_R} y2={(BAND_TOP + BAND_BOTTOM) / 2} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
          <Line x1={PAD_L} y1={BAND_BOTTOM} x2={width - PAD_R} y2={BAND_BOTTOM} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />

          <AnimatedPath d={geo!.area} fill="url(#nwSpark)" animatedProps={areaProps} />
          <AnimatedPath
            d={geo!.line}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={length}
            animatedProps={lineProps}
          />

          {/* Live pulse riding along the line. */}
          <AnimatedCircle r={3} fill={color} animatedProps={travelProps} />

          {/* The "now" point. */}
          <AnimatedCircle cx={geo!.endX} cy={geo!.endY} fill={color} animatedProps={haloProps} />
          <AnimatedCircle
            cx={geo!.endX}
            cy={geo!.endY}
            r={3.5}
            fill={color}
            stroke="#0A7D5C"
            strokeWidth={1.5}
            animatedProps={dotProps}
          />
        </Svg>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {height: HEIGHT, width: '100%', justifyContent: 'center'},
});
