import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {
  SIP_INVESTMENT_TYPE_OPTIONS,
  computeInitialRunDate,
  type RecurringFrequency,
  type SipInvestmentType,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Toggle} from '@/components/ui/toggle';
import {ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {DayOfMonthPicker} from '@/components/sip/day-of-month-picker';
import {DayOfWeekPicker} from '@/components/sip/day-of-week-picker';
import {InvestmentNameField} from '@/components/sip/investment-name-field';
import {KeyboardAwareScrollView} from '@/components/ui/keyboard-aware-scroll-view';
import {IconCheck, IconTrash} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useRecurring} from '@/hooks/use-recurring';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {
  createRecurringTemplate,
  deleteRecurringTemplate,
  updateRecurringTemplate,
} from '@/lib/recurring/service';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

export function SipFormScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'SipForm'>>();
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const {accounts} = useAccounts();
  const {settings} = useUserSettings();
  const {templates} = useRecurring();

  const existing = useMemo(
    () => templates.find(t => t.id === route.params?.id) ?? null,
    [route.params?.id, templates],
  );
  const isEdit = Boolean(existing);

  const [name, setName] = useState('');
  const [investmentType, setInvestmentType] = useState<SipInvestmentType | null>(null);
  const [schemeCode, setSchemeCode] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('MONTHLY');
  const [dayOfMonth, setDayOfMonth] = useState(5);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

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
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setInvestmentType(existing.investmentType ?? 'MUTUAL_FUND');
      setSchemeCode(existing.investmentSchemeCode ?? null);
      setAmount(String(existing.amount));
      setFromAccountId(existing.fromAccountId ?? '');
      setFrequency(existing.frequency ?? 'MONTHLY');
      setDayOfMonth(existing.dayOfMonth);
      setDayOfWeek(existing.dayOfWeek ?? 1);
      setNotes(existing.notes ?? '');
      setActive(existing.active);
      setInitialized(true);
      return;
    }
    if (!initialized && defaultFromAccountId) {
      setFromAccountId(defaultFromAccountId);
      setInitialized(true);
    }
  }, [defaultFromAccountId, existing, initialized]);

  function changeType(next: SipInvestmentType) {
    if (next === investmentType) {
      return;
    }
    // Switching asset class invalidates the chosen name + scheme.
    setInvestmentType(next);
    setName('');
    setSchemeCode(null);
  }

  async function save() {
    if (!user || !settings) {
      return;
    }
    if (!investmentType) {
      toast.error('Choose an investment type first.');
      return;
    }
    if (!name.trim()) {
      toast.error('Name your SIP first.');
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }

    const scheduleChanged =
      !existing ||
      existing.frequency !== frequency ||
      (frequency === 'MONTHLY'
        ? existing.dayOfMonth !== dayOfMonth
        : existing.dayOfWeek !== dayOfWeek);
    const nextRunDate =
      isEdit && existing && !scheduleChanged
        ? existing.nextRunDate
        : computeInitialRunDate(frequency, dayOfMonth, dayOfWeek, timezone);

    const input = {
      name: name.trim(),
      type: 'INVESTMENT' as const,
      amount: parsedAmount,
      fromAccountId: fromAccountId || null,
      toAccountId: null,
      categoryId: null,
      merchant: name.trim(),
      notes,
      frequency,
      dayOfMonth,
      dayOfWeek,
      nextRunDate,
      autoConfirm: false,
      active,
      investmentType,
      investmentSchemeCode: schemeCode,
      autoCreateTransaction: true,
      notificationsEnabled: true,
    };

    setBusy(true);
    try {
      if (isEdit && existing) {
        await updateRecurringTemplate(user.uid, existing.id, input, accounts);
        toast.success('SIP updated.');
      } else {
        await createRecurringTemplate(user.uid, input, accounts, timezone);
        toast.success('SIP created.');
      }
      navigation.goBack();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not save SIP.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!user || !existing) {
      return;
    }
    const ok = await dialog.confirm({
      title: 'Remove SIP?',
      message: `"${existing.name}" will be removed permanently.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) {
      await performDelete();
    }
  }

  async function performDelete() {
    if (!user || !existing) {
      return;
    }
    setBusy(true);
    try {
      await deleteRecurringTemplate(user.uid, existing.id);
      toast.success('SIP removed.');
      navigation.goBack();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not remove SIP.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Edit SIP' : 'New SIP'}
        subtitle="Track from one account"
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
          <Field label="Type">
            <ScrollRow>
              {SIP_INVESTMENT_TYPE_OPTIONS.map(option => (
                <Chip
                  key={option.value}
                  label={option.label}
                  active={investmentType === option.value}
                  onPress={() => changeType(option.value)}
                />
              ))}
            </ScrollRow>
          </Field>

          <View style={styles.nameZone}>
            <Field label="Name">
              <InvestmentNameField
                investmentType={investmentType}
                value={name}
                onChangeText={text => {
                  setName(text);
                  setSchemeCode(null);
                }}
                onSelectResult={(fundName, code) => {
                  setName(fundName);
                  setSchemeCode(code);
                }}
              />
            </Field>
          </View>

          <Field label="Amount">
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="5000"
              placeholderTextColor={colors.ink400}
            />
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

          <Field label="Frequency">
            <View style={styles.freqRow}>
              <Chip
                label="Monthly"
                active={frequency === 'MONTHLY'}
                onPress={() => setFrequency('MONTHLY')}
              />
              <Chip
                label="Weekly"
                active={frequency === 'WEEKLY'}
                onPress={() => setFrequency('WEEKLY')}
              />
              <Chip
                label="Bi-weekly"
                active={frequency === 'BIWEEKLY'}
                onPress={() => setFrequency('BIWEEKLY')}
              />
            </View>
          </Field>

          <Field label={frequency === 'MONTHLY' ? 'SIP date' : 'SIP day'}>
            {frequency === 'MONTHLY' ? (
              <DayOfMonthPicker
                value={dayOfMonth}
                onChange={setDayOfMonth}
                timezone={timezone}
              />
            ) : (
              <DayOfWeekPicker
                value={dayOfWeek}
                onChange={setDayOfWeek}
                frequency={frequency}
                timezone={timezone}
              />
            )}
          </Field>

          <Field label="Notes (optional)">
            <TextInput
              style={[styles.input, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Folio, fund house…"
              placeholderTextColor={colors.ink400}
            />
          </Field>

          <View style={styles.toggleRow}>
            <AppText style={styles.toggleLabel}>Active</AppText>
            <Toggle value={active} onValueChange={setActive} />
          </View>

          <AppText variant="xs" muted style={styles.hint}>
            On each SIP run, a pending entry is added automatically. Open Pending
            and tap ✓ to confirm.
          </AppText>

          {isEdit ? (
            <PressableScale onPress={remove} disabled={busy} scaleTo={0.98}>
              <View style={styles.deleteRow}>
                <IconTrash size={18} color={colors.expense} />
                <AppText style={styles.delete}>Remove this SIP</AppText>
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
        <AppText variant="xs" style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  flex: {flex: 1},
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
  field: {gap: 8},
  // Lifts the Name field (and its suggestion dropdown) above the fields below it.
  nameZone: {zIndex: 20},
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
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
  },
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
  delete: {
    color: colors.expense,
    fontWeight: '700',
  },
});
