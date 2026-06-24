import {type ComponentType, useEffect, useState} from 'react';
import {Linking, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {Gradient} from '@/components/ui/gradient';
import {Tag} from '@/components/ui/tag';
import {Toggle} from '@/components/ui/toggle';
import {ScreenHeader} from '@/components/ui/screen-header';
import {AuthorWordmark} from '@/components/brand/spendwise-brand';
import {PressableScale} from '@/components/motion/pressable-scale';
import {FadeInView} from '@/components/motion/fade-in-view';
import {
  IconBank,
  IconBell,
  IconChevronDown,
  IconChevronRight,
  IconGlobe,
  IconGrid,
  IconHeart,
  IconLogout,
  IconShield,
  type IconProps,
} from '@/components/icons';
import {DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs} from '@pfos/shared';
import {APP_AUTHOR_FIRST, APP_AUTHOR_LAST, APP_VERSION} from '@/constants/app';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useUserSettings} from '@/hooks/use-user-settings';
import {useCategories, useTransactions} from '@/providers/ledger-data-provider';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {
  displayTestOsNotification,
  getPushPermissionStatus,
  requestPushPermission,
  TEST_NOTIFICATION_SAMPLES,
} from '@/lib/notifications/push';
import type {NotificationCategory} from '@/lib/notifications/types';
import {resolvePrimaryAccountId} from '@/lib/ledger/account-display';
import {patchUserSettings} from '@/lib/settings/service';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

const CURRENCY_OPTIONS = [
  {value: 'INR', label: '₹ Indian Rupee (INR)'},
  {value: 'USD', label: '$ US Dollar (USD)'},
  {value: 'EUR', label: '€ Euro (EUR)'},
  {value: 'GBP', label: '£ British Pound (GBP)'},
  {value: 'AED', label: 'UAE Dirham (AED)'},
];

const TIMEZONE_OPTIONS = [
  {value: 'Asia/Kolkata', label: 'India · Kolkata'},
  {value: 'Asia/Dubai', label: 'UAE · Dubai'},
  {value: 'Asia/Singapore', label: 'Singapore'},
  {value: 'Europe/London', label: 'UK · London'},
  {value: 'America/New_York', label: 'US · New York'},
  {value: 'America/Los_Angeles', label: 'US · Los Angeles'},
];

