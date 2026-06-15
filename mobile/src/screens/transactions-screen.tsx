import {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  LinearTransition,
  SlideOutRight,
} from 'react-native-reanimated';

import {QuickAddSheet} from '@/components/transactions/quick-add-sheet';
import {SwipeableTransactionRow} from '@/components/transactions/swipeable-transaction-row';
import {AppText} from '@/components/ui/app-text';
import {Fab} from '@/components/motion/fab';
import {Lottie} from '@/components/motion/lottie';
import {RowSkeleton} from '@/components/motion/skeleton';
import {STAGGER_STEP} from '@/constants/motion';
import {colors, spacing} from '@/constants/theme';
import {useCategories, useTransactions} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {deleteTransaction, verifyTransaction} from '@/lib/transactions/service';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';

export function TransactionsScreen() {
  const {user} = useAuth();
  const toast = useToast();
  const {transactions, loading, error} = useTransactions();
  const {categories} = useCategories();
  const {settings} = useUserSettings();
  const [quickAdd, setQuickAdd] = useState(false);

  const categoriesById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  );

  const sorted = useMemo(
    () =>
      [...transactions]
        .filter(t => t.type !== 'OPENING')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );

  async function handleDelete(id: string) {
    if (!user) {
      return;
    }
    try {
      await deleteTransaction(user.uid, id);
      toast.success('Transaction deleted.');
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not delete.'));
    }
  }

  async function handleVerify(id: string) {
    if (!user) {
      return;
    }
    try {
      await verifyTransaction(user.uid, id);
      toast.success('Transaction confirmed.');
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not confirm.'));
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppText variant="h1" style={styles.title}>
          Activity
        </AppText>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <RowSkeleton key={i} />
        ))}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Animated.FlatList
        data={sorted}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        itemLayoutAnimation={LinearTransition.springify().damping(20)}
        ListHeaderComponent={
          <AppText variant="h1" style={styles.title}>
            Activity
          </AppText>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Lottie name="receipt-search" size={150} />
            <AppText variant="body" muted>
              {error ?? 'No transactions yet. Tap + to add one.'}
            </AppText>
          </View>
        }
        renderItem={({item, index}) => (
          <Animated.View
            entering={FadeInDown.duration(320).delay(
              Math.min(index, 8) * STAGGER_STEP,
            )}
            exiting={SlideOutRight.duration(220)}>
            <SwipeableTransactionRow
              txn={item}
              settings={settings}
              categoryName={
                item.categoryId
                  ? categoriesById.get(item.categoryId)?.name
                  : undefined
              }
              onDelete={() => handleDelete(item.id)}
              onVerify={() => handleVerify(item.id)}
            />
          </Animated.View>
        )}
      />
      <Fab onPress={() => setQuickAdd(true)} bottom={spacing.xl} />
      {user ? (
        <QuickAddSheet
          visible={quickAdd}
          userId={user.uid}
          onClose={() => setQuickAdd(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  list: {padding: spacing.lg, gap: spacing.sm, paddingBottom: 120},
  title: {marginBottom: spacing.md},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
});
