import {useEffect, useMemo, useState} from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import {toDateStringInTimezone} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconCheck, IconClose} from '@/components/icons';
import {Lottie} from '@/components/motion/lottie';
import {PressableScale} from '@/components/motion/pressable-scale';
import {SPRINGS, TIMINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useCategories} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {formatLedgerMoney} from '@/lib/format/currency';
import {useToast} from '@/providers/toast-provider';
import {saveTransaction} from '@/lib/transactions/service';

const SCREEN_H = Dimensions.get('window').height;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

type QuickAddSheetProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
};

export function QuickAddSheet({visible, userId, onClose}: QuickAddSheetProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const {settings} = useUserSettings();
  const {accounts} = useAccounts();
  const {categories} = useCategories();

  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);

  const primaryAccount = useMemo(() => {
    return (
      accounts.find(a => a.isPrimary) ??
      accounts.find(a => a.id === settings?.primaryAccountId) ??
      accounts[0] ??
      null
    );
  }, [accounts, settings?.primaryAccountId]);

  const numericAmount = Number(amount) || 0;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setAmount('');
      setCategoryId('');
      setDone(false);
      backdrop.value = withTiming(1, TIMINGS.base);
      translateY.value = reduceMotion
        ? withTiming(0, TIMINGS.base)
        : withSpring(0, SPRINGS.heavy);
    } else if (mounted) {
      backdrop.value = withTiming(0, TIMINGS.exit);
      translateY.value = withTiming(SCREEN_H, TIMINGS.exit, finished => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));
  const backdropStyle = useAnimatedStyle(() => ({opacity: backdrop.value}));

  const pan = Gesture.Pan()
    .onUpdate(event => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd(event => {
      if (event.translationY > 120 || event.velocityY > 800) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRINGS.default);
      }
    });

  function pressKey(key: string) {
    setAmount(current => {
      if (key === 'del') {
        return current.slice(0, -1);
      }
      if (key === '.') {
        return current.includes('.') ? current : current === '' ? '0.' : current + '.';
      }
      // Limit to 2 decimals.
      if (current.includes('.') && current.split('.')[1]?.length >= 2) {
        return current;
      }
      return current + key;
    });
  }

  async function handleSave() {
    if (numericAmount <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }
    if (!categoryId) {
      toast.error('Choose a category.');
      return;
    }
    if (!primaryAccount) {
      toast.error('Add a primary account first.');
      return;
    }
    if (!settings) {
      return;
    }

    setBusy(true);
    try {
      await saveTransaction(userId, {
        type: 'EXPENSE',
        amount: numericAmount,
        date: toDateStringInTimezone(new Date(), settings.timezone),
        fromAccountId: primaryAccount.id,
        categoryId,
        status: 'VERIFIED',
      });
      setDone(true);
      toast.success('Expense saved.');
      setTimeout(onClose, 1150);
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not save expense.'));
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return null;
  }

  const currency = settings?.baseCurrency ?? 'INR';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, {paddingBottom: insets.bottom + spacing.lg}, sheetStyle]}>
        {done ? (
          <Animated.View
            entering={ZoomIn.springify().damping(12).stiffness(180)}
            style={styles.success}>
            <Lottie name="caught-up" size={150} loop={false} />
            <AppText variant="h2">Saved</AppText>
            <AppText variant="body" muted>
              {formatLedgerMoney(numericAmount, settings)} ·{' '}
              {primaryAccount?.name}
            </AppText>
          </Animated.View>
        ) : (
          <>
            <GestureDetector gesture={pan}>
              <View style={styles.handleZone}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>

            <View style={styles.headerRow}>
              <AppText variant="h3">Quick expense</AppText>
              <PressableScale onPress={onClose} hitSlop={12}>
                <IconClose size={22} color={colors.ink400} />
              </PressableScale>
            </View>

            <View style={styles.amountWrap}>
              <AppText variant="h1" style={styles.amountCurrency}>
                {currency === 'INR' ? '₹' : ''}
              </AppText>
              <AppText style={styles.amountValue}>
                {amount === '' ? '0' : amount}
              </AppText>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}>
              {categories.map(category => {
                const selected = category.id === categoryId;
                return (
                  <PressableScale
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    scaleTo={0.92}>
                    <View style={[styles.chip, selected && styles.chipActive]}>
                      <AppText
                        variant="sm"
                        style={[
                          styles.chipText,
                          selected && styles.chipTextActive,
                        ]}>
                        {category.name}
                      </AppText>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>

            <View style={styles.keypad}>
              {KEYS.map(key => (
                <PressableScale
                  key={key}
                  onPress={() => pressKey(key)}
                  scaleTo={0.88}
                  style={styles.keyWrap}>
                  <View style={styles.key}>
                    {key === 'del' ? (
                      <IconClose size={20} color={colors.ink600} />
                    ) : (
                      <AppText style={styles.keyText}>{key}</AppText>
                    )}
                  </View>
                </PressableScale>
              ))}
            </View>

            <PressableScale onPress={handleSave} disabled={busy}>
              <View style={styles.saveBtn}>
                <IconCheck size={20} color={colors.white} strokeWidth={2.4} />
                <AppText variant="body" style={styles.saveText}>
                  {busy ? 'Saving…' : 'Save expense'}
                </AppText>
              </View>
            </PressableScale>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,42,34,0.45)'},
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handleZone: {alignItems: 'center', paddingVertical: spacing.sm},
  handle: {
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.lg,
  },
  amountCurrency: {color: colors.ink400},
  amountValue: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.ink900,
    fontVariant: ['tabular-nums'],
  },
  chips: {gap: spacing.sm, paddingVertical: spacing.sm, paddingRight: spacing.lg},
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {backgroundColor: colors.mint500, borderColor: colors.mint500},
  chipText: {color: colors.ink600, fontWeight: '600'},
  chipTextActive: {color: colors.white},
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  keyWrap: {width: '33.333%', paddingVertical: spacing.xs},
  key: {alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md},
  keyText: {fontSize: 26, fontWeight: '600', color: colors.ink900},
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.mint500,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  saveText: {color: colors.white, fontWeight: '700'},
  success: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl},
});
