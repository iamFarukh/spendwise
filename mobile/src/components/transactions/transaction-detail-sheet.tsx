import {useEffect, useState} from 'react';
import {Dimensions, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type {Category, Transaction} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {Tag, type TagTone} from '@/components/ui/tag';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconEdit, IconTrash} from '@/components/icons';
import {SPRINGS, TIMINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';
import {
  formatLedgerMoney,
  formatLedgerSignedMoney,
  type LedgerMoneySettings,
} from '@/lib/format/currency';
import {
  getTransactionTitle,
  getTransactionTone,
  getTransactionTypeLabel,
} from '@/lib/ledger/display';
import {getTransactionVisual} from '@/lib/ledger/transaction-visual';

const SCREEN_H = Dimensions.get('window').height;

const TONE_TAG: Record<'positive' | 'negative' | 'neutral', TagTone> = {
  positive: 'income',
  negative: 'expense',
  neutral: 'transfer',
};

type Props = {
  txn: Transaction | null;
  settings: LedgerMoneySettings;
  categoriesById: Map<string, Category>;
  accountName?: string;
  dateLabel: string;
  onClose: () => void;
  onDelete: (txn: Transaction) => void;
  onEdit: (txn: Transaction) => void;
};

export function TransactionDetailSheet({
  txn,
  settings,
  categoriesById,
  accountName,
  dateLabel,
  onClose,
  onDelete,
  onEdit,
}: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState<Transaction | null>(txn);
  const [mounted, setMounted] = useState(Boolean(txn));

  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (txn) {
      setCurrent(txn);
      setMounted(true);
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

  if (!mounted || !current) {
    return null;
  }

  const {icon, tone} = getTransactionVisual(current, categoriesById);
  const txnTone = getTransactionTone(current);
  const amount =
    txnTone === 'positive'
      ? formatLedgerSignedMoney(current.amount, settings)
      : txnTone === 'negative'
        ? formatLedgerSignedMoney(-current.amount, settings)
        : formatLedgerMoney(current.amount, settings);
  const categoryName = current.categoryId
    ? categoriesById.get(current.categoryId)?.name ?? '—'
    : '—';

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, {paddingBottom: insets.bottom + spacing.lg}, sheetStyle]}>
        <View style={styles.grip} />
        <View style={styles.iconWrap}>
          <IconBadge icon={icon} tone={tone} size="lg" />
        </View>
        <AppText
          style={[
            styles.amount,
            txnTone === 'positive' && {color: colors.income},
            txnTone === 'negative' && {color: colors.expense},
          ]}>
          {amount}
        </AppText>
        <AppText style={styles.title}>
          {getTransactionTitle(
            current,
            categoriesById.get(current.categoryId ?? '')?.name,
          )}
        </AppText>
        <View style={styles.tagRow}>
          <Tag tone={TONE_TAG[txnTone]} dot>
            {getTransactionTypeLabel(current.type)}
            {current.isGlobalExpense ? ' · counts as spending' : ''}
          </Tag>
        </View>

        <View style={styles.fields}>
          <Field label="Category" value={categoryName} />
          <Field label="Account" value={accountName ?? '—'} />
          <Field label="Date" value={dateLabel} />
          <Field
            label="Status"
            value={current.status === 'VERIFIED' ? 'Verified' : 'Pending'}
            valueColor={current.status === 'VERIFIED' ? colors.income : colors.pending}
          />
        </View>

        <View style={styles.actions}>
          <PressableScale onPress={() => onEdit(current)} style={styles.action}>
            <IconEdit size={19} color={colors.ink700} />
            <AppText style={styles.actionText}>Edit</AppText>
          </PressableScale>
          <PressableScale onPress={() => onDelete(current)} style={styles.action}>
            <IconTrash size={19} color={colors.expense} />
            <AppText style={[styles.actionText, {color: colors.expense}]}>
              Delete
            </AppText>
          </PressableScale>
        </View>
      </Animated.View>
    </View>
  );
}

function Field({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.field}>
      <AppText variant="sm" style={styles.fieldLabel}>
        {label}
      </AppText>
      <AppText style={[styles.fieldValue, valueColor ? {color: valueColor} : null]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,42,34,0.32)'},
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  grip: {width: 42, height: 5, borderRadius: radius.pill, backgroundColor: colors.ink300, alignSelf: 'center', marginBottom: 14},
  iconWrap: {alignItems: 'center', marginBottom: 8},
  amount: {textAlign: 'center', fontWeight: '700', fontSize: 34, letterSpacing: -1, color: colors.ink900, fontVariant: ['tabular-nums']},
  title: {textAlign: 'center', fontWeight: '700', fontSize: 18, color: colors.ink900, marginTop: 2, marginBottom: 10},
  tagRow: {alignItems: 'center', marginBottom: spacing.md},
  fields: {gap: 0},
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  fieldLabel: {color: colors.ink500, fontWeight: '600'},
  fieldValue: {fontWeight: '700', color: colors.ink900},
  actions: {flexDirection: 'row', gap: spacing.sm, marginTop: 14},
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionText: {fontWeight: '700', color: colors.ink700, fontSize: 15},
});
