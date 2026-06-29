import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {BackHandler, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {IconCheck, IconTrash} from '@/components/icons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {SPRINGS, TIMINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';

type DialogTone = 'default' | 'danger' | 'success';

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Primary button label. Defaults to "Confirm" (or "Delete" when destructive). */
  confirmLabel?: string;
  /** Secondary button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Red primary button + danger icon. */
  destructive?: boolean;
  /** Overrides the icon/accent. Inferred from `destructive` when omitted. */
  tone?: DialogTone;
  /** Single-button acknowledgement (no cancel). */
  alertOnly?: boolean;
};

export type AlertOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
};

type DialogContextValue = {
  /** Promise resolves true on confirm, false on cancel / backdrop / back. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Single-button alert. Resolves when dismissed. */
  alert: (options: AlertOptions) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

const TONE_STYLE: Record<
  DialogTone,
  {bg: string; fg: string; Icon: typeof IconCheck}
> = {
  default: {bg: colors.mint100, fg: colors.mint700, Icon: IconCheck},
  danger: {bg: colors.expenseBg, fg: colors.expense, Icon: IconTrash},
  success: {bg: colors.incomeBg, fg: colors.income, Icon: IconCheck},
};

export function DialogProvider({children}: {children: ReactNode}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const overlay = useSharedValue(0);
  const scale = useSharedValue(0.95);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      // Settle any dialog already open as cancelled before showing the new one.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setRequest(options);
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>(resolve => {
      resolverRef.current?.(false);
      resolverRef.current = () => resolve();
      setRequest({
        ...options,
        alertOnly: true,
        confirmLabel: options.confirmLabel ?? 'OK',
      });
    });
  }, []);

  // Open: overlay fades in, card scales 0.95 → 1.
  useEffect(() => {
    if (!request) {
      return;
    }
    overlay.value = withTiming(1, TIMINGS.base);
    scale.value = reduceMotion
      ? withTiming(1, TIMINGS.base)
      : withSpring(1, SPRINGS.snappy);
  }, [request, overlay, scale, reduceMotion]);

  const settle = useCallback(
    (result: boolean) => {
      const resolve = resolverRef.current;
      resolverRef.current = null;
      setRequest(null);
      scale.value = 0.95; // reset for the next open
      if (request?.alertOnly) {
        (resolve as (() => void) | null)?.();
        return;
      }
      (resolve as ((value: boolean) => void) | null)?.(result);
    },
    [request?.alertOnly, scale],
  );

  const close = useCallback(
    (result: boolean) => {
      overlay.value = withTiming(0, TIMINGS.exit);
      scale.value = withTiming(0.95, TIMINGS.exit, finished => {
        if (finished) {
          runOnJS(settle)(result);
        }
      });
    },
    [overlay, scale, settle],
  );

  // Android hardware back cancels the dialog (matches native Alert).
  useEffect(() => {
    if (!request) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close(false);
      return true;
    });
    return () => sub.remove();
  }, [request, close]);

  const value = useMemo<DialogContextValue>(() => ({confirm, alert}), [alert, confirm]);

  const overlayStyle = useAnimatedStyle(() => ({opacity: overlay.value}));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
    transform: [{scale: scale.value}],
  }));

  const tone: DialogTone =
    request?.tone ?? (request?.destructive ? 'danger' : 'default');
  const toneStyle = TONE_STYLE[tone];
  const ToneIcon = toneStyle.Icon;
  const destructive = request?.destructive ?? tone === 'danger';
  const alertOnly = request?.alertOnly === true;

  return (
    <DialogContext.Provider value={value}>
      {children}
      {request ? (
        <View style={styles.layer}>
          <Animated.View style={[styles.backdrop, overlayStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => close(false)}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.card,
              {marginBottom: insets.bottom, marginTop: insets.top},
              cardStyle,
            ]}>
            <View style={[styles.iconBadge, {backgroundColor: toneStyle.bg}]}>
              <ToneIcon size={22} color={toneStyle.fg} strokeWidth={2.4} />
            </View>
            <AppText variant="h3" style={styles.title}>
              {request.title}
            </AppText>
            {request.message ? (
              <AppText variant="body" muted style={styles.message}>
                {request.message}
              </AppText>
            ) : null}
            <View style={styles.actions}>
              {alertOnly ? null : (
                <PressableScale
                  onPress={() => close(false)}
                  style={styles.actionFlex}>
                  <View style={[styles.btn, styles.btnCancel]}>
                    <AppText variant="body" style={styles.btnCancelText}>
                      {request.cancelLabel ?? 'Cancel'}
                    </AppText>
                  </View>
                </PressableScale>
              )}
              <PressableScale
                onPress={() => close(true)}
                style={alertOnly ? styles.actionFull : styles.actionFlex}>
                <View
                  style={[
                    styles.btn,
                    destructive ? styles.btnDanger : styles.btnPrimary,
                  ]}>
                  <AppText variant="body" style={styles.btnPrimaryText}>
                    {request.confirmLabel ?? (destructive ? 'Delete' : 'Confirm')}
                  </AppText>
                </View>
              </PressableScale>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 10000,
    elevation: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,42,34,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    shadowColor: '#0E2A22',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: {width: 0, height: 14},
    elevation: 12,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {textAlign: 'center'},
  message: {
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  actionFlex: {flex: 1},
  actionFull: {alignSelf: 'stretch', width: '100%'},
  btn: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {backgroundColor: colors.canvas},
  btnCancelText: {color: colors.ink600, fontWeight: '700'},
  btnPrimary: {backgroundColor: colors.mint500},
  btnDanger: {backgroundColor: colors.expense},
  btnPrimaryText: {color: colors.white, fontWeight: '700'},
});
