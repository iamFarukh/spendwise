import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolateColor,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import {
  toDateStringInTimezone,
  validateTransactionForm,
  type ManualTransactionType,
  type Transaction,
  type TransactionFormInput,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconCheck, IconClose, IconGrid} from '@/components/icons';
import {Lottie} from '@/components/motion/lottie';
import {PressableScale} from '@/components/motion/pressable-scale';
import {CategoryTick} from '@/components/transactions/category-tick';
import {SegmentedControl} from '@/components/ui/segmented-control';
import {SPRINGS, TIMINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useCategories} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {createCategory} from '@/lib/categories/service';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {formatLedgerMoney} from '@/lib/format/currency';
import {getAccountVisual} from '@/lib/ledger/account-display';
import {getCategoryVisual} from '@/lib/ledger/category-display';
import {useToast} from '@/providers/toast-provider';
import {saveTransaction, updateTransaction} from '@/lib/transactions/service';
import {type BadgeTone} from '@/components/ui/icon-badge';

const SCREEN_H = Dimensions.get('window').height;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
/** Approximate keypad block height — refined via onLayout. */
const KEYPAD_HEIGHT_ESTIMATE = 252;

/**
 * Smooth height changes when switching Spend / Received / Transfer and when the
 * custom-category field reveals. Critically damped (no overshoot) and quick so
 * it settles inside the keyboard's rise window — otherwise the fields keep
 * springing after the keyboard has finished, which reads as a second motion.
 */
const FIELDS_LAYOUT = LinearTransition.springify()
  .damping(26)
  .stiffness(240)
  .mass(0.7);

const TAB_ENTER = FadeIn.duration(240);
const TAB_EXIT = FadeOut.duration(170);

type QuickTxnType = Extract<ManualTransactionType, 'EXPENSE' | 'INCOME' | 'TRANSFER'>;

export type QuickAddInitialType = QuickTxnType;

/** Whether a transaction's type can be represented/edited in this sheet. */
export function isQuickEditable(type: string): type is QuickTxnType {
  return type === 'EXPENSE' || type === 'INCOME' || type === 'TRANSFER';
}

type QuickAddSheetProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
  /** When set, the sheet edits this transaction instead of creating one. */
  editTxn?: Transaction | null;
  /** Preset type when creating (e.g. FAB long-press menu). */
  initialType?: QuickAddInitialType;
  /** Prefill fields for duplicate-without-edit mode. */
  prefillFrom?: Transaction | null;
};

const TYPE_OPTIONS: Array<{value: QuickTxnType; label: string}> = [
  {value: 'EXPENSE', label: 'Spend'},
  {value: 'INCOME', label: 'Received'},
  {value: 'TRANSFER', label: 'Transfer'},
];

const SAVE_LABEL: Record<QuickTxnType, string> = {
  EXPENSE: 'Save expense',
  INCOME: 'Save received',
  TRANSFER: 'Save transfer',
};

const AMOUNT_COLOR: Record<QuickTxnType, string> = {
  EXPENSE: colors.ink900,
  INCOME: colors.income,
  TRANSFER: colors.transfer,
};

const SAVE_COLOR: Record<QuickTxnType, string> = {
  EXPENSE: colors.mint500,
  INCOME: colors.income,
  TRANSFER: colors.transfer,
};

const CHIP_ICON_COLOR: Record<BadgeTone, string> = {
  mint: colors.mint700,
  income: colors.income,
  expense: colors.expense,
  invest: colors.invest,
  transfer: colors.transfer,
  pending: colors.pending,
};

