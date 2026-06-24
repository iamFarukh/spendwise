import {useEffect, useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {canReconcileAccount, type ReconcileCadence} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {ScreenHeader} from '@/components/ui/screen-header';
import {KeyboardAwareScrollView} from '@/components/ui/keyboard-aware-scroll-view';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconCheck, IconStar, IconSwap, IconTrash} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {archiveAccount, updateAccount} from '@/lib/accounts/service';
import {
  ACCOUNT_CLASS_LABEL,
  getAccountVisual,
  resolvePrimaryAccountId,
} from '@/lib/ledger/account-display';
import {updateUserSettings} from '@/lib/settings/service';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

const CADENCES: {value: ReconcileCadence; label: string}[] = [
  {value: 'WEEKLY', label: 'Weekly'},
  {value: 'MONTHLY', label: 'Monthly'},
  {value: 'MANUAL', label: 'Manual'},
  {value: 'NEVER', label: 'Never'},
];

export function AccountEditScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'AccountEdit'>>();
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const {accounts} = useAccounts();
  const {settings} = useUserSettings();

  const account = accounts.find(a => a.id === route.params.accountId) ?? null;

  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<ReconcileCadence>('MONTHLY');
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account && !initialized) {
      setName(account.name);
      setCadence(account.reconcileCadence);
      setInitialized(true);
    }
  }, [account, initialized]);

  const isAsset = account?.class === 'ASSET';
  const isPrimary = account
    ? resolvePrimaryAccountId(accounts, settings?.primaryAccountId) === account.id
    : false;
  const reconcilable = account ? canReconcileAccount(account) : false;

  async function save() {
    if (!user || !account || busy) {
      return;
    }
    if (!name.trim()) {
      toast.error('Name this account first.');
      return;
    }
    setBusy(true);
    try {
      await updateAccount(user.uid, account.id, {
        name: name.trim(),
        reconcileCadence: cadence,
      });
      toast.success('Account updated.');
      navigation.goBack();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not update account.'));
      setBusy(false);
    }
  }

  async function makePrimary() {
    if (!user || !account || busy || isPrimary || !isAsset) {
      return;
    }
    setBusy(true);
    try {
      await updateUserSettings(user.uid, {primaryAccountId: account.id}, accounts);
      toast.success(`${account.name} is now your primary account.`);
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not set primary.'));
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!user || !account || busy) {
      return;
    }
    if (isPrimary) {
      toast.error('Set another account as primary before archiving this one.');
      return;
    }
    const ok = await dialog.confirm({
      title: 'Archive account?',
      message: `"${account.name}" will be hidden from balances and lists. Its history stays in your ledger.`,
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    setBusy(true);
    try {
      await archiveAccount(user.uid, account.id);
      toast.success('Account archived.');
      navigation.goBack();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not archive account.'));
      setBusy(false);
    }
  }

  if (!account) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Account" titleSize={20} onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <AppText variant="body" muted>
            This account is no longer available.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const {icon, tone} = getAccountVisual(account);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Edit account"
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
            <View style={styles.preview}>
              <IconBadge icon={icon} tone={tone} size="lg" />
              <AppText variant="xs" muted style={styles.previewLabel}>
                {ACCOUNT_CLASS_LABEL[account.class]} · {account.kind.toLowerCase()}
              </AppText>
            </View>

            <AppText variant="sm" style={styles.label}>
              Name
            </AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Account name"
              placeholderTextColor={colors.ink400}
              autoCapitalize="words"
              style={styles.input}
            />

            <AppText variant="sm" style={styles.label}>
              Reconcile reminder
            </AppText>
            <View style={styles.chips}>
              {CADENCES.map(c => {
                const active = c.value === cadence;
                return (
                  <PressableScale
                    key={c.value}
                    onPress={() => setCadence(c.value)}
                    scaleTo={0.93}>
                    <View style={[styles.chip, active && styles.chipActive]}>
                      <AppText
                        variant="sm"
                        style={[styles.chipText, active && styles.chipTextActive]}>
                        {c.label}
                      </AppText>
                    </View>
                  </PressableScale>
                );
              })}
            </View>

            {isAsset && !isPrimary ? (
              <PressableScale onPress={makePrimary} disabled={busy} style={styles.actionRow} scaleTo={0.98}>
                <IconStar size={18} color={colors.mint700} />
                <View style={styles.actionText}>
                  <AppText style={styles.actionTitle}>Set as primary</AppText>
                  <AppText variant="xs" muted>
                    Default account for quick-add
                  </AppText>
                </View>
              </PressableScale>
            ) : null}

            {isPrimary ? (
              <View style={[styles.actionRow, styles.actionRowStatic]}>
                <IconStar size={18} color={colors.income} />
                <AppText style={styles.actionTitle}>This is your primary account</AppText>
              </View>
            ) : null}

            {reconcilable ? (
              <PressableScale
                onPress={() => navigation.navigate('Reconcile', {accountId: account.id})}
                style={styles.actionRow}
                scaleTo={0.98}>
                <IconSwap size={18} color={colors.mint700} />
                <View style={styles.actionText}>
                  <AppText style={styles.actionTitle}>Reconcile now</AppText>
                  <AppText variant="xs" muted>
                    Match this balance to a statement
                  </AppText>
                </View>
              </PressableScale>
            ) : null}

            <PressableScale onPress={archive} disabled={busy} style={styles.archiveRow} scaleTo={0.98}>
              <IconTrash size={18} color={colors.expense} />
              <AppText style={styles.archiveText}>Archive account</AppText>
            </PressableScale>
          </FadeInView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  flex: {flex: 1},
  missing: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mint600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {padding: spacing.lg, paddingBottom: spacing.xl},
  bodyInner: {gap: spacing.sm},
  preview: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md},
  previewLabel: {fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
  label: {fontWeight: '700', color: colors.ink700, marginTop: spacing.sm},
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink900,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {backgroundColor: colors.mint500, borderColor: colors.mint500},
  chipText: {color: colors.ink600, fontWeight: '700'},
  chipTextActive: {color: colors.white},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 14,
    marginTop: spacing.sm,
  },
  actionRowStatic: {backgroundColor: colors.tint, borderColor: colors.mint200},
  actionText: {flex: 1},
  actionTitle: {fontWeight: '700', fontSize: 15, color: colors.ink900},
  archiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  archiveText: {color: colors.expense, fontWeight: '700', fontSize: 15},
});
