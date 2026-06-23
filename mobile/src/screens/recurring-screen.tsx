import {type ComponentType, useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  computeRecurringForecast,
  type RecurringTemplate,
  type RecurringTransactionType,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {Tag, type TagTone} from '@/components/ui/tag';
import {Toggle} from '@/components/ui/toggle';
import {IconButton, ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {RecurringSkeleton} from '@/components/motion/screen-skeletons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {
  IconBriefcase,
  IconCard,
  IconPlus,
  IconReceipt,
  IconSwap,
  IconTrend,
  type IconProps,
} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useRecurring} from '@/hooks/use-recurring';
import {useUserSettings} from '@/hooks/use-user-settings';
import {formatCompactMoney, formatLedgerMoney} from '@/lib/format/currency';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {setRecurringActive} from '@/lib/recurring/service';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

const TYPE_VISUAL: Record<
  RecurringTransactionType,
  {icon: ComponentType<IconProps>; tone: TagTone; label: string; sign: number}
> = {
  INCOME: {icon: IconBriefcase, tone: 'income', label: 'Income', sign: 1},
  EXPENSE: {icon: IconReceipt, tone: 'expense', label: 'Expense', sign: -1},
  LIABILITY_PAYMENT: {icon: IconCard, tone: 'expense', label: 'Bill', sign: -1},
  TRANSFER: {icon: IconSwap, tone: 'transfer', label: 'Transfer', sign: 0},
  INVESTMENT: {icon: IconTrend, tone: 'invest', label: 'Invest', sign: 0},
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ordinal(day: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  return day + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function scheduleLine(template: RecurringTemplate): string {
  if (template.frequency === 'WEEKLY') {
    return `Weekly · ${WEEKDAYS[template.dayOfWeek] ?? 'Mon'}`;
  }
  if (template.frequency === 'BIWEEKLY') {
    return `Every 2 weeks · ${WEEKDAYS[template.dayOfWeek] ?? 'Mon'}`;
  }
  return `Monthly · ${ordinal(template.dayOfMonth)}`;
}

function formatNextRun(date: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {day: 'numeric', month: 'short'}).format(
      new Date(`${date}T12:00:00`),
    );
  } catch {
    return date;
  }
}

export function RecurringScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {user} = useAuth();
  const toast = useToast();
  const {templates, loading} = useRecurring();
  const {settings} = useUserSettings();

  const timezone = settings?.timezone ?? 'Asia/Kolkata';
  const currency = settings?.baseCurrency ?? 'INR';
  const activeCount = templates.filter(t => t.active).length;

  const forecast = useMemo(
    () => computeRecurringForecast(templates, timezone),
    [templates, timezone],
  );

  async function toggle(template: RecurringTemplate) {
    if (!user) {
      return;
    }
    try {
      await setRecurringActive(user.uid, template.id, !template.active);
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not update template.'));
    }
  }

  // SIPs (INVESTMENT) are managed in the SIP form; everything else in the
  // generic recurring form.
  function openTemplate(template: RecurringTemplate) {
    if (template.type === 'INVESTMENT') {
      navigation.navigate('SipForm', {id: template.id});
    } else {
      navigation.navigate('RecurringForm', {id: template.id});
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Recurring"
        subtitle={`${activeCount} active ${
          activeCount === 1 ? 'template' : 'templates'
        }`}
        titleSize={20}
        onBack={() => navigation.goBack()}
        right={
          <IconButton
            icon={IconPlus}
            onPress={() => navigation.navigate('RecurringForm', {})}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        {loading && templates.length === 0 ? <RecurringSkeleton /> : null}

        {!(loading && templates.length === 0) ? (
        <>
        <FadeInView index={0} style={styles.summaryRow}>
          <SummaryCell
            label="Next 30 days"
            value={`${formatCompactMoney(forecast.income, currency)} in`}
          />
          <SummaryCell
            label="Going out"
            value={formatCompactMoney(forecast.outflow, currency)}
          />
          <SummaryCell
            label="Needs review"
            value={String(forecast.reviewCount)}
            highlight
          />
        </FadeInView>

        {templates.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Lottie name="recurring" size={150} />
            <AppText variant="body" muted>
              No recurring templates yet.
            </AppText>
          </View>
        ) : null}

        {templates.map((template, index) => {
          const visual =
            TYPE_VISUAL[template.type] ?? {
              icon: IconReceipt,
              tone: 'expense' as const,
              label: 'Recurring',
              sign: 0,
            };
          return (
            <FadeInView key={template.id} index={index + 1}>
              <View style={styles.card}>
                <PressableScale onPress={() => openTemplate(template)} scaleTo={0.99}>
                  <View style={styles.cardTop}>
                    <IconBadge icon={visual.icon} tone={visual.tone} size="lg" />
                    <View style={styles.cardName}>
                      <AppText style={styles.cardTitle}>{template.name}</AppText>
                      <AppText variant="xs" muted>
                        {scheduleLine(template)}
                      </AppText>
                    </View>
                    <AppText
                      style={[
                        styles.amount,
                        visual.sign > 0 && {color: colors.income},
                        visual.sign < 0 && {color: colors.expense},
                      ]}>
                      {visual.sign === 0
                        ? formatLedgerMoney(template.amount, settings)
                        : `${visual.sign > 0 ? '+' : '−'}${formatLedgerMoney(
                            template.amount,
                            settings,
                          )}`}
                    </AppText>
                  </View>
                </PressableScale>
                <View style={styles.cardFoot}>
                  <Tag tone={visual.tone} dot>
                    {visual.label}
                  </Tag>
                  <AppText variant="xs" style={styles.next}>
                    Next {formatNextRun(template.nextRunDate)}
                  </AppText>
                  <View style={styles.grow} />
                  <Tag tone={template.autoConfirm ? 'income' : 'pending'} dot>
                    {template.autoConfirm ? 'Auto' : 'Review'}
                  </Tag>
                  <Toggle value={template.active} onValueChange={() => toggle(template)} />
                </View>
              </View>
            </FadeInView>
          );
        })}
        </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryCell}>
      <AppText variant="xs" muted>
        {label}
      </AppText>
      <AppText style={[styles.summaryValue, highlight && {color: colors.income}]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.sm},
  summaryRow: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs},
  summaryCell: {
    flex: 1,
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
  next: {fontWeight: '700', color: colors.ink500},
  grow: {flex: 1},
  empty: {alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl},
});
