import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Keyframe,
  LinearTransition,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {IconClose} from '@/components/icons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {ToastIcon, type ToastVariant} from '@/components/motion/toast-icon';
import {colors, radius, spacing} from '@/constants/theme';
import {
  hapticError,
  hapticInfo,
  hapticSuccess,
  hapticWarning,
} from '@/lib/haptics';

export type {ToastVariant};

// Success — soft scale-in, no shake. Satisfying completion feel.
const TOAST_SUCCESS_IN = new Keyframe({
  0: {opacity: 0, transform: [{translateY: 6}, {scale: 0.96}]},
  100: {
    opacity: 1,
    transform: [{translateY: 0}, {scale: 1}],
    easing: Easing.out(Easing.cubic),
  },
}).duration(220);

// Error — subtle horizontal shake after a quick rise-in. ~300ms total.
// Every keyframe must declare the SAME property set as keyframe 0 (Reanimated
// rule), so the shake frames hold opacity/translateY/scale and vary only X.
const TOAST_ERROR_IN = new Keyframe({
  0: {opacity: 0, transform: [{translateY: 10}, {translateX: 0}, {scale: 0.98}]},
  18: {
    opacity: 1,
    transform: [{translateY: 0}, {translateX: -4}, {scale: 1}],
    easing: Easing.out(Easing.cubic),
  },
  38: {opacity: 1, transform: [{translateY: 0}, {translateX: 4}, {scale: 1}]},
  58: {opacity: 1, transform: [{translateY: 0}, {translateX: -3}, {scale: 1}]},
  78: {opacity: 1, transform: [{translateY: 0}, {translateX: 3}, {scale: 1}]},
  100: {opacity: 1, transform: [{translateY: 0}, {translateX: 0}, {scale: 1}]},
}).duration(300);

// Warning — gentler shake, friendly attention. Same full-property-set rule.
const TOAST_WARNING_IN = new Keyframe({
  0: {opacity: 0, transform: [{translateY: 8}, {translateX: 0}, {scale: 0.98}]},
  20: {
    opacity: 1,
    transform: [{translateY: 0}, {translateX: -2}, {scale: 1}],
    easing: Easing.out(Easing.cubic),
  },
  48: {opacity: 1, transform: [{translateY: 0}, {translateX: 2}, {scale: 1}]},
  72: {opacity: 1, transform: [{translateY: 0}, {translateX: -1}, {scale: 1}]},
  100: {opacity: 1, transform: [{translateY: 0}, {translateX: 0}, {scale: 1}]},
}).duration(280);

// Info — neutral, lightweight fade + scale.
const TOAST_INFO_IN = new Keyframe({
  0: {opacity: 0, transform: [{translateY: 8}, {scale: 0.97}]},
  100: {
    opacity: 1,
    transform: [{translateY: 0}, {scale: 1}],
    easing: Easing.out(Easing.cubic),
  },
}).duration(200);

const TOAST_OUT = new Keyframe({
  0: {opacity: 1, transform: [{translateY: 0}, {scale: 1}]},
  100: {
    opacity: 0,
    transform: [{translateY: 6}, {scale: 0.98}],
    easing: Easing.in(Easing.cubic),
  },
}).duration(160);

const TOAST_STACK = LinearTransition.springify().damping(20).stiffness(220);

const ENTERING: Record<ToastVariant, typeof TOAST_SUCCESS_IN> = {
  success: TOAST_SUCCESS_IN,
  error: TOAST_ERROR_IN,
  warning: TOAST_WARNING_IN,
  info: TOAST_INFO_IN,
};

type Toast = {id: string; message: string; variant: ToastVariant};

type ToastContextValue = {
  notify: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

function triggerHaptic(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      hapticSuccess();
      break;
    case 'error':
      hapticError();
      break;
    case 'warning':
      hapticWarning();
      break;
    case 'info':
      hapticInfo();
      break;
  }
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const hapticFired = useRef(false);

  useEffect(() => {
    if (hapticFired.current) {
      return;
    }
    hapticFired.current = true;
    triggerHaptic(toast.variant);
  }, [toast.id, toast.variant]);

  const shellStyle = VARIANT_SHELL[toast.variant];
  const messageStyle = VARIANT_MESSAGE[toast.variant];

  return (
    <Animated.View
      entering={ENTERING[toast.variant]}
      exiting={TOAST_OUT}
      layout={TOAST_STACK}
      style={[styles.toast, shellStyle]}
      pointerEvents="box-none">
      <View pointerEvents="none" style={styles.iconWrap}>
        <ToastIcon variant={toast.variant} size={28} />
      </View>
      <AppText variant="sm" style={[styles.message, messageStyle]}>
        {toast.message}
      </AppText>
      <PressableScale onPress={() => onDismiss(toast.id)} hitSlop={10}>
        <IconClose size={16} color={colors.ink400} />
      </PressableScale>
    </Animated.View>
  );
}

const VARIANT_SHELL: Record<ToastVariant, object> = {
  success: {
    borderColor: colors.mint200,
    backgroundColor: colors.paper,
  },
  error: {
    borderColor: '#F0C4BC',
    backgroundColor: '#FFFAF9',
  },
  warning: {
    borderColor: '#F0DCA8',
    backgroundColor: colors.pendingBg,
  },
  info: {
    borderColor: colors.mint200,
    backgroundColor: colors.tint,
  },
};

const VARIANT_MESSAGE: Record<ToastVariant, object> = {
  success: {color: colors.ink900},
  error: {color: colors.expense},
  warning: {color: colors.ink800},
  info: {color: colors.ink700},
};

type ToastHostHandle = {push: (message: string, variant: ToastVariant) => void};

/**
 * Owns the toast list state and renders the floating layer. Isolated from the
 * provider so that showing/dismissing a toast re-renders ONLY this component —
 * not `{children}` (the whole navigator + every mounted screen), which is what
 * happened when the state lived in the provider above the app tree.
 */
const ToastHost = forwardRef<ToastHostHandle>(function ToastHost(_props, ref) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: string) => {
    setToasts(current => current.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      push: (message, variant) => {
        counter += 1;
        const id = `t-${counter}`;
        setToasts(current => [...current, {id, message, variant}]);
        timers.current.set(
          id,
          setTimeout(() => remove(id), 3500),
        );
      },
    }),
    [remove],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) {
        clearTimeout(timer);
      }
      map.clear();
    };
  }, []);

  return (
    <SafeAreaView style={styles.layer} pointerEvents="box-none" edges={['bottom']}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={remove} />
      ))}
    </SafeAreaView>
  );
});

export function ToastProvider({children}: {children: ReactNode}) {
  const hostRef = useRef<ToastHostHandle>(null);

  // Stable for the provider's lifetime — pushing a toast never changes this
  // value, so consumers and `{children}` are never re-rendered by a toast.
  const value = useMemo<ToastContextValue>(() => {
    const notify = (message: string, variant: ToastVariant = 'info') =>
      hostRef.current?.push(message, variant);
    return {
      notify,
      success: m => notify(m, 'success'),
      error: m => notify(m, 'error'),
      warning: m => notify(m, 'warning'),
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost ref={hostRef} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    zIndex: 9999,
    elevation: 24,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#0E2A22',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {flex: 1, fontWeight: '600'},
});
