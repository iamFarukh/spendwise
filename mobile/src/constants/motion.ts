/**
 * Motion language for SpendWise mobile. Spring presets model real physics so
 * everything feels alive without guesswork. Default to springs; use timings
 * only for opacity fades, loops, and determinate progress.
 */
import {Easing, type WithSpringConfig, type WithTimingConfig} from 'react-native-reanimated';

export const SPRINGS = {
  /** UI responses — snappy, no overshoot (button press, toggle). */
  snappy: {damping: 20, stiffness: 300, mass: 0.5},
  /** Balanced default for most moves. */
  default: {damping: 18, stiffness: 200, mass: 0.8},
  /** Modals, bottom sheets — heavy, grounded. */
  heavy: {damping: 22, stiffness: 180, mass: 1.2},
  /** Playful micro-interactions, success pops. */
  bouncy: {damping: 11, stiffness: 250, mass: 0.6},
  /** Content fades, large gentle moves. */
  gentle: {damping: 26, stiffness: 120, mass: 1.0},
  /** Screen / tab transitions. */
  page: {damping: 24, stiffness: 260, mass: 0.9},
} as const satisfies Record<string, WithSpringConfig>;

export const TIMINGS = {
  fast: {duration: 150, easing: Easing.out(Easing.cubic)},
  base: {duration: 220, easing: Easing.out(Easing.cubic)},
  slow: {duration: 340, easing: Easing.out(Easing.cubic)},
  /** Exit motion should be quicker than entrance. */
  exit: {duration: 180, easing: Easing.in(Easing.cubic)},
} as const satisfies Record<string, WithTimingConfig>;

/** List item stagger step (ms). Sequential reveals read as scannable. */
export const STAGGER_STEP = 55;
