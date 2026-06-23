import {memo, useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {Transaction, TransactionSource} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {PendingSkeleton} from '@/components/motion/screen-skeletons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconCheck, IconChevronDown, IconEdit, IconShield} from '@/components/icons';
import {
  isPendingEditable,
  PendingEditSheet,
} from '@/components/transactions/pending-edit-sheet';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useCategories, useTransactions} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {
  formatLedgerSignedMoney,
  type LedgerMoneySettings,
} from '@/lib/format/currency';
import {
  getTransactionAccountLabel,
  getTransactionTitle,
  getTransactionTone,
} from '@/lib/ledger/display';
import {getTransactionVisual} from '@/lib/ledger/transaction-visual';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {verifyTransaction} from '@/lib/transactions/service';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';
import type {Category} from '@pfos/shared';
import type {MainStackParamList} from '@/navigation/types';

const SOURCE_LABEL: Partial<Record<TransactionSource, string>> = {
  SMS: 'SMS',
  NOTIFICATION: 'Notification',
  RECURRING: 'Recurring',
  RECONCILIATION: 'Reconcile',
  MANUAL: 'Manual',
};

export function PendingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {user} = useAuth();
  const toast = useToast();
  const {transactions, loading} = useTransactions();
  const {categories} = useCategories();
  const {accounts} = useAccounts();
  const {settings} = useUserSettings();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);

  const categoriesById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  );
  const accountsById = useMemo(
    () => new Map(accounts.map(a => [a.id, a])),
    [accounts],
  );
  // SIP (INVESTMENT) pending entries are approved/skipped via the Action
  // Center — keep Pending focused on non-SIP review so they never double up.
  const pending = useMemo(
    () => transactions.filter(tx => tx.status === 'PENDING' && tx.type !== 'INVESTMENT'),
    [transactions],
  );

  // Stable handlers so the memoized ReviewCard only re-renders the row whose
  // `busy` flips, not every pending card, while one is confirming.
  const confirm = useCallback(
    async (id: string) => {
      if (!user) {
        return;
      }
      setBusyId(id);
      try {
        await verifyTransaction(user.uid, id);
        toast.success('Confirmed — it’s in your ledger now.');
      } catch (err) {
        toast.error(getFirestoreErrorMessage(err, 'Could not confirm.'));
      } finally {
        setBusyId(null);
      }
    },
    [toast, user],
  );

  const openEdit = useCallback(
    (txn: Transaction) => {
      if (!isPendingEditable(txn)) {
        toast.notify('This entry cannot be edited here.');
        return;
      }
      setEditTxn(txn);
    },
    [toast],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Pending review"
        subtitle={
          pending.length > 0
            ? `${pending.length} ${
                pending.length === 1 ? 'needs' : 'need'
              } your attention`
            : 'Nothing to review'
        }
        titleSize={20}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        {loading && pending.length === 0 ? (
          <PendingSkeleton />
        ) : pending.length === 0 ? (
          <View style={styles.empty}>
            <Lottie name="caught-up" size={170} />
            <AppText variant="h3">All caught up</AppText>
            <AppText variant="body" muted>
              Nothing is waiting on you.
            </AppText>
          </View>
        ) : (
          <>
            <FadeInView index={0}>
              <View style={styles.banner}>
                <IconShield size={22} color={colors.mint600} />
                <AppText variant="sm" style={styles.bannerText}>
                  Tap ✓ to confirm. SIP payments appear here automatically on
                  their due date.
                </AppText>
              </View>
            </FadeInView>

            {pending.map((txn, index) => (
              <FadeInView key={txn.id} index={index + 1}>
                <ReviewCard
                  txn={txn}
                  category={
                    txn.categoryId ? categoriesById.get(txn.categoryId) : undefined
                  }
                  categoriesById={categoriesById}
                  accountsById={accountsById}
                  settings={settings}
                  busy={busyId === txn.id}
                  onEdit={openEdit}
                  onConfirm={confirm}
                />
              </FadeInView>
            ))}
          </>
        )}
      </ScrollView>

      {user && editTxn ? (
        <PendingEditSheet
          txn={editTxn}
          userId={user.uid}
          onClose={() => setEditTxn(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const ReviewCard = memo(function ReviewCard({
  txn,
  category,
  categoriesById,
  accountsById,
  settings,
  busy,
  onEdit,
  onConfirm,
}: {
  txn: Transaction;
  category: Category | undefined;
  categoriesById: Map<string, Category>;
  accountsById: Map<string, {name: string}>;
  settings: LedgerMoneySettings;
  busy: boolean;
  onEdit: (txn: Transaction) => void;
  onConfirm: (id: string) => void;
}) {
  const {icon, tone} = getTransactionVisual(txn, categoriesById);
  const txnTone = getTransactionTone(txn);
  const signedAmount =
    txnTone === 'positive'
      ? formatLedgerSignedMoney(txn.amount, settings)
      : formatLedgerSignedMoney(-txn.amount, settings);
  const isInvestment = txn.type === 'INVESTMENT';
  const categoryLocked = txn.type === 'INCOME';
  const accountLabel = getTransactionAccountLabel(txn, accountsById);

  const actionLabel = categoryLocked
    ? 'Income · category locked'
    : isInvestment
      ? accountLabel
        ? `${accountLabel} · SIP`
        : 'Choose account · tap to edit'
      : category?.name ?? 'Choose category';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <IconBadge icon={icon} tone={tone} size="md" />
        <View style={styles.cardName}>
          <AppText style={styles.cardTitle} numberOfLines={1}>
            {getTransactionTitle(txn, category?.name)}
          </AppText>
          <View style={styles.metaRow}>
            <View style={styles.srcPill}>
              <AppText style={styles.srcPillText}>
                {SOURCE_LABEL[txn.source] ?? 'Captured'}
              </AppText>
            </View>
            <AppText variant="xs" muted>
              verify amount
            </AppText>
          </View>
        </View>
        <AppText
          style={[
            styles.amount,
            txnTone === 'positive' ? {color: colors.income} : {color: colors.expense},
          ]}>
          {signedAmount}
        </AppText>
      </View>

      <PressableScale
        onPress={categoryLocked ? undefined : () => onEdit(txn)}
        disabled={categoryLocked}
        style={[styles.suggest, categoryLocked && styles.suggestLocked]}
        scaleTo={0.98}>
        <IconBadge icon={icon} tone={tone} size="sm" />
        <AppText variant="sm" style={styles.suggestText} numberOfLines={1}>
          {actionLabel}
        </AppText>
        {categoryLocked ? null : (
          <IconChevronDown size={15} color={colors.ink400} />
        )}
      </PressableScale>

      <View style={styles.actions}>
        <PressableScale onPress={() => onEdit(txn)} style={styles.editBtn} scaleTo={0.92}>
          <IconEdit size={18} color={colors.ink700} />
        </PressableScale>
        <PressableScale
          onPress={() => onConfirm(txn.id)}
          disabled={busy}
          style={styles.confirmBtn}
          scaleTo={0.97}>
          <IconCheck size={18} color={colors.white} strokeWidth={2.4} />
          <AppText style={styles.confirmText}>
            {busy ? 'Confirming…' : 'Confirm'}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.sm},
  empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl * 2},
  banner: {
    flexDirection: 'row',
    gap: 11,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.mint200,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: spacing.xs,
  },
  bannerText: {flex: 1, color: colors.ink700, lineHeight: 19},
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.pending,
    borderRadius: radius.lg,
    padding: 15,
  },
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 13},
  cardName: {flex: 1, minWidth: 0},
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.ink900},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3},
  srcPill: {
    backgroundColor: colors.investBg,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  srcPillText: {
    color: colors.invest,
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  amount: {fontWeight: '700', fontSize: 19, fontVariant: ['tabular-nums']},
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: colors.mint300,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    backgroundColor: colors.mint50,
  },
  suggestLocked: {
    borderStyle: 'solid',
    borderColor: colors.line,
    backgroundColor: colors.canvas,
  },
  suggestText: {flex: 1, fontWeight: '700', color: colors.ink700},
  actions: {flexDirection: 'row', gap: 9, marginTop: 12},
  editBtn: {
    width: 44,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.mint500,
  },
  confirmText: {color: colors.white, fontWeight: '700', fontSize: 13},
});