export function QuickAddSheet({
  visible,
  userId,
  onClose,
  editTxn,
  initialType,
  prefillFrom,
}: QuickAddSheetProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const {settings} = useUserSettings();
  const {accounts} = useAccounts();
  const {categories} = useCategories();

  const [mounted, setMounted] = useState(false);
  const [txnType, setTxnType] = useState<QuickTxnType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customCategory, setCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [saveCustomCategory, setSaveCustomCategory] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [incomeSource, setIncomeSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [savedSubtitle, setSavedSubtitle] = useState('');
  /** A free-text field (custom category / income source) owns the input. */
  const [textInputActive, setTextInputActive] = useState(false);

  const customInputRef = useRef<TextInput>(null);
  const incomeInputRef = useRef<TextInput>(null);
  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);
  const keyboard = useAnimatedKeyboard();
  const typeProgress = useSharedValue(0);
  const keypadHeight = useSharedValue(KEYPAD_HEIGHT_ESTIMATE);

  const assetAccounts = useMemo(
    () => accounts.filter(account => account.class === 'ASSET'),
    [accounts],
  );

  const primaryAccount = useMemo(() => {
    return (
      assetAccounts.find(a => a.id === settings?.primaryAccountId) ??
      assetAccounts.find(a => a.isPrimary) ??
      assetAccounts[0] ??
      null
    );
  }, [assetAccounts, settings?.primaryAccountId]);

  const numericAmount = Number(amount) || 0;

  function resetAccountDefaults() {
    const primaryId = primaryAccount?.id ?? '';
    const otherId =
      assetAccounts.find(account => account.id !== primaryId)?.id ?? '';
    setFromAccountId(primaryId);
    setToAccountId(otherId || primaryId);
  }

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setSavedSubtitle('');
      setDone(false);
      setCustomCategory(false);
      setCustomCategoryName('');
      setSaveCustomCategory(false);
      setTextInputActive(false);
      if (editTxn && isQuickEditable(editTxn.type)) {
        // Edit mode — prefill from the existing transaction.
        setTxnType(editTxn.type);
        setAmount(editTxn.amount ? String(editTxn.amount) : '');
        setCategoryId(editTxn.categoryId ?? '');
        setIncomeSource(editTxn.merchant ?? '');
        setFromAccountId(editTxn.fromAccountId ?? '');
        setToAccountId(editTxn.toAccountId ?? '');
      } else if (prefillFrom && isQuickEditable(prefillFrom.type)) {
        setTxnType(prefillFrom.type);
        setAmount(prefillFrom.amount ? String(prefillFrom.amount) : '');
        setCategoryId(prefillFrom.categoryId ?? '');
        setIncomeSource(prefillFrom.merchant ?? '');
        setFromAccountId(prefillFrom.fromAccountId ?? '');
        setToAccountId(prefillFrom.toAccountId ?? '');
      } else {
        setTxnType(initialType ?? 'EXPENSE');
        setAmount('');
        setCategoryId('');
        setIncomeSource('');
        resetAccountDefaults();
      }
      backdrop.value = withTiming(1, TIMINGS.base);
      translateY.value = reduceMotion
        ? withTiming(0, TIMINGS.base)
        : withSpring(0, SPRINGS.heavy);
    } else if (mounted) {
      customInputRef.current?.blur();
      incomeInputRef.current?.blur();
      Keyboard.dismiss();
      backdrop.value = withTiming(0, TIMINGS.exit);
      translateY.value = withTiming(SCREEN_H, TIMINGS.exit, finished => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    // Don't clobber the edit / duplicate prefill's accounts.
    if (visible && primaryAccount && !editTxn && !prefillFrom) {
      resetAccountDefaults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, primaryAccount?.id, assetAccounts.length]);

  // Premium keyboard handling — NO layout animation, single keyboard clock.
  //
  // The numeric keypad lives at the very bottom of the sheet (below the Save
  // row), so it occupies the exact slot the system keyboard will fill. When the
  // keyboard rises it simply slides *over* the keypad — the keypad never resizes
  // or reflows. We only lift the sheet by the amount the keyboard overshoots the
  // keypad (`keyboard.height − keypadHeight`), so the Save row ends up resting
  // right on top of the keyboard. Below that threshold the sheet doesn't move at
  // all — the keyboard is still shorter than the keypad it's covering. Pure
  // transform, driven entirely by `keyboard.height`, so it tracks the OS
  // keyboard curve frame-for-frame with zero jump.
  const sheetStyle = useAnimatedStyle(() => {
    const lift = Math.max(0, keyboard.height.value - keypadHeight.value);
    return {transform: [{translateY: translateY.value - lift}]};
  });
  const backdropStyle = useAnimatedStyle(() => ({opacity: backdrop.value}));
  const amountColorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      typeProgress.value,
      [0, 1, 2],
      [AMOUNT_COLOR.EXPENSE, AMOUNT_COLOR.INCOME, AMOUNT_COLOR.TRANSFER],
    ),
  }));
  const saveColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      typeProgress.value,
      [0, 1, 2],
      [SAVE_COLOR.EXPENSE, SAVE_COLOR.INCOME, SAVE_COLOR.TRANSFER],
    ),
  }));
  // The keypad doesn't move or resize — the rising keyboard covers it. We only
  // cross-fade it out as the keyboard climbs over it (opacity is GPU-composited,
  // never a layout pass), so the hand-off from keypad to keyboard reads as one
  // dissolve. Same keyboard clock, so it stays in sync with the slide.
  const keypadStyle = useAnimatedStyle(() => {
    const k = keypadHeight.value;
    const t = k > 0 ? Math.min(1, keyboard.height.value / (k * 0.6)) : 0;
    return {opacity: 1 - t};
  });

  useEffect(() => {
    const target =
      txnType === 'EXPENSE' ? 0 : txnType === 'INCOME' ? 1 : 2;
    typeProgress.value = withTiming(target, TIMINGS.base);
  }, [txnType, typeProgress]);

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

  // Enter text mode: flip the input live (so `showSoftInputOnFocus` is true),
  // then focus on the next committed frame. The keyboard rises and the keypad
  // folds together — the keypad collapse is derived from `keyboard.height`, so
  // there is nothing to sequence and no visible gap. Two rAFs cover the case
  // where the target input was only just mounted (custom category field).
  function activateTextInput(ref: RefObject<TextInput | null>) {
    setTextInputActive(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => ref.current?.focus());
    });
  }

  // Leave text mode: dismissing the keyboard lets `keyboard.height` fall to 0,
  // which restores the keypad in sync — no timers required.
  function dismissTextInput() {
    setTextInputActive(false);
    customInputRef.current?.blur();
    incomeInputRef.current?.blur();
    Keyboard.dismiss();
  }

  function switchTxnType(type: QuickTxnType) {
    if (type === txnType) {
      return;
    }
    setTxnType(type);
    setCategoryId('');
    setCustomCategory(false);
    setCustomCategoryName('');
    setSaveCustomCategory(false);
    setIncomeSource('');
    dismissTextInput();

    const primaryId = primaryAccount?.id ?? '';
    if (type === 'EXPENSE') {
      setFromAccountId(current => current || primaryId);
    } else if (type === 'INCOME') {
      setToAccountId(current => current || primaryId);
    } else {
      const otherId =
        assetAccounts.find(account => account.id !== primaryId)?.id ?? '';
      setFromAccountId(primaryId);
      setToAccountId(otherId || primaryId);
    }
  }

  function selectCategory(id: string) {
    setCustomCategory(false);
    setCustomCategoryName('');
    setSaveCustomCategory(false);
    setCategoryId(id);
    dismissTextInput();
  }

  function selectCustomCategory() {
    setCustomCategory(true);
    setCategoryId('');
    setSaveCustomCategory(false);
    activateTextInput(customInputRef);
  }

  function focusIncomeInput() {
    if (textInputActive) {
      incomeInputRef.current?.focus();
      return;
    }
    activateTextInput(incomeInputRef);
  }

  function selectFromAccount(id: string) {
    setFromAccountId(id);
    if (id === toAccountId) {
      const other = assetAccounts.find(account => account.id !== id);
      setToAccountId(other?.id ?? '');
    }
  }

  function selectToAccount(id: string) {
    setToAccountId(id);
    if (id === fromAccountId) {
      const other = assetAccounts.find(account => account.id !== id);
      setFromAccountId(other?.id ?? '');
    }
  }

  // Stable so the memoized <Keypad> never re-renders while you type (setAmount
  // is a stable updater) — typing only updates the amount text node, not the
  // 12 keys + their gestures.
  const pressKey = useCallback((key: string) => {
    setAmount(current => {
      if (key === 'del') {
        return current.slice(0, -1);
      }
      if (key === '.') {
        return current.includes('.') ? current : current === '' ? '0.' : current + '.';
      }
      if (current.includes('.') && current.split('.')[1]?.length >= 2) {
        return current;
      }
      return current + key;
    });
  }, []);

  async function handleSave() {
    if (!settings) {
      return;
    }

    if (numericAmount <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }

    if (txnType === 'EXPENSE') {
      if (customCategory) {
        if (!customCategoryName.trim()) {
          toast.error('Enter where you spent.');
          return;
        }
      } else if (!categoryId) {
        toast.error('Choose a category.');
        return;
      }
      if (!fromAccountId) {
        toast.error('Choose which account to pay from.');
        return;
      }
    }

    if (txnType === 'INCOME' && !toAccountId) {
      toast.error('Choose which account received this.');
      return;
    }

    if (txnType === 'TRANSFER') {
      if (!fromAccountId || !toAccountId) {
        toast.error('Choose both accounts.');
        return;
      }
      if (fromAccountId === toAccountId) {
        toast.error('Accounts must be different.');
        return;
      }
    }

    setBusy(true);
    try {
      let resolvedCategoryId = categoryId;
      let resolvedCategoryName =
        categories.find(category => category.id === categoryId)?.name ?? '';
      let customMerchant = '';

      if (txnType === 'EXPENSE' && customCategory) {
        const name = customCategoryName.trim();
        resolvedCategoryName = name;
        if (saveCustomCategory) {
          // Opted in — create a reusable category for next time.
          resolvedCategoryId = await createCategory(userId, {
            name,
            icon: 'grid',
            color: 'expense',
          });
        } else {
          // One-off: keep it out of the category list. Record the label as the
          // merchant (it shows as the row title) and file it under a general
          // expense bucket so the ledger still has a valid category.
          const fallbackId =
            categories.find(category => category.id === 'other')?.id ??
            categories.find(
              category => !category.system && category.color === 'expense',
            )?.id ??
            categories.find(category => !category.system)?.id ??
            null;
          if (fallbackId) {
            resolvedCategoryId = fallbackId;
            customMerchant = name;
          } else {
            // No general bucket exists — fall back to creating the category.
            resolvedCategoryId = await createCategory(userId, {
              name,
              icon: 'grid',
              color: 'expense',
            });
          }
        }
      }

      const input: TransactionFormInput = {
        type: txnType,
        amount: numericAmount,
        date: toDateStringInTimezone(new Date(), settings.timezone),
        status: 'VERIFIED',
        ...(txnType === 'EXPENSE' && {
          fromAccountId,
          categoryId: resolvedCategoryId,
          ...(customMerchant ? {merchant: customMerchant} : {}),
        }),
        ...(txnType === 'INCOME' && {
          toAccountId,
          merchant: incomeSource.trim(),
        }),
        ...(txnType === 'TRANSFER' && {
          fromAccountId,
          toAccountId,
        }),
      };

      const validationError = validateTransactionForm(input, accounts);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      if (editTxn) {
        await updateTransaction(userId, editTxn, input);
      } else {
        await saveTransaction(userId, input);
      }

      const fromName =
        accounts.find(account => account.id === fromAccountId)?.name ?? '';
      const toName =
        accounts.find(account => account.id === toAccountId)?.name ?? '';

      if (txnType === 'EXPENSE') {
        setSavedSubtitle(
          `${formatLedgerMoney(numericAmount, settings)} · ${resolvedCategoryName} · ${fromName}`,
        );
      } else if (txnType === 'INCOME') {
        const source = incomeSource.trim();
        setSavedSubtitle(
          source
            ? `${formatLedgerMoney(numericAmount, settings)} · ${source} → ${toName}`
            : `${formatLedgerMoney(numericAmount, settings)} → ${toName}`,
        );
      } else {
        setSavedSubtitle(
          `${formatLedgerMoney(numericAmount, settings)} · ${fromName} → ${toName}`,
        );
      }

      setDone(true);
      Keyboard.dismiss();
      setTimeout(onClose, 1150);
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not save transaction.'));
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return null;
  }

  const currency = settings?.baseCurrency ?? 'INR';
  const transferTargets = assetAccounts.filter(
    account => account.id !== fromAccountId,
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        {done ? (
          <Animated.View
            entering={ZoomIn.springify().damping(12).stiffness(180)}
            style={styles.success}>
            <Lottie name="caught-up" size={150} loop={false} />
            <AppText variant="h2">Saved</AppText>
            <AppText variant="body" muted style={styles.successSubtitle}>
              {savedSubtitle}
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
              <AppText variant="h3">
                {editTxn ? 'Edit transaction' : 'Quick add'}
              </AppText>
              <PressableScale onPress={onClose} hitSlop={12}>
                <IconClose size={22} color={colors.ink400} />
              </PressableScale>
            </View>

            <View style={styles.typeWrap}>
              <SegmentedControl
                options={TYPE_OPTIONS}
                value={txnType}
                onChange={switchTxnType}
              />
            </View>

            <View style={styles.amountWrap}>
              <AppText variant="h1" style={styles.amountCurrency}>
                {currency === 'INR' ? '₹' : ''}
              </AppText>
              <Animated.Text style={[styles.amountValue, amountColorStyle]}>
                {amount === '' ? '0' : amount}
              </Animated.Text>
            </View>

            <Animated.View layout={FIELDS_LAYOUT} style={styles.fieldsSlot}>
            {txnType === 'EXPENSE' ? (
              <Animated.View
                key="expense-fields"
                entering={TAB_ENTER}
                exiting={TAB_EXIT}>
                <AppText variant="xs" muted style={styles.fieldLabel}>
                  Paid from
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                  keyboardShouldPersistTaps="handled">
                  {assetAccounts.map(account => {
                    const selected = account.id === fromAccountId;
                    const {icon: AccountIcon, tone} = getAccountVisual(account);
                    return (
                      <PressableScale
                        key={account.id}
                        onPress={() => setFromAccountId(account.id)}
                        scaleTo={0.92}>
                        <View
                          style={[
                            styles.chip,
                            styles.chipAccount,
                            selected && styles.chipActive,
                          ]}>
                          <AccountIcon
                            size={14}
                            color={
                              selected ? colors.white : CHIP_ICON_COLOR[tone]
                            }
                          />
                          <AppText
                            variant="sm"
                            style={[
                              styles.chipText,
                              selected && styles.chipTextActive,
                            ]}>
                            {account.name}
                          </AppText>
                        </View>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
                <AppText variant="xs" muted style={styles.fieldLabelSpaced}>
                  Category
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                  keyboardShouldPersistTaps="handled">
                  {categories.map(category => {
                    const selected = !customCategory && category.id === categoryId;
                    const {icon: CategoryIcon, tone} = getCategoryVisual(category);
                    return (
                      <PressableScale
                        key={category.id}
                        onPress={() => selectCategory(category.id)}
                        scaleTo={0.92}>
                        <View
                          style={[
                            styles.chip,
                            styles.chipCategory,
                            selected && styles.chipActive,
                          ]}>
                          <CategoryIcon
                            size={14}
                            color={
                              selected ? colors.white : CHIP_ICON_COLOR[tone]
                            }
                          />
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
                  <PressableScale onPress={selectCustomCategory} scaleTo={0.92}>
                    <View
                      style={[
                        styles.chip,
                        styles.chipCategory,
                        customCategory && styles.chipActive,
                      ]}>
                      <IconGrid
                        size={14}
                        color={customCategory ? colors.white : colors.ink500}
                      />
                      <AppText
                        variant="sm"
                        style={[
                          styles.chipText,
                          customCategory && styles.chipTextActive,
                        ]}>
                        Custom
                      </AppText>
                    </View>
                  </PressableScale>
                </ScrollView>

                {customCategory ? (
                  <Animated.View entering={FadeIn.duration(180)}>
                    <Pressable
                      style={styles.fieldWrap}
                      onPress={() => {
                        if (!textInputActive) {
                          activateTextInput(customInputRef);
                        }
                      }}>
                      <TextInput
                        ref={customInputRef}
                        value={customCategoryName}
                        onChangeText={setCustomCategoryName}
                        placeholder="Where did you spend? e.g. Coffee, Gym"
                        placeholderTextColor={colors.ink400}
                        returnKeyType="done"
                        autoCapitalize="words"
                        autoCorrect={false}
                        showSoftInputOnFocus={textInputActive}
                        onBlur={() => setTextInputActive(false)}
                        style={styles.textInput}
                        pointerEvents={textInputActive ? 'auto' : 'none'}
                      />
                    </Pressable>
                  </Animated.View>
                ) : null}
              </Animated.View>
            ) : null}

            {txnType === 'INCOME' ? (
              <Animated.View
                key="income-fields"
                entering={TAB_ENTER}
                exiting={TAB_EXIT}>
                <AppText variant="xs" muted style={styles.fieldLabel}>
                  Received into
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                  keyboardShouldPersistTaps="handled">
                  {assetAccounts.map(account => {
                    const selected = account.id === toAccountId;
                    return (
                      <PressableScale
                        key={account.id}
                        onPress={() => setToAccountId(account.id)}
                        scaleTo={0.92}>
                        <View style={[styles.chip, selected && styles.chipIncome]}>
                          <AppText
                            variant="sm"
                            style={[
                              styles.chipText,
                              selected && styles.chipTextActive,
                            ]}>
                            {account.name}
                          </AppText>
                        </View>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
                <Pressable style={styles.fieldWrap} onPress={focusIncomeInput}>
                  <TextInput
                    ref={incomeInputRef}
                    value={incomeSource}
                    onChangeText={setIncomeSource}
                    placeholder="Received from? e.g. Salary, Friend"
                    placeholderTextColor={colors.ink400}
                    returnKeyType="done"
                    autoCapitalize="words"
                    autoCorrect={false}
                    showSoftInputOnFocus={textInputActive}
                    onBlur={() => setTextInputActive(false)}
                    style={styles.textInput}
                    pointerEvents={textInputActive ? 'auto' : 'none'}
                  />
                </Pressable>
              </Animated.View>
            ) : null}

            {txnType === 'TRANSFER' ? (
              <Animated.View
                key="transfer-fields"
                entering={TAB_ENTER}
                exiting={TAB_EXIT}>
                <AppText variant="xs" muted style={styles.fieldLabel}>
                  From
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                  keyboardShouldPersistTaps="handled">
                  {assetAccounts.map(account => {
                    const selected = account.id === fromAccountId;
                    return (
                      <PressableScale
                        key={account.id}
                        onPress={() => selectFromAccount(account.id)}
                        scaleTo={0.92}>
                        <View style={[styles.chip, selected && styles.chipTransfer]}>
                          <AppText
                            variant="sm"
                            style={[
                              styles.chipText,
                              selected && styles.chipTextActive,
                            ]}>
                            {account.name}
                          </AppText>
                        </View>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
                <AppText variant="xs" muted style={styles.fieldLabel}>
                  To
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                  keyboardShouldPersistTaps="handled">
                  {transferTargets.map(account => {
                    const selected = account.id === toAccountId;
                    return (
                      <PressableScale
                        key={account.id}
                        onPress={() => selectToAccount(account.id)}
                        scaleTo={0.92}>
                        <View style={[styles.chip, selected && styles.chipTransfer]}>
                          <AppText
                            variant="sm"
                            style={[
                              styles.chipText,
                              selected && styles.chipTextActive,
                            ]}>
                            {account.name}
                          </AppText>
                        </View>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            ) : null}
            </Animated.View>

            <View style={styles.footerRow}>
              {txnType === 'EXPENSE' && customCategory ? (
                <Animated.View
                  entering={ZoomIn.springify().damping(15).stiffness(220)}
                  exiting={ZoomOut.duration(140)}
                  layout={FIELDS_LAYOUT}>
                  <CategoryTick
                    checked={saveCustomCategory}
                    onChange={setSaveCustomCategory}
                  />
                </Animated.View>
              ) : null}
              <Animated.View style={styles.saveFlex} layout={FIELDS_LAYOUT}>
                <PressableScale onPress={handleSave} disabled={busy}>
                  <Animated.View style={[styles.saveBtn, saveColorStyle]}>
                    <IconCheck size={20} color={colors.white} strokeWidth={2.4} />
                    <AppText variant="body" style={styles.saveText}>
                      {busy
                        ? 'Saving…'
                        : editTxn
                          ? 'Save changes'
                          : SAVE_LABEL[txnType]}
                    </AppText>
                  </Animated.View>
                </PressableScale>
              </Animated.View>
            </View>

            <Animated.View
              style={[styles.keypadWrap, keypadStyle, {paddingBottom: insets.bottom}]}
              pointerEvents={textInputActive ? 'none' : 'auto'}
              onLayout={event => {
                const measured = event.nativeEvent.layout.height;
                if (measured > 0) {
                  keypadHeight.value = measured;
                }
              }}>
              <Keypad onKey={pressKey} />
            </Animated.View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

/** The numeric keypad — isolated + memoized so typing (which re-renders the
 * sheet) never re-renders the 12 keys; only the amount text updates. */
const Keypad = memo(function Keypad({onKey}: {onKey: (key: string) => void}) {
  return (
    <View style={styles.keypad}>
      {KEYS.map(key => (
        <PressableScale
          key={key}
          onPress={() => onKey(key)}
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
  );
});

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
  typeWrap: {marginBottom: spacing.sm},
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
  },
  amountCurrency: {color: colors.ink400},
  amountValue: {
    fontSize: 52,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  fieldsSlot: {
    overflow: 'hidden',
    minHeight: 132,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  fieldLabelSpaced: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chips: {gap: spacing.sm, paddingVertical: spacing.sm, paddingRight: spacing.lg},
  fieldWrap: {marginBottom: spacing.sm},
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveFlex: {flex: 1},
  textInput: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink900,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipAccount: {
    backgroundColor: colors.mint50,
    borderColor: colors.mint200,
  },
  chipCategory: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
  },
  chipActive: {backgroundColor: colors.mint500, borderColor: colors.mint500},
  chipIncome: {backgroundColor: colors.income, borderColor: colors.income},
  chipTransfer: {backgroundColor: colors.transfer, borderColor: colors.transfer},
  chipText: {color: colors.ink600, fontWeight: '600'},
  chipTextActive: {color: colors.white},
  // Sits at the very bottom of the sheet so the rising keyboard slides over it.
  keypadWrap: {marginTop: spacing.sm},
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  keyWrap: {width: '33.333%', paddingVertical: spacing.xs},
  key: {alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md},
  keyText: {fontSize: 26, fontWeight: '600', color: colors.ink900},
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  saveText: {color: colors.white, fontWeight: '700'},
  success: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl},
  successSubtitle: {textAlign: 'center'},
});