export function SettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {user, signOut} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const {settings} = useUserSettings();
  const {accounts} = useAccounts();
  const {transactions} = useTransactions();
  const {categories} = useCategories();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown');

  useEffect(() => {
    void getPushPermissionStatus().then(status =>
      setPushStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown'),
    );
  }, []);

  async function enablePushNotifications() {
    const status = await requestPushPermission();
    setPushStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown');
    if (status === 'denied') {
      toast.error('Notifications are off. Enable them in system settings.');
      void Linking.openSettings();
    }
  }

  async function sendTestNotification(category: NotificationCategory) {
    setSavingKey(`test-${category}`);
    try {
      await displayTestOsNotification(TEST_NOTIFICATION_SAMPLES[category]);
      setPushStatus('granted');
      toast.success(
        Platform.OS === 'android'
          ? 'Test notification sent. Pull down the status bar if you do not see a banner.'
          : 'Test notification sent.',
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not send test notification.';
      toast.error(message);
    } finally {
      setSavingKey(null);
    }
  }

  const name =
    user?.displayName ?? user?.email?.split('@')[0] ?? 'SpendWise user';
  const initial = name.charAt(0).toUpperCase();
  const primaryAccount =
    accounts.find(
      a => a.id === resolvePrimaryAccountId(accounts, settings?.primaryAccountId),
    ) ?? null;
  const entries = transactions.filter(t => t.type !== 'OPENING').length;
  const userCategories = categories.filter(c => !c.system).length;

  async function patchSetting(
    key: 'includeTrackingInNetWorth' | 'roundAmounts',
    value: boolean,
  ) {
    if (!user) {
      return;
    }
    setSavingKey(key);
    try {
      const patch =
        key === 'roundAmounts'
          ? {roundAmounts: value}
          : {includeTrackingInNetWorth: value};
      await patchUserSettings(user.uid, patch);
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not save setting.'));
    } finally {
      setSavingKey(null);
    }
  }

  const notifPrefs = settings?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS;

  function patchNotifPref(key: keyof NotificationPrefs, value: boolean) {
    if (!user) {
      return;
    }
    setSavingKey(`notif-${key}`);
    patchUserSettings(user.uid, {
      notificationPrefs: {...notifPrefs, [key]: value},
    })
      .catch(err =>
        toast.error(getFirestoreErrorMessage(err, 'Could not save setting.')),
      )
      .finally(() => setSavingKey(null));
  }

  async function handleSignOut() {
    const ok = await dialog.confirm({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your SpendWise data.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay signed in',
      destructive: true,
    });
    if (ok) {
      await signOut();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Settings"
        titleSize={20}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        <FadeInView index={0}>
          <Card style={styles.profile}>
            <Gradient
              colors={[colors.mintBright, colors.mint600]}
              borderRadius={32}
              style={styles.avatar}>
              <AppText style={styles.avatarText}>{initial}</AppText>
            </Gradient>
            <AppText style={styles.profileName}>{name}</AppText>
            <AppText variant="sm" muted>
              {user?.email ?? '—'}
            </AppText>
            <View style={styles.syncTag}>
              <Tag tone="income" dot>
                Synced · web &amp; mobile
              </Tag>
            </View>
            <View style={styles.stats}>
              <Stat value={entries} label="entries" />
              <Stat value={accounts.length} label="accounts" />
              <Stat value={userCategories} label="categories" />
            </View>
          </Card>
        </FadeInView>

        <FadeInView index={1}>
          <Card style={styles.section}>
            <SectionTitle icon={IconGrid}>Manage</SectionTitle>
            <NavRow
              title="Categories"
              subtitle="Spending buckets this month"
              onPress={() => navigation.navigate('Categories')}
            />
            <NavRow
              title="SIP Management"
              subtitle="Mutual funds, stocks, gold and RDs"
              onPress={() => navigation.navigate('Sip')}
            />
            <NavRow
              title="Subscription Management"
              subtitle="Track ChatGPT, Netflix, Spotify, Google One, Adobe, Cursor and other recurring subscriptions."
              onPress={() => navigation.navigate('Subscriptions')}
            />
            <NavRow
              title="Recurring"
              subtitle="Salary, rent and bills"
              onPress={() => navigation.navigate('Recurring')}
              last
            />
          </Card>
        </FadeInView>

        <FadeInView index={2}>
          <Card style={styles.section}>
            <SectionTitle icon={IconGlobe}>Preferences</SectionTitle>
            <SelectRow
              title="Base currency"
              subtitle="Shown everywhere"
              value={settings?.baseCurrency ?? 'INR'}
              onPress={() =>
                navigation.navigate('OptionPicker', {
                  settingKey: 'baseCurrency',
                  title: 'Base currency',
                  options: CURRENCY_OPTIONS,
                  current: settings?.baseCurrency ?? 'INR',
                })
              }
            />
            <SelectRow
              title="Timezone"
              subtitle="Report boundaries"
              value={(settings?.timezone ?? 'Asia/Kolkata').split('/').pop() ?? ''}
              onPress={() =>
                navigation.navigate('OptionPicker', {
                  settingKey: 'timezone',
                  title: 'Timezone',
                  options: TIMEZONE_OPTIONS,
                  current: settings?.timezone ?? 'Asia/Kolkata',
                })
              }
            />
            <SelectRow
              title="Primary account"
              subtitle="Quick-add default"
              value={primaryAccount?.name ?? 'None'}
              icon
              onPress={() =>
                navigation.navigate('OptionPicker', {
                  settingKey: 'primaryAccountId',
                  title: 'Primary account',
                  options: accounts
                    .filter(a => a.class === 'ASSET')
                    .map(a => ({value: a.id, label: a.name})),
                  current: settings?.primaryAccountId ?? undefined,
                })
              }
            />
            <ToggleRow
              title="Track loans"
              subtitle="Loan given / received entries"
              value={settings?.loansEnabled ?? false}
              disabled={savingKey === 'loansEnabled'}
              onValueChange={v => {
                if (!user) {
                  return;
                }
                setSavingKey('loansEnabled');
                patchUserSettings(user.uid, {loansEnabled: v})
                  .catch(err =>
                    toast.error(
                      getFirestoreErrorMessage(err, 'Could not save setting.'),
                    ),
                  )
                  .finally(() => setSavingKey(null));
              }}
            />
            <ToggleRow
              title="Investments in net worth"
              subtitle="Counts toward total"
              value={settings?.includeTrackingInNetWorth ?? true}
              disabled={savingKey === 'includeTrackingInNetWorth'}
              onValueChange={v => patchSetting('includeTrackingInNetWorth', v)}
            />
            <ToggleRow
              title="Round to nearest rupee"
              subtitle="Hide paise"
              value={settings?.roundAmounts ?? true}
              disabled={savingKey === 'roundAmounts'}
              onValueChange={v => patchSetting('roundAmounts', v)}
              last
            />
          </Card>
        </FadeInView>

        <FadeInView index={3}>
          <Card style={styles.section}>
            <SectionTitle icon={IconBell}>Notifications</SectionTitle>
            <AppText variant="xs" muted style={styles.sectionHint}>
              Calm by design — at most one daily reminder. Turn off anything you
              don't want.
            </AppText>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <AppText style={styles.rowTitle}>Phone notifications</AppText>
                <AppText variant="xs" muted>
                  {pushStatus === 'granted'
                    ? 'Enabled on this device'
                    : pushStatus === 'denied'
                      ? 'Disabled in system settings'
                      : 'Tap to allow alerts'}
                </AppText>
              </View>
              {pushStatus === 'granted' ? (
                <Tag tone="income" dot>
                  On
                </Tag>
              ) : (
                <PressableScale onPress={() => void enablePushNotifications()} scaleTo={0.96}>
                  <View style={styles.enablePush}>
                    <AppText style={styles.enablePushText}>Enable</AppText>
                  </View>
                </PressableScale>
              )}
            </View>
            <ToggleRow
              title="Transaction reminders"
              subtitle="Evening nudge + missed-activity"
              value={notifPrefs.transactionReminders}
              disabled={savingKey === 'notif-transactionReminders'}
              onValueChange={v => patchNotifPref('transactionReminders', v)}
            />
            <ToggleRow
              title="SIP reminders"
              subtitle="When a SIP is due today"
              value={notifPrefs.sipReminders}
              disabled={savingKey === 'notif-sipReminders'}
              onValueChange={v => patchNotifPref('sipReminders', v)}
            />
            <ToggleRow
              title="Subscription reminders"
              subtitle="Before a subscription renews"
              value={notifPrefs.subscriptionReminders}
              disabled={savingKey === 'notif-subscriptionReminders'}
              onValueChange={v => patchNotifPref('subscriptionReminders', v)}
            />
            <ToggleRow
              title="Account alerts"
              subtitle="Balance discrepancies"
              value={notifPrefs.accountAlerts}
              disabled={savingKey === 'notif-accountAlerts'}
              onValueChange={v => patchNotifPref('accountAlerts', v)}
            />
            <ToggleRow
              title="Weekly insights"
              subtitle="Spending & savings recap"
              value={notifPrefs.weeklyInsights}
              disabled={savingKey === 'notif-weeklyInsights'}
              onValueChange={v => patchNotifPref('weeklyInsights', v)}
            />
            <ToggleRow
              title="Product updates"
              subtitle="News & new features"
              value={notifPrefs.productUpdates}
              disabled={savingKey === 'notif-productUpdates'}
              onValueChange={v => patchNotifPref('productUpdates', v)}
            />
            <View style={styles.testBlock}>
              <AppText variant="xs" muted style={styles.testHint}>
                Send a sample push for each alert type. Useful to confirm banners,
                sounds, and deep links.
              </AppText>
              {(
                [
                  ['sip', 'SIP reminder'],
                  ['subscription', 'Subscription reminder'],
                  ['transaction', 'Transaction nudge'],
                  ['account', 'Account alert'],
                  ['insight', 'Weekly insight'],
                  ['system', 'System update'],
                ] as const
              ).map(([category, label], index, list) => (
                <TestNotifRow
                  key={category}
                  title={label}
                  disabled={savingKey === `test-${category}`}
                  last={index === list.length - 1}
                  onPress={() => void sendTestNotification(category)}
                />
              ))}
            </View>
          </Card>
        </FadeInView>

        <FadeInView index={4}>
          <Card style={styles.section}>
            <SectionTitle icon={IconShield}>Legal</SectionTitle>
            <NavRow
              title="Privacy Policy"
              subtitle="How we collect, use, and protect your data"
              onPress={() => navigation.navigate('PrivacyPolicy', {source: 'settings'})}
              last
            />
          </Card>
        </FadeInView>

        <FadeInView index={5}>
          <Card style={styles.section}>
            <SectionTitle icon={IconHeart}>About</SectionTitle>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <AppText style={styles.rowTitle}>Version</AppText>
              </View>
              <AppText style={styles.aboutValue}>{APP_VERSION}</AppText>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.aboutCredit}>
                <AppText variant="xs" muted style={styles.aboutCreditLead}>
                  Made with <Text style={styles.aboutLove}>love</Text> by{' '}
                </AppText>
                <AuthorWordmark
                  first={APP_AUTHOR_FIRST}
                  last={APP_AUTHOR_LAST}
                  size="sm"
                />
              </View>
            </View>
          </Card>
        </FadeInView>

        <FadeInView index={6}>
          <PressableScale onPress={() => void handleSignOut()} style={styles.signOut}>
            <IconLogout size={19} color={colors.expense} />
            <AppText style={styles.signOutText}>Sign out</AppText>
          </PressableScale>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({value, label}: {value: number; label: string}) {
  return (
    <View style={styles.statCell}>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText variant="xs" muted>
        {label}
      </AppText>
    </View>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: ComponentType<IconProps>;
  children: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Icon size={18} color={colors.mint600} />
      <AppText style={styles.sectionTitleText}>{children}</AppText>
    </View>
  );
}

function NavRow({
  title,
  subtitle,
  onPress,
  last,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98}>
      <View style={[styles.navRow, last && styles.rowLast]}>
        <View style={styles.rowText}>
          <AppText style={styles.rowTitle}>{title}</AppText>
          <AppText variant="xs" muted numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
        <IconChevronRight size={18} color={colors.ink400} />
      </View>
    </PressableScale>
  );
}

function SelectRow({
  title,
  subtitle,
  value,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText style={styles.rowTitle}>{title}</AppText>
        <AppText variant="xs" muted numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <PressableScale onPress={onPress} style={styles.select} scaleTo={0.94}>
        {icon ? <IconBank size={14} color={colors.mint700} /> : null}
        <AppText style={styles.selectText}>{value}</AppText>
        <IconChevronDown size={15} color={colors.ink400} />
      </PressableScale>
    </View>
  );
}

function TestNotifRow({
  title,
  onPress,
  disabled,
  last,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} scaleTo={0.98}>
      <View style={[styles.testRow, last && styles.rowLast]}>
        <AppText style={styles.testRowTitle}>{title}</AppText>
        <AppText style={styles.testRowAction}>Send</AppText>
      </View>
    </PressableScale>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  last,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowText}>
        <AppText style={styles.rowTitle}>{title}</AppText>
        <AppText variant="xs" muted>
          {subtitle}
        </AppText>
      </View>
      <Toggle value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.md},
  profile: {borderRadius: radius.xl, alignItems: 'center'},
  avatar: {width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 12},
  avatarText: {color: colors.white, fontWeight: '700', fontSize: 28},
  profileName: {fontSize: 18, fontWeight: '700', color: colors.ink900, marginBottom: 3},
  syncTag: {marginTop: spacing.md},
  stats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    justifyContent: 'center',
  },
  statCell: {alignItems: 'center'},
  statValue: {fontWeight: '700', fontSize: 19, color: colors.ink900},
  section: {borderRadius: radius.xl, paddingVertical: spacing.xs},
  sectionTitle: {flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: spacing.sm},
  sectionTitleText: {fontWeight: '700', fontSize: 18, color: colors.ink900},
  sectionHint: {paddingHorizontal: 2, paddingBottom: spacing.sm, lineHeight: 16},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  rowLast: {borderBottomWidth: 0},
  rowText: {flex: 1, minWidth: 0},
  rowTitle: {fontSize: 15, fontWeight: '700', color: colors.ink900},
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 12,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
  },
  selectText: {fontWeight: '700', fontSize: 13, color: colors.ink900},
  enablePush: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.mint600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enablePushText: {color: colors.white, fontWeight: '700', fontSize: 13},
  testBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.sm,
  },
  testHint: {paddingHorizontal: 2, paddingBottom: spacing.sm, lineHeight: 16},
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  testRowTitle: {fontSize: 14, fontWeight: '600', color: colors.ink900},
  testRowAction: {fontSize: 13, fontWeight: '700', color: colors.mint600},
  aboutValue: {fontWeight: '700', fontSize: 15, color: colors.mint600},
  aboutCredit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  aboutCreditLead: {lineHeight: 20},
  aboutLove: {color: colors.love, fontWeight: '600'},
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  signOutText: {color: colors.expense, fontWeight: '700', fontSize: 16},
});
