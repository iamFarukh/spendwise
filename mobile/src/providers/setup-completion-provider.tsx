import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  SetupCompletionScene,
  type CompletionPhase,
} from '@/components/setup/setup-completion-scene';
import {hapticMedium} from '@/lib/haptics';
import {colors} from '@/constants/theme';

type SetupCompletionContextValue = {
  /**
   * Run the day-zero writes behind the premium 3-phase celebration, then
   * cross-fade the overlay out to reveal the freshly-mounted home screen.
   * Resolves once the overlay has fully dissolved. If `work` throws, the
   * overlay is dismissed and the error re-thrown so the caller can recover
   * (the setup screen is still mounted underneath since setup never completed).
   */
  celebrate: (work: () => Promise<void>) => Promise<void>;
};

const SetupCompletionContext =
  createContext<SetupCompletionContextValue | null>(null);

const PHASE1_MS = 1500;
const PHASE2_MS = 1000;
const PHASE3_MS = 1100;
const FADE_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Hosts the setup-completion overlay ABOVE the navigator so it persists across
 * the reactive Setup → Main swap (which fires the moment `setupComplete` flips)
 * and masks it with a seamless cross-fade — the home screen mounts underneath
 * and is revealed as the celebration dissolves.
 */
export function SetupCompletionProvider({children}: {children: ReactNode}) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<CompletionPhase>(1);
  const opacity = useSharedValue(1);
  const runningRef = useRef(false);

  const celebrate = useCallback(
    async (work: () => Promise<void>) => {
      if (runningRef.current) {
        return;
      }
      runningRef.current = true;

      opacity.value = 1;
      setPhase(1);
      setActive(true);

      let workError: unknown = null;
      const workPromise = work().catch(err => {
        workError = err;
      });

      try {
        await delay(reduceMotion ? 600 : PHASE1_MS);
        if (workError) {
          throw workError;
        }
        setPhase(2);

        await delay(reduceMotion ? 400 : PHASE2_MS);
        // Ensure the writes have landed (and home has mounted) before success.
        await workPromise;
        if (workError) {
          throw workError;
        }
        setPhase(3);
        hapticMedium();
        await delay(reduceMotion ? 600 : PHASE3_MS);

        opacity.value = withTiming(0, {duration: reduceMotion ? 0 : FADE_MS});
        await delay(reduceMotion ? 0 : FADE_MS + 40);
        setActive(false);
      } catch (err) {
        setActive(false);
        throw err;
      } finally {
        runningRef.current = false;
      }
    },
    [opacity, reduceMotion],
  );

  const value = useMemo(() => ({celebrate}), [celebrate]);
  const overlayStyle = useAnimatedStyle(() => ({opacity: opacity.value}));

  return (
    <SetupCompletionContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {active ? (
          <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="auto">
            <SetupCompletionScene phase={phase} />
          </Animated.View>
        ) : null}
      </View>
    </SetupCompletionContext.Provider>
  );
}

export function useSetupCompletion(): SetupCompletionContextValue {
  const ctx = useContext(SetupCompletionContext);
  if (!ctx) {
    throw new Error(
      'useSetupCompletion must be used within a SetupCompletionProvider',
    );
  }
  return ctx;
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.canvas},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    elevation: 120,
  },
});
