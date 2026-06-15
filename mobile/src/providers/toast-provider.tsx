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
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeOutUp, SlideInDown} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {IconCheck, IconClose} from '@/components/icons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {colors, radius, spacing} from '@/constants/theme';

type ToastVariant = 'success' | 'error' | 'info';

type Toast = {id: string; message: string; variant: ToastVariant};

type ToastContextValue = {
  notify: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({children}: {children: ReactNode}) {
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

  const notify = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      counter += 1;
      const id = `t-${counter}`;
      setToasts(current => [...current, {id, message, variant}]);
      timers.current.set(
        id,
        setTimeout(() => remove(id), 3500),
      );
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: m => notify(m, 'success'),
      error: m => notify(m, 'error'),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <SafeAreaView style={styles.layer} pointerEvents="box-none" edges={['top']}>
        {toasts.map(toast => (
          <Animated.View
            key={toast.id}
            entering={SlideInDown.springify().damping(18).stiffness(220)}
            exiting={FadeOutUp.duration(180)}
            style={styles.toast}>
            <View
              style={[
                styles.dot,
                toast.variant === 'success' && {backgroundColor: colors.incomeBg},
                toast.variant === 'error' && {backgroundColor: colors.expenseBg},
                toast.variant === 'info' && {backgroundColor: colors.mint100},
              ]}>
              <IconCheck
                size={14}
                color={
                  toast.variant === 'error' ? colors.expense : colors.mint700
                }
              />
            </View>
            <AppText variant="sm" style={styles.message}>
              {toast.message}
            </AppText>
            <PressableScale onPress={() => remove(toast.id)} hitSlop={10}>
              <IconClose size={16} color={colors.ink400} />
            </PressableScale>
          </Animated.View>
        ))}
      </SafeAreaView>
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
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#0E2A22',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 6,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {flex: 1, color: colors.ink900, fontWeight: '600'},
});
