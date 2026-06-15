import {FlatList, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {LoadingScreen} from '@/screens/loading-screen';
import {colors, spacing} from '@/constants/theme';
import {formatLedgerMoney} from '@/lib/format/currency';
import {useTransactions} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';

export function PendingScreen() {
  const {transactions, loading} = useTransactions();
  const {settings} = useUserSettings();

  const pending = transactions.filter(tx => tx.status === 'PENDING');

  if (loading) {
    return <LoadingScreen message="Loading pending…" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={pending}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <AppText variant="h1" style={styles.title}>
              Pending review
            </AppText>
            <AppText variant="body" style={styles.sub}>
              Confirm or edit entries before they hit your ledger.
            </AppText>
          </>
        }
        ListEmptyComponent={
          <Card>
            <AppText variant="body">All caught up — nothing pending.</AppText>
          </Card>
        }
        renderItem={({item}) => (
          <Card style={styles.row}>
            <AppText variant="body" style={styles.rowTitle}>
              {item.merchant || item.notes || 'Pending entry'}
            </AppText>
            <AppText variant="sm" style={styles.pending}>
              {formatLedgerMoney(item.amount, settings)}
            </AppText>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  list: {padding: spacing.lg, gap: spacing.sm},
  title: {marginBottom: spacing.sm},
  sub: {marginBottom: spacing.md},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    fontWeight: '600',
    color: colors.ink900,
  },
  pending: {
    color: colors.pending,
    fontWeight: '700',
  },
});
