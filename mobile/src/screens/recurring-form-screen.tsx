import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {
  computeInitialRunDate,
  type Account,
  type RecurringFrequency,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Toggle} from '@/components/ui/toggle';
import {ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {DayOfMonthPicker} from '@/components/sip/day-of-month-picker';
import {DayOfWeekPicker} from '@/components/sip/day-of-week-picker';
import {KeyboardAwareScrollView} from '@/components/ui/keyboard-aware-scroll-view';
import {IconCheck, IconTrash} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useRecurring} from '@/hooks/use-recurring';
import {useUserSettings} from '@/hooks/use-user-settings';
import {useCategories} from '@/providers/ledger-data-provider';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {
  createRecurringTemplate,
  deleteRecurringTemplate,
  updateRecurringTemplate,
  type RecurringTemplateInput,
} from '@/lib/recurring/service';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

type FormType = 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'LIABILITY_PAYMENT';

const TYPE_OPTIONS: {value: FormType; label: string}[] = [
  {value: 'EXPENSE', label: 'Expense'},
  {value: 'INCOME', label: 'Income'},
  {value: 'TRANSFER', label: 'Transfer'},
  {value: 'LIABILITY_PAYMENT', label: 'Bill / EMI'},
];

export function RecurringFormScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'RecurringForm'>>();
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const {accounts} = useAccounts();
  const {categories} = useCategories();
  const {settings} = useUserSettings();
  const {templates} = useRecurring();

  const existing = useMemo(
    () => templates.find(t => t.id === route.params?.id) ?? null,
    [route.params?.id, templates],
  );
  const isEdit = Boolean(existing);
  const timezone = settings?.timezone ?? 'Asia/Kolkata';

  const [type, setType] = useState<FormType>('EXPENSE');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('MONTHLY');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (existing && !initialized) {
      // SIPs are edited in the SIP form; this screen only handles cash-flow types.
      const t = existing.type === 'INVESTMENT' ? 'EXPENSE' : (existing.type as FormType);
      setType(t);
      setName(existing.name);
      setAmount(String(existing.amount));
      setFromAccountId(existing.fromAccountId ?? '');
      setToAccountId(existing.toAccountId ?? '');
      setCategoryId(existing.categoryId ?? '');
      setFrequency(existing.frequency);
      setDayOfMonth(existing.dayOfMonth);
      setDayOfWeek(existing.dayOfWeek);
      setAutoConfirm(existing.autoConfirm);
      setActive(existing.active);
      setNotes(existing.notes ?? '');
      setInitialized(true);
    }
  }, [existing, initialized]);

  const assetAccounts = useMemo(
    () => accounts.filter(a => a.class === 'ASSET' && !a.archived),
    [accounts],
  );
  const liabilityAccounts = useMemo(
    () => accounts.filter(a => a.class === 'LIABILITY' && !a.archived),
    [accounts],
  );
  const userCategories = useMemo(
    () => categories.filter(c => !c.system || c.id === 'other'),
    [categories],
  );

  function changeType(next: FormType) {
    setType(next);
    setFromAccountId('');
    setToAccountId('');
    setCategoryId('');
  }

  function buildInput(): RecurringTemplateInput {
    const parsedAmount = Number(amount);
    const scheduleChanged =
      !existing ||
      existing.frequency !== frequency ||
      (frequency === 'MONTHLY'
        ? existing.dayOfMonth !== dayOfMonth
        : existing.dayOfWeek !== dayOfWeek);
    const nextRunDate =
      existing && !scheduleChanged
        ? existing.nextRunDate
        : computeInitialRunDate(frequency, dayOfMonth, dayOfWeek, timezone);

    return {
      name: name.trim(),
      type,
      amount: parsedAmount,
      fromAccountId:
        type === 'EXPENSE' || type === 'TRANSFER' || type === 'LIABILITY_PAYMENT'
          ? fromAccountId || null
          : null,
      toAccountId:
        type === 'INCOME' || type === 'TRANSFER' || type === 'LIABILITY_PAYMENT'
          ? toAccountId || null
          : null,
      categoryId: type === 'EXPENSE' ? categoryId || null : null,
      merchant: name.trim(),
      notes,
      frequency,
      dayOfMonth,
      dayOfWeek,
      nextRunDate,
      autoConfirm,
      active,
      autoCreateTransaction: false,
      notificationsEnabled: false,
    };
  }

  async function save() {
    if (!user || busy) {
      return;
    }
    if (!name.trim()) {
      toast.error('Name this template first.');
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }

    setBusy(true);
    try {
      const input = buildInput();
      if (isEdit && existing) {
        await updateRecurringTemplate(user.uid, existing.id, input, accounts);
        toast.success('Template updated.');
      } else {
        await createRecurringTemplate(user.uid, input, accounts, timezone);
        toast.success('Recurring template created.');
      }
      navigation.goBack();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not save template.'));
      setBusy(false);
    }
  }

  async function remove() {
    if (!user || !existing) {
      return;
    }
    const ok = await dialog.confirm({
      title: 'Remove template?',
      message: `"${existing.name}" will stop generating entries. Past entries stay in your ledger.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    setBusy(true);
    try {
      await deleteRecurringTemplate(user.uid, existing.id);
      toast.success('Template removed.');
      navigation.goBack();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not remove template.'));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Edit recurring' : 'New recurring'}
        subtitle="Salary, rent, bills & transfers"
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
                {TYPE_OPTIONS.map(option => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    active={type === option.value}
                    onPress={() => changeType(option.value)}
                  />
                ))}
              </ScrollRow>
            </Field>

            <Field label="Name">
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={type === 'INCOME' ? 'Salary' : 'Rent'}
                placeholderTextColor={colors.ink400}
              />
            </Field>

            <Field label="Amount">
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.ink400}
              />
            </Field>

            {type === 'INCOME' ? (
              <AccountField
                label="Deposited to"
                options={assetAccounts}
                value={toAccountId}
                onChange={setToAccountId}
              />
            ) : null}

            {type === 'EXPENSE' ? (
              <>
                <AccountField
                  label="Paid from"
                  options={[...assetAccounts, ...liabilityAccounts]}
                  value={fromAccountId}
                  onChange={setFromAccountId}
                />
                <Field label="Category">
                  <ScrollRow>
                    {userCategories.map(c => (
                      <Chip
                        key={c.id}
                        label={c.name}
                        active={categoryId === c.id}
                        onPress={() => setCategoryId(c.id)}
                      />
                    ))}
                  </ScrollRow>
                </Field>
              </>
            ) : null}

            {type === 'TRANSFER' ? (
              <>
                <AccountField
                  label="From"
                  options={assetAccounts}
                  value={fromAccountId}
                  onChange={setFromAccountId}
                />
                <AccountField
                  label="To"
                  options={assetAccounts.filter(a => a.id !== fromAccountId)}
                  value={toAccountId}
                  onChange={setToAccountId}
                />
              </>
            ) : null}

            {type === 'LIABILITY_PAYMENT' ? (
              <>
                <AccountField
                  label="Paid from"
                  options={assetAccounts}
                  value={fromAccountId}
                  onChange={setFromAccountId}
                />
                <AccountField
                  label="Towards"
                  options={liabilityAccounts}
                  value={toAccountId}
                  onChange={setToAccountId}
                />
              </>
            ) : null}

            <Field label="Frequency">
              <View style={styles.row}>
                <Chip label="Monthly" active={frequency === 'MONTHLY'} onPress={() => setFrequency('MONTHLY')} />
                <Chip label="Weekly" active={frequency === 'WEEKLY'} onPress={() => setFrequency('WEEKLY')} />
                <Chip label="Bi-weekly" active={frequency === 'BIWEEKLY'} onPress={() => setFrequency('BIWEEKLY')} />
              </View>
            </Field>

            {frequency === 'MONTHLY' ? (
              <Field label="Day of month">
                <DayOfMonthPicker
                  value={dayOfMonth}
                  onChange={setDayOfMonth}
                  timezone={timezone}
                  nextLabel="Next run will be on"
                />
              </Field>
            ) : (
              <Field label="Day of week">
                <DayOfWeekPicker
                  value={dayOfWeek}
                  onChange={setDayOfWeek}
                  frequency={frequency}
                  timezone={timezone}
                  nextLabel="Next run will be on"
                />
              </Field>
            )}

            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <AppText style={styles.toggleLabel}>Add automatically</AppText>
                <AppText variant="xs" muted>
                  {autoConfirm ? 'Posts to your ledger on the date' : 'Lands in Pending to review first'}
                </AppText>
              </View>
              <Toggle value={autoConfirm} onValueChange={setAutoConfirm} />
            </View>

            <View style={styles.toggleRow}>
              <AppText style={styles.toggleLabel}>Active</AppText>
              <Toggle value={active} onValueChange={setActive} />
            </View>

            <Field label="Notes (optional)">
              <TextInput
                style={[styles.input, styles.notes]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Anything to remember…"
                placeholderTextColor={colors.ink400}
              />
            </Field>

            {isEdit ? (
              <PressableScale onPress={remove} disabled={busy} scaleTo={0.98}>
                <View style={styles.deleteRow}>
                  <IconTrash size={18} color={colors.expense} />
                  <AppText style={styles.delete}>Remove this template</AppText>
                </View>
              </PressableScale>
            ) : null}
          </FadeInView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function AccountField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Account[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Field label={label}>
      {options.length === 0 ? (
        <AppText variant="sm" muted style={styles.hint}>
          No eligible account — add one first.
        </AppText>
      ) : (
        <ScrollRow>
          {options.map(account => (
            <Chip
              key={account.id}
              label={account.name}
              active={value === account.id}
              onPress={() => onChange(account.id)}
            />
          ))}
        </ScrollRow>
      )}
    </Field>
  );
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return (
    <View style={styles.field}>
      <AppText variant="sm" style={styles.fieldLabel}>
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
  fieldLabel: {fontWeight: '700', color: colors.ink700},
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
  notes: {minHeight: 64, textAlignVertical: 'top'},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 2},
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
  hint: {lineHeight: 18},
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
  deleteRow: {
    marginTop: spacing.sm,
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
