import {type ReactNode} from 'react';
import {type StyleProp, type ViewStyle} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';

import {STAGGER_STEP} from '@/constants/motion';

const REFLOW = LinearTransition.springify().damping(24).stiffness(180).mass(0.8);

type FadeInViewProps = {
  children: ReactNode;
  /** Position in a list — multiplies the entrance delay for a stagger. */
  index?: number;
  /** Base delay (ms) before this item's stagger offset. */
  delay?: number;
  /** Rise distance; translateY + fade is the gold standard for list items. */
  distance?: number;
  /** Animate layout shifts (e.g. when a sibling above resizes) instead of jumping. */
  reflow?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Entrance wrapper: items fade in while rising a few px, staggered by index.
 * Under reduced motion it fades only (no movement).
 */
export function FadeInView({
  children,
  index = 0,
  delay = 0,
  distance = 14,
  reflow = false,
  style,
}: FadeInViewProps) {
  const reduceMotion = useReducedMotion();
  const totalDelay = delay + index * STAGGER_STEP;

  const entering = reduceMotion
    ? FadeIn.duration(220).delay(totalDelay)
    : FadeInDown.springify()
        .damping(20)
        .stiffness(180)
        .mass(0.7)
        .withInitialValues({transform: [{translateY: distance}], opacity: 0})
        .delay(totalDelay);

  return (
    <Animated.View
      entering={entering}
      layout={reflow && !reduceMotion ? REFLOW : undefined}
      style={style}>
      {children}
    </Animated.View>
  );
}
