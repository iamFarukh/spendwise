import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {
  SUBSCRIPTION_BILLING_CYCLE_OPTIONS,
  SUBSCRIPTION_CATEGORIES,
  computeInitialRenewalDate,
  deriveSubscriptionMonogram,
  getPopularSubscriptionAssets,
  resolveSubscriptionBrandColor,
  toSubscriptionBillingCycle,
  type SubscriptionAsset,
  type SubscriptionBillingCycle,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Toggle} from '@/components/ui/toggle';
import {ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {KeyboardAwareScrollView} from '@/components/ui/keyboard-aware-scroll-view';
import {SubscriptionLogo} from '@/components/subscription/subscription-logo';
import {SubscriptionSearchField} from '@/components/subscription/subscription-search-field';
import {RenewalDatePicker} from '@/components/subscription/renewal-date-picker';
import {IconCheck, IconTrash} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useSubscription} from '@/hooks/use-subscriptions';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {
  createSubscription,
  deleteSubscription,
  updateSubscription,
} from '@/lib/subscriptions/service';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

/** Deterministic fun tile color for a custom (non-library) subscription. */
const CUSTOM_COLORS = [
  '#5B86E5',
  '#0C9E74',
  '#E26A57',
  '#8A7FE0',
  '#D99A2B',
  '#E72C76',
  '#3FA7D6',
  '#7B5EA7',
];
function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CUSTOM_COLORS[hash % CUSTOM_COLORS.length];
}

