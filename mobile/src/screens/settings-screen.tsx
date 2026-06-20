import {type ComponentType, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {Gradient} from '@/components/ui/gradient';
import {Tag} from '@/components/ui/tag';
import {Toggle} from '@/components/ui/toggle';
import {ScreenHeader} from '@/components/ui/screen-header';
import {PressableScale} from '@/components/motion/pressable-scale';
import {FadeInView} from '@/components/motion/fade-in-view';
import {
  IconBank,
  IconChevronDown,
  IconChevronRight,
  IconGlobe,
  IconGrid,
  IconLogout,
  type IconProps,
} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useUserSettings} from '@/hooks/use-user-settings';
import {useCategories, useTransactions} from '@/providers/ledger-data-provider';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {resolvePrimaryAccountId} from '@/lib/ledger/account-display';
import {patchUserSettings} from '@/lib/settings/service';
import {useAuth} from '@/providers/auth-provider';
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
  const {settings} = useUserSettings();
  const {accounts} = useAccounts();
  const {transactions} = useTransactions();
  const {categories} = useCategories();
  const [savingKey, setSavingKey] = useState<string | null>(null);

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
          <PressableScale onPress={() => signOut()} style={styles.signOut}>
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
