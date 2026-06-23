import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  validateTransactionForm,
  type Account,
  type Transaction,
  type TransactionFormInput,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {useKeyboardAwareScroll} from '@/components/ui/keyboard-aware-scroll-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconCheck, IconClose} from '@/components/icons';
import {SPRINGS, TIMINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useCategories} from '@/providers/ledger-data-provider';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {updateTransaction, verifyTransaction} from '@/lib/transactions/service';
import {useToast} from '@/providers/toast-provider';
import {isQuickEditable} from '@/components/transactions/quick-add-sheet';

const SCREEN_H = Dimensions.get('window').height;

type PendingEditSheetProps = {
  txn: Transaction | null;
  userId: string;
  onClose: () => void;
};

export function PendingEditSheet({txn, userId, onClose}: PendingEditSheetProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const {accounts} = useAccounts();
  const {categories} = useCategories();

  const [mounted, setMounted] = useState(Boolean(txn));
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);

  const scrollRef = useRef<ScrollView>(null);
  const keyboardAware = useKeyboardAwareScroll(scrollRef);

  const assetAccounts = useMemo(
    () => accounts.filter(a => a.class === 'ASSET' && !a.archived),
    [accounts],
  );

  const expenseCategories = useMemo(
    () => categories.filter(c => !c.system),
    [categories],
  );

  useEffect(() => {
    if (txn) {
      setMounted(true);
      setAmount(txn.amount ? String(txn.amount) : '');
      setMerchant(txn.merchant?.trim() ?? '');
      setNotes(txn.notes?.trim() ?? '');
      setFromAccountId(txn.fromAccountId ?? '');
      setToAccountId(txn.toAccountId ?? '');
      setCategoryId(txn.categoryId ?? expenseCategories[0]?.id ?? '');
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
  }, [txn]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));
  const backdropStyle = useAnimatedStyle(() => ({opacity: backdrop.value}));

  if (!mounted || !txn) {
    return null;
  }

  const isInvestment = txn.type === 'INVESTMENT';
  const isExpense = txn.type === 'EXPENSE';
  const isIncome = txn.type === 'INCOME';
  const isTransfer = txn.type === 'TRANSFER' || txn.type === 'WITHDRAWAL';

  function buildInput(): TransactionFormInput {
    const parsed = Number(amount);
    const base = {
      type: txn!.type as TransactionFormInput['type'],
      amount: parsed,
      date: txn!.date,
      status: 'PENDING' as const,
      merchant: merchant.trim(),
      notes: notes.trim(),
    };

    if (isInvestment) {
      return {
        ...base,
        fromAccountId: fromAccountId || null,
        toAccountId: null,
        categoryId: null,
      };
    }
    if (isExpense) {
      return {
        ...base,
        fromAccountId: fromAccountId || null,
        categoryId: categoryId || null,
      };
    }
    if (isIncome) {
      return {
        ...base,
        toAccountId: toAccountId || null,
        categoryId: null,
      };
    }
    return {
      ...base,
      fromAccountId: fromAccountId || null,
      toAccountId: toAccountId || null,
      categoryId: null,
    };
  }

  async function save(andConfirm: boolean) {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }

    const input = buildInput();
    const validationError = validateTransactionForm(input, accounts);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setBusy(true);
    try {
      await updateTransaction(userId, txn!, input);
      if (andConfirm) {
        await verifyTransaction(userId, txn!.id);
        toast.success('Saved and confirmed.');
      } else {
        toast.success('Pending entry updated.');
      }
      onClose();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not save changes.'));
    } finally {
      setBusy(false);
    }
  }

  const title = isInvestment ? 'Edit SIP payment' : 'Edit before confirm';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      <Animated.View
        style={[
          styles.sheet,
          {paddingBottom: Math.max(insets.bottom, spacing.md)},
          sheetStyle,
        ]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <AppText style={styles.title}>{title}</AppText>
            <PressableScale onPress={onClose} scaleTo={0.9}>
              <View style={styles.closeBtn}>
                <IconClose size={18} color={colors.ink600} />
              </View>
            </PressableScale>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            {...keyboardAware}>
            <Field label="Name">
              <TextInput
                style={styles.input}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="SIP or payee name"
                placeholderTextColor={colors.ink400}
              />
            </Field>

            <Field label="Amount">
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.ink400}
              />
            </Field>

            {(isInvestment || isExpense || isTransfer) && (
              <Field label={isInvestment ? 'Paid from' : 'From account'}>
                <AccountChips
                  accounts={assetAccounts}
                  value={fromAccountId}
                  onChange={setFromAccountId}
                />
              </Field>
            )}

            {(isIncome || isTransfer) && (
              <Field label={isIncome ? 'Received in' : 'To account'}>
                <AccountChips
                  accounts={assetAccounts.filter(a => a.id !== fromAccountId)}
                  value={toAccountId}
                  onChange={setToAccountId}
                />
              </Field>
            )}

            {isExpense && (
              <Field label="Category">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  <View style={styles.chipRow}>
                    {expenseCategories.map(cat => {
                      const selected = categoryId === cat.id;
                      return (
                        <PressableScale
                          key={cat.id}
                          onPress={() => setCategoryId(cat.id)}
                          scaleTo={0.93}>
                          <View style={[styles.chip, selected && styles.chipActive]}>
                            <AppText
                              variant="xs"
                              style={[
                                styles.chipText,
                                selected && styles.chipTextActive,
                              ]}>
                              {cat.name}
                            </AppText>
                          </View>
                        </PressableScale>
                      );
                    })}
                  </View>
                </ScrollView>
              </Field>
            )}

            <Field label="Notes (optional)">
              <TextInput
                style={[styles.input, styles.notes]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Optional details"
                placeholderTextColor={colors.ink400}
              />
            </Field>
          </ScrollView>

          <View style={styles.actions}>
            <PressableScale
              onPress={() => save(false)}
              disabled={busy}
              style={styles.saveBtn}
              scaleTo={0.97}>
              <AppText style={styles.saveText}>{busy ? 'Saving…' : 'Save'}</AppText>
            </PressableScale>
            <PressableScale
              onPress={() => save(true)}
              disabled={busy}
              style={styles.confirmBtn}
              scaleTo={0.97}>
              <IconCheck size={18} color={colors.white} />
              <AppText style={styles.confirmText}>
                {busy ? 'Saving…' : 'Save & confirm'}
              </AppText>
            </PressableScale>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <View style={styles.field}>
      <AppText variant="sm" style={styles.label}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

function AccountChips({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.chipRow}>
        {accounts.map(account => (
          <PressableScale
            key={account.id}
            onPress={() => onChange(account.id)}
            scaleTo={0.93}>
            <View style={[styles.chip, value === account.id && styles.chipActive]}>
              <AppText
                variant="xs"
                style={[styles.chipText, value === account.id && styles.chipTextActive]}>
                {account.name}
              </AppText>
            </View>
          </PressableScale>
        ))}
      </View>
    </ScrollView>
  );
}

/** Whether this pending transaction can be edited in-app. */
export function isPendingEditable(txn: Transaction): boolean {
  return txn.type === 'INVESTMENT' || isQuickEditable(txn.type);
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 42, 34, 0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_H * 0.88,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginTop: 10,
    marginBottom: 6,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {fontSize: 18, fontWeight: '800', color: colors.ink900},
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md},
  field: {gap: 8},
  label: {fontWeight: '700', color: colors.ink700},
  input: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink900,
  },
  notes: {minHeight: 72, textAlignVertical: 'top'},
  chipRow: {flexDirection: 'row', gap: 8, paddingVertical: 2},
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {borderColor: colors.mint600, backgroundColor: colors.mint50},
  chipText: {fontWeight: '700', color: colors.ink600},
  chipTextActive: {color: colors.mint700},
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {fontWeight: '700', color: colors.ink700},
  confirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.mint500,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmText: {color: colors.white, fontWeight: '700'},
});