export function SubscriptionFormScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'SubscriptionForm'>>();
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const {accounts} = useAccounts();
  const {settings} = useUserSettings();
  const existing = useSubscription(route.params?.id);
  const isEdit = Boolean(existing);

  const [name, setName] = useState('');
  const [assetId, setAssetId] = useState<string | null>(null);
  const [iconSlug, setIconSlug] = useState<string | null>(null);
  const [category, setCategory] = useState('Other');
  const [color, setColor] = useState<string | null>(null);
  const [monogram, setMonogram] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [billingCycle, setBillingCycle] =
    useState<SubscriptionBillingCycle>('MONTHLY');
  const [anchorDay, setAnchorDay] = useState(5);
  const [autoPay, setAutoPay] = useState(true);
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [archived, setArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const assetAccounts = useMemo(
    () => accounts.filter(a => a.class === 'ASSET' && !a.archived),
    [accounts],
  );
  const defaultFromAccountId = useMemo(() => {
    if (settings?.primaryAccountId) {
      const primary = assetAccounts.find(a => a.id === settings.primaryAccountId);
      if (primary) {
        return primary.id;
      }
    }
    return assetAccounts[0]?.id ?? '';
  }, [assetAccounts, settings?.primaryAccountId]);
  const timezone = settings?.timezone ?? 'Asia/Kolkata';

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setAssetId(existing.assetId ?? null);
      setIconSlug(existing.iconSlug ?? null);
      setCategory(existing.category);
      setColor(existing.color ?? null);
      setMonogram(existing.monogram ?? null);
      setAmount(String(existing.amount));
      setFromAccountId(existing.fromAccountId ?? '');
      setBillingCycle(existing.billingCycle);
      setAnchorDay(existing.anchorDay);
      setAutoPay(existing.autoPay);
      setNotes(existing.notes ?? '');
      setActive(existing.active);
      setArchived(existing.archived);
      setInitialized(true);
      return;
    }
    if (!initialized && defaultFromAccountId) {
      setFromAccountId(defaultFromAccountId);
      setInitialized(true);
    }
  }, [defaultFromAccountId, existing, initialized]);

  function selectAsset(asset: SubscriptionAsset) {
    setName(asset.name);
    setAssetId(asset.id);
    setIconSlug(asset.iconSlug);
    setCategory(asset.category);
    setColor(
      resolveSubscriptionBrandColor({
        color: asset.color,
        iconSlug: asset.iconSlug,
        category: asset.category,
      }),
    );
    setMonogram(asset.mark ?? null);
    setBillingCycle(toSubscriptionBillingCycle(asset.defaultCycle));
  }

  function handleTypeName(text: string) {
    setName(text);
    // Manual edits unbind the library asset; keep it a custom entry.
    if (assetId) {
      setAssetId(null);
      setIconSlug(null);
    }
  }

  function changeBillingCycle(next: SubscriptionBillingCycle) {
    if (next === billingCycle) {
      return;
    }
    const wasWeekly = billingCycle === 'WEEKLY';
    const willWeekly = next === 'WEEKLY';
    setBillingCycle(next);
    if (willWeekly && !wasWeekly) {
      setAnchorDay(day => Math.min(Math.max(day, 0), 6));
    } else if (!willWeekly && wasWeekly) {
      setAnchorDay(day => (day < 1 ? 1 : Math.min(day, 28)));
    }
  }

  const previewColor = color ?? (name ? colorForName(name) : null);
  const previewMonogram = monogram ?? deriveSubscriptionMonogram(name || '?');
  const popular = useMemo(() => getPopularSubscriptionAssets(18), []);
  const showPopular = !isEdit && !assetId && !name.trim();

  async function save() {
    if (!user || !settings) {
      return;
    }
    if (!name.trim()) {
      toast.error('Search or name your subscription first.');
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }

    const scheduleChanged =
      !existing ||
      existing.billingCycle !== billingCycle ||
      existing.anchorDay !== anchorDay;
    const nextRenewalDate =
      isEdit && existing && !scheduleChanged
        ? existing.nextRenewalDate
        : computeInitialRenewalDate(billingCycle, anchorDay, timezone);

    const input = {
      name: name.trim(),
      assetId,
      iconSlug,
      category,
      color: color ?? colorForName(name.trim()),
      monogram: monogram ?? deriveSubscriptionMonogram(name.trim()),
      amount: parsedAmount,
      fromAccountId: fromAccountId || null,
      billingCycle,
      anchorDay,
      nextRenewalDate,
      autoPay,
      notes,
      active,
      archived,
      notificationsEnabled: existing?.notificationsEnabled ?? true,
    };

    setBusy(true);
    try {
      if (isEdit && existing) {
        await updateSubscription(user.uid, existing.id, input, accounts);
        toast.success('Subscription updated.');
      } else {
        await createSubscription(user.uid, input, accounts, timezone);
        toast.success('Subscription added.');
      }
      navigation.goBack();
    } catch (err) {
      toast.error(
        getFirestoreErrorMessage(err, 'Could not save subscription.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!user || !existing) {
      return;
    }
    const ok = await dialog.confirm({
      title: 'Remove subscription?',
      message: `"${existing.name}" will be removed permanently.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    setBusy(true);
    try {
      await deleteSubscription(user.uid, existing.id);
      toast.success('Subscription removed.');
      navigation.goBack();
    } catch (err) {
      toast.error(
        getFirestoreErrorMessage(err, 'Could not remove subscription.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Edit Subscription' : 'New Subscription'}
        subtitle="Track a recurring service"
        titleSize={20}
        onBack={() => navigation.goBack()}
        right={
          <PressableScale onPress={save} disabled={busy} scaleTo={0.9}>
            <View style={styles.saveBtn}>
              <IconCheck size={18} color={colors.paper} />
            </View>
          </PressableScale>
        }
      />
      <KeyboardAwareScrollView contentContainerStyle={styles.body}>
        <FadeInView style={styles.bodyInner}>
          {name.trim() ? (
            <FadeInView distance={10}>
              <View style={styles.preview}>
                <SubscriptionLogo
                  name={name}
                  iconSlug={iconSlug}
                  category={category}
                  color={previewColor}
                  monogram={previewMonogram}
                  size={48}
                />
                <View style={styles.previewBody}>
                  <AppText style={styles.previewName} numberOfLines={1}>
                    {name}
                  </AppText>
                  <AppText variant="xs" muted>
                    {category}
                    {assetId ? '' : ' · Custom'}
                  </AppText>
                </View>
              </View>
            </FadeInView>
          ) : null}

          <View style={styles.searchZone}>
            <Field label="Subscription">
              <SubscriptionSearchField
                value={name}
                onChangeText={handleTypeName}
                onSelectAsset={selectAsset}
                onAddCustom={() => setAssetId(null)}
              />
            </Field>
          </View>

          {showPopular ? (
            <View style={styles.field}>
              <AppText variant="sm" style={styles.label}>
                Popular
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                <View style={styles.popularRow}>
                  {popular.map(asset => (
                    <PressableScale
                      key={asset.id}
                      onPress={() => selectAsset(asset)}
                      scaleTo={0.92}>
                      <View style={styles.popularItem}>
                        <SubscriptionLogo
                          name={asset.name}
                          iconSlug={asset.iconSlug}
                          category={asset.category}
                          color={asset.color}
                          monogram={asset.mark}
                          size={48}
                        />
                        <AppText
                          variant="xs"
                          muted
                          numberOfLines={1}
                          style={styles.popularLabel}>
                          {asset.name}
                        </AppText>
                      </View>
                    </PressableScale>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <Field label="Amount">
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="1999"
              placeholderTextColor={colors.ink400}
            />
            <AppText variant="xs" muted style={styles.amountHint}>
              Enter your own price — it varies by country, plan and taxes.
            </AppText>
          </Field>

          <Field label="Paid from">
            <ScrollRow>
              {assetAccounts.map(account => (
                <Chip
                  key={account.id}
                  label={account.name}
                  active={fromAccountId === account.id}
                  onPress={() => setFromAccountId(account.id)}
                />
              ))}
            </ScrollRow>
          </Field>

          <Field label="Category">
            <ScrollRow>
              {SUBSCRIPTION_CATEGORIES.map(cat => (
                <Chip
                  key={cat}
                  label={cat}
                  active={category === cat}
                  onPress={() => setCategory(cat)}
                />
              ))}
            </ScrollRow>
          </Field>

          <Field label="Billing cycle">
            <View style={styles.freqRow}>
              {SUBSCRIPTION_BILLING_CYCLE_OPTIONS.map(option => (
                <Chip
                  key={option.value}
                  label={option.label}
                  active={billingCycle === option.value}
                  onPress={() => changeBillingCycle(option.value)}
                />
              ))}
            </View>
          </Field>

          <Field label="Renewal date">
            <RenewalDatePicker
              billingCycle={billingCycle}
              value={anchorDay}
              onChange={setAnchorDay}
              timezone={timezone}
            />
          </Field>

          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <AppText style={styles.toggleLabel}>Auto pay</AppText>
              <AppText variant="xs" muted>
                Charged automatically (tracking only)
              </AppText>
            </View>
            <Toggle value={autoPay} onValueChange={setAutoPay} />
          </View>

          <Field label="Notes (optional)">
            <TextInput
              style={[styles.input, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Plan, shared with…"
              placeholderTextColor={colors.ink400}
            />
          </Field>

          <View style={styles.toggleRow}>
            <AppText style={styles.toggleLabel}>Active</AppText>
            <Toggle value={active} onValueChange={setActive} />
          </View>

          <AppText variant="xs" muted style={styles.hint}>
            We&apos;ll remind you before each renewal. Pause anytime to stop
            counting it toward your monthly cost.
          </AppText>

          {isEdit ? (
            <PressableScale onPress={remove} disabled={busy} scaleTo={0.98}>
              <View style={styles.deleteRow}>
                <IconTrash size={18} color={colors.expense} />
                <AppText style={styles.delete}>Remove this subscription</AppText>
              </View>
            </PressableScale>
          ) : null}
        </FadeInView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return (
    <View style={styles.field}>
      <AppText variant="sm" style={styles.label}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

function ScrollRow({children}: {children: ReactNode}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.row}>{children}</View>
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.93}>
      <View style={[styles.chip, active && styles.chipActive]}>
        <AppText
          variant="xs"
          style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {padding: spacing.lg, paddingBottom: 120},
  bodyInner: {gap: spacing.md},
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mint600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 12,
  },
  previewBody: {flex: 1, minWidth: 0},
  previewName: {fontSize: 16, fontWeight: '700', color: colors.ink900},
  field: {gap: 8},
  // Lifts the search field (and its suggestion dropdown) above the fields below.
  searchZone: {zIndex: 20},
  label: {fontWeight: '700', color: colors.ink700},
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink900,
  },
  amountHint: {lineHeight: 16},
  popularRow: {flexDirection: 'row', gap: spacing.md, paddingVertical: 2},
  popularItem: {alignItems: 'center', width: 64, gap: 6},
  popularLabel: {textAlign: 'center', maxWidth: 64},
  notes: {minHeight: 72, textAlignVertical: 'top'},
  row: {flexDirection: 'row', gap: 8, paddingVertical: 2},
  freqRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 2},
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {borderColor: colors.mint600, backgroundColor: colors.mint50},
  chipText: {fontWeight: '700', color: colors.ink600},
  chipTextActive: {color: colors.mint700},
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
  },
  toggleText: {flex: 1, minWidth: 0},
  toggleLabel: {fontWeight: '700', color: colors.ink900},
  hint: {lineHeight: 18},
  deleteRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  delete: {color: colors.expense, fontWeight: '700'},
});
