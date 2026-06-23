import {useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {toDateStringInTimezone} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {Tag} from '@/components/ui/tag';
import {ScreenHeader} from '@/components/ui/screen-header';
import {KeyboardAwareScrollView} from '@/components/ui/keyboard-aware-scroll-view';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconCheck} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useLedgerSummary} from '@/hooks/use-ledger-summary';
import {formatLedgerMoney} from '@/lib/format/currency';
import {getAccountVisual} from '@/lib/ledger/account-display';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {postReconciliation} from '@/lib/reconcile/service';
import {useAuth} from '@/providers/auth-provider';
import {useCategories} from '@/providers/ledger-data-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

export function ReconcileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'Reconcile'>>();
  const {user} = useAuth();
  const toast = useToast();
  const {summary, settings} = useLedgerSummary();
  const {categories} = useCategories();

  const [actual, setActual] = useState('');
  const [busy, setBusy] = useState(false);

  const entry = summary?.accountBalances.find(
    b => b.account.id === route.params.accountId,
  );

  if (!entry || !settings) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Reconcile"
          titleSize={20}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <AppText variant="body" muted>
            Account not found.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const {account, balance: expected} = entry;
  const {icon, tone} = getAccountVisual(account);
  const actualNum = actual === '' ? expected : Number(actual) || 0;
  const gap = actualNum - expected;

  async function handlePost() {
    if (!user || !settings) {
      return;
    }
    const unaccounted =
      categories.find(c => c.id === 'unaccounted') ??
      categories.find(c => c.system) ??
      null;
    if (Math.abs(actualNum - expected) > 0.009 && !unaccounted) {
      toast.error(
        'Missing system categories. Finish setup on web or contact support.',
      );
      return;
    }
    setBusy(true);
    try {
      await postReconciliation({
        uid: user.uid,
        account,
        expected,
        actual: actualNum,
        unaccountedCategoryId: unaccounted?.id ?? 'unaccounted',
        date: toDateStringInTimezone(new Date(), settings.timezone),
      });
      toast.success('Reconciled — balances now match.');
      navigation.goBack();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not reconcile.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Reconcile"
        subtitle="Your bank is the source of truth"
        titleSize={20}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAwareScrollView contentContainerStyle={styles.body}>
          <FadeInView style={styles.bodyInner}>
          <View style={styles.head}>
            <IconBadge icon={icon} tone={tone} size="lg" />
            <View>
              <AppText style={styles.headName}>{account.name}</AppText>
              <AppText variant="xs" muted>
                {account.reconcileCadence.toLowerCase()} cadence
              </AppText>
            </View>
          </View>

          <View style={styles.cell}>
            <AppText style={styles.cellLabel}>PFOS LEDGER SAYS</AppText>
            <AppText style={styles.cellValue}>
              {formatLedgerMoney(expected, settings)}
            </AppText>
          </View>

          <View style={[styles.cell, styles.cellActual]}>
            <AppText style={styles.cellLabel}>ACTUAL BALANCE IN YOUR BANK</AppText>
            <View style={styles.inputRow}>
              <AppText style={styles.cur}>
                {settings.baseCurrency === 'INR' ? '₹' : ''}
              </AppText>
              <TextInput
                style={styles.input}
                value={actual}
                onChangeText={setActual}
                keyboardType="decimal-pad"
                placeholder={String(Math.round(expected))}
                placeholderTextColor={colors.ink400}
              />
            </View>
          </View>

          <View style={styles.gap}>
            <View>
              <AppText variant="xs" muted>
                Difference to account for
              </AppText>
              <AppText
                style={[styles.gapValue, gap < 0 && {color: colors.expense}, gap > 0 && {color: colors.income}]}>
                {formatLedgerMoney(gap, settings)}
              </AppText>
            </View>
            <View style={styles.gapRight}>
              <View style={styles.code}>
                <AppText style={styles.codeText}>RECON_ADJUST</AppText>
              </View>
              <Tag tone="pending" dot>
                Misc
              </Tag>
            </View>
          </View>

          <AppText variant="sm" style={styles.note}>
            A small gap usually means a cash spend or fee you didn’t log. We
            record it so balances always match — without guessing what it was.
          </AppText>

          <PressableScale onPress={handlePost} disabled={busy} style={styles.cta}>
            <IconCheck size={20} color={colors.white} strokeWidth={2.4} />
            <AppText style={styles.ctaText}>
              {busy ? 'Posting…' : 'Post adjustment & mark reconciled'}
            </AppText>
          </PressableScale>
          </FadeInView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  flex: {flex: 1},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 40},
  bodyInner: {gap: spacing.sm},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  head: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 4},
  headName: {fontSize: 17, fontWeight: '700', color: colors.ink900},
  cell: {
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 16,
  },
  cellActual: {borderColor: colors.mint300, backgroundColor: colors.mint50},
  cellLabel: {fontSize: 11.5, fontWeight: '700', color: colors.ink400},
  cellValue: {fontWeight: '700', fontSize: 28, color: colors.ink900, marginTop: 5, fontVariant: ['tabular-nums']},
  inputRow: {flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5},
  cur: {fontWeight: '700', fontSize: 18, color: colors.ink400},
  input: {
    flex: 1,
    fontWeight: '700',
    fontSize: 28,
    color: colors.ink900,
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  gap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 16,
  },
  gapValue: {fontWeight: '700', fontSize: 24, color: colors.ink900, marginTop: 2},
  gapRight: {alignItems: 'flex-end', gap: 6},
  code: {backgroundColor: colors.canvas, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2},
  codeText: {fontSize: 11, fontWeight: '700', color: colors.ink700},
  note: {color: colors.ink500, lineHeight: 20, marginVertical: 14, marginHorizontal: 2},
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.mint500,
  },
  ctaText: {color: colors.white, fontWeight: '700', fontSize: 15},
});
