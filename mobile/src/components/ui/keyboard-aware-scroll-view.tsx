import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Breathing room kept between a focused field and the top of the keyboard. */
const DEFAULT_GAP = 24;
/** Wait for adjustResize + keyboard animation before measuring on Android. */
const ANDROID_SCROLL_DELAY_MS = 150;

type FocusedInput = {
  measureInWindow?: (
    cb: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

/**
 * Keep the focused text field above the Android keyboard.
 *
 * iOS resizes/pads correctly via `KeyboardAvoidingView behavior="padding"`, but
 * Android's `adjustResize` only shrinks the window — it does NOT reliably scroll
 * the focused field into the (now shorter) viewport, so fields below the fold
 * stay hidden behind the keyboard. We scroll only when the field is actually
 * obscured, after the keyboard has settled, so we never fight focus.
 *
 * Attach to an existing ScrollView via {@link useKeyboardAwareScroll}, or use the
 * drop-in {@link KeyboardAwareScrollView} for the common `KAV > ScrollView` case.
 */
export function useKeyboardAwareScroll(
  scrollRef: RefObject<ScrollView | null>,
  options: {gap?: number} = {},
) {
  const gap = options.gap ?? DEFAULT_GAP;
  const offsetY = useRef(0);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollTarget = useRef(0);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = event.nativeEvent.contentOffset.y;
  }, []);

  const scrollFocusedIntoView = useCallback(
    (gapOverride?: number) => {
      if (Platform.OS !== 'android') {
        return;
      }
      const node = scrollRef.current;
      const input = TextInput.State.currentlyFocusedInput?.() as
        | FocusedInput
        | null
        | undefined;
      if (!node || !input) {
        return;
      }

      const effectiveGap = gapOverride ?? gap;

      const measureAndScroll = () => {
        const keyboardTop = Keyboard.metrics()?.screenY ?? 0;
        if (keyboardTop <= 0) {
          return;
        }

        if (typeof input.measureInWindow === 'function') {
          input.measureInWindow((_x, y, _w, height) => {
            const overlap = y + height + effectiveGap - keyboardTop;
            if (overlap <= 1) {
              return;
            }
            const targetY = offsetY.current + overlap;
            if (Math.abs(targetY - lastScrollTarget.current) < 2) {
              return;
            }
            lastScrollTarget.current = targetY;
            node.scrollTo({y: targetY, animated: false});
          });
          return;
        }

        const handle = findNodeHandle(input as unknown as React.Component);
        const scroll = node.scrollResponderScrollNativeHandleToKeyboard;
        if (handle && typeof scroll === 'function') {
          scroll.call(node, handle, effectiveGap, false);
        }
      };

      measureAndScroll();
    },
    [scrollRef, gap],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const scheduleScroll = () => {
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
      scrollTimer.current = setTimeout(() => {
        scrollTimer.current = null;
        scrollFocusedIntoView();
      }, ANDROID_SCROLL_DELAY_MS);
    };

    const resetOnHide = () => {
      lastScrollTarget.current = 0;
    };

    const showSub = Keyboard.addListener('keyboardDidShow', scheduleScroll);
    const hideSub = Keyboard.addListener('keyboardDidHide', resetOnHide);
    return () => {
      showSub.remove();
      hideSub.remove();
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, [scrollFocusedIntoView]);

  return {onScroll, scrollEventThrottle: 16, scrollFocusedIntoView};
}

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  /** Style for the outer KeyboardAvoidingView (defaults to flex: 1). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Extra space kept between a focused field and the keyboard. */
  keyboardGap?: number;
  children: ReactNode;
};

/**
 * Drop-in replacement for the `<KeyboardAvoidingView><ScrollView>…` pattern.
 * Preserves the existing iOS padding behaviour and adds Android focus-scrolling.
 */
export function KeyboardAwareScrollView({
  containerStyle,
  keyboardGap,
  onScroll,
  children,
  ...scrollProps
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const {onScroll: kbOnScroll, scrollEventThrottle} = useKeyboardAwareScroll(
    scrollRef,
    {gap: keyboardGap},
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      kbOnScroll(event);
      onScroll?.(event);
    },
    [kbOnScroll, onScroll],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={scrollEventThrottle}
        {...scrollProps}
        onScroll={handleScroll}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
});
