import {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {formatSipDayOfMonth, getSipInvestmentTypeLabel} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {Tag} from '@/components/ui/tag';
import {Toggle} from '@/components/ui/toggle';
import {IconButton, ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconPlus, IconTrash, IconTrend} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useSipDashboard, useSips} from '@/hooks/use-sip';
import {useUserSettings} from '@/hooks/use-user-settings';
import {formatLedgerMoney} from '@/lib/format/currency';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {deleteRecurringTemplate, setRecurringActive} from '@/lib/recurring/service';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

export function SipScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const {sips, loading} = useSips();
  const {dashboard} = useSipDashboard();
  const {settings} = useUserSettings();
  const {accounts} = useAccounts();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const accountsById = useMemo(
    () => new Map(accounts.map(a => [a.id, a])),
    [accounts],
  );

  async function toggle(templateId: string, active: boolean) {
    if (!user) {
      return;
    }
    setTogglingId(templateId);
    try {
      await setRecurringActive(user.uid, templateId, active);
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not update SIP.'));
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete(sipId: string, sipName: string) {
    const ok = await dialog.confirm({
      title: 'Remove SIP?',
      message: `"${sipName}" will be removed. Pending entries already created stay until you confirm or delete them.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) {
      await remove(sipId);
    }
  }

  async function remove(sipId: string) {
    if (!user) {
      return;
    }
    setDeletingId(sipId);
    try {
      await deleteRecurringTemplate(user.uid, sipId);
      toast.success('SIP removed.');
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not remove SIP.'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="SIP Management"
        subtitle={`${sips.filter(s => s.active).length} active plans`}
        titleSize={20}
        onBack={() => navigation.goBack()}
        right={
          <IconButton
            icon={IconPlus}
            onPress={() => navigation.navigate('SipForm', {})}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {dashboard ? (
          <FadeInView index={0} style={styles.summaryRow}>
            <SummaryCell label="Due today" value={String(dashboard.dueToday.length)} />
            <SummaryCell label="Overdue" value={String(dashboard.overdue.length)} />
            <SummaryCell
              label="This month"
              value={formatLedgerMoney(dashboard.monthTotal, settings)}
            />
            <SummaryCell
              label="This year"
              value={formatLedgerMoney(dashboard.yearTotal, settings)}
            />
          </FadeInView>
        ) : null}

        {sips.length === 0 && !loading ? (
          <FadeInView style={styles.empty}>
            <Lottie name="recurring" size={132} />
            <AppText variant="body" muted style={styles.emptyText}>
              No SIP plans yet. Add mutual funds, stocks, gold or RDs.
            </AppText>
          </FadeInView>
        ) : null}

        {sips.map((sip, index) => {
          const from = sip.fromAccountId
            ? accountsById.get(sip.fromAccountId)?.name
            : null;
          const busy = togglingId === sip.id || deletingId === sip.id;
          return (
            <FadeInView key={sip.id} index={index + 1}>
              <View style={styles.card}>
                <PressableScale
                  onPress={() => navigation.navigate('SipForm', {id: sip.id})}
                  scaleTo={0.98}>
                  <View style={styles.cardTop}>
                    <IconBadge icon={IconTrend} tone="invest" size="lg" />
                    <View style={styles.cardName}>
                      <AppText style={styles.cardTitle}>{sip.name}</AppText>
                      <AppText variant="xs" muted>
                        {getSipInvestmentTypeLabel(sip.investmentType)} ·{' '}
                        {formatSipDayOfMonth(sip.dayOfMonth)} monthly
                        {from ? ` · ${from}` : ''}
                      </AppText>
                    </View>
                    <AppText style={styles.amount}>
                      {formatLedgerMoney(sip.amount, settings)}
                    </AppText>
                  </View>
                </PressableScale>
                <View style={styles.cardFoot}>
                  <Tag tone="invest" dot>
                    Next {sip.nextRunDate}
                  </Tag>
                  <View style={styles.grow} />
                  <PressableScale
                    onPress={() => confirmDelete(sip.id, sip.name)}
                    disabled={busy}
                    scaleTo={0.9}>
                    <View style={styles.deleteBtn}>
                      <IconTrash size={18} color={colors.expense} />
                    </View>
                  </PressableScale>
                  <Toggle
                    value={sip.active}
                    onValueChange={active => toggle(sip.id, active)}
                    disabled={busy}
                  />
                </View>
              </View>
            </FadeInView>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCell({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.summaryCell}>
      <AppText variant="xs" muted>
        {label}
      </AppText>
      <AppText style={styles.summaryValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.sm},
  summaryRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  summaryCell: {
    width: '47%',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 13,
  },
  summaryValue: {fontWeight: '700', fontSize: 16, color: colors.ink900, marginTop: 3},
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
  },
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  cardName: {flex: 1},
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.ink900},
  amount: {fontWeight: '700', fontSize: 17, color: colors.ink900, fontVariant: ['tabular-nums']},
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 11,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  grow: {flex: 1},
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.expenseBg,
    borderWidth: 1,
    borderColor: `${colors.expense}30`,
  },
  empty: {alignItems: 'center', paddingVertical: spacing.xxl},
  emptyText: {textAlign: 'center', marginTop: spacing.sm, maxWidth: 260},
});
