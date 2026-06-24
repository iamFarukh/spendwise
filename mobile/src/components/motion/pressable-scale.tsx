import {memo, useCallback, useEffect, useMemo, useRef, type ReactNode} from 'react';
import {type StyleProp, type ViewStyle} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {SPRINGS} from '@/constants/motion';

type PressableScaleProps = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** How far to scale down on press. */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
};

/**
 * Touchable wrapper with a physical spring press on the UI thread. Replaces
 * TouchableOpacity everywhere — feedback is instant, alive, and reduced-motion
 * aware.
 *
 * Perf: this is the app's touch primitive (dozens of instances per screen). The
 * gesture is built ONCE via useMemo and reads the latest `onPress`/`onLongPress`
 * through refs, so it is NOT reconstructed on every parent re-render (it used to
 * be rebuilt inline every render). The component is also memoized so callers
 * that pass stable props (e.g. a memoized keypad/list row) skip re-rendering it.
 */
export const PressableScale = memo(function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  scaleTo = 0.96,
  style,
  hitSlop = 8,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const skipScale = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    skipScale.value = reduceMotion ? 1 : 0;
  }, [reduceMotion, skipScale]);

  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  const callPress = useCallback(() => onPressRef.current?.(), []);
  const callLongPress = useCallback(() => onLongPressRef.current?.(), []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const hasLongPress = onLongPress != null;

  const gesture = useMemo(() => {
    const press = (target: number) => {
      'worklet';
      scale.value = skipScale.value ? 1 : withSpring(target, SPRINGS.snappy);
    };

    const tap = Gesture.Tap()
      .enabled(!disabled)
      .maxDuration(10000)
      .onBegin(() => press(scaleTo))
      .onFinalize((_event, success) => {
        press(1);
        if (success) {
          runOnJS(callPress)();
        }
      });

    if (!hasLongPress) {
      return tap;
    }

    return Gesture.Race(
      tap,
      Gesture.LongPress()
        .enabled(!disabled)
        .minDuration(400)
        .onStart(() => runOnJS(callLongPress)()),
    );
  }, [disabled, scaleTo, hasLongPress, scale, skipScale, callPress, callLongPress]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[style, animatedStyle, disabled && {opacity: 0.5}]}
        hitSlop={hitSlop}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
});
