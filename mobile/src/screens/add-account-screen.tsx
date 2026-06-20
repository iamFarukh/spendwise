import {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {type Account, toDateStringInTimezone} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {Toggle} from '@/components/ui/toggle';
import {ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconCheck} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {ACCOUNT_PRESETS, getPreset} from '@/lib/accounts/presets';
import {createAccount} from '@/lib/accounts/service';
import {useAccounts} from '@/hooks/use-accounts';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {updateUserSettings} from '@/lib/settings/service';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

export function AddAccountScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {user} = useAuth();
  const toast = useToast();
  const {accounts} = useAccounts();
  const {settings} = useUserSettings();

  const [presetKey, setPresetKey] = useState('bank');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [makePrimary, setMakePrimary] = useState(false);
  const [busy, setBusy] = useState(false);

  const preset = getPreset(presetKey);
  const timezone = settings?.timezone ?? 'Asia/Kolkata';
  const asOfDate =
    settings?.asOfDate ?? toDateStringInTimezone(new Date(), timezone);

  async function save() {
    if (!user) {
      return;
    }
    if (!name.trim()) {
      toast.error('Name this account first.');
      return;
    }
    const openingBalance = balance === '' ? 0 : Number(balance);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      toast.error('Opening balance cannot be negative.');
      return;
    }
    setBusy(true);
    try {
      const trimmed = name.trim();
      const id = await createAccount(user.uid, {
        name: trimmed,
        class: preset.class,
        kind: preset.kind,
        icon: preset.icon,
        color: preset.color,
        isPrimary: makePrimary && preset.class === 'ASSET',
        sortOrder: accounts.length,
        openingBalance,
        asOfDate,
      });
      if (makePrimary && preset.class === 'ASSET') {
        const created: Account = {
          id,
          name: trimmed,
          class: preset.class,
          kind: preset.kind,
          isPrimary: true,
          reconcileCadence: 'MONTHLY',
          smsIdentifiers: [],
          icon: preset.icon,
          color: preset.color,
          sortOrder: accounts.length,
          archived: false,
        };
        await updateUserSettings(
          user.uid,
          {primaryAccountId: id},
          [...accounts, created],
        );
      }
      toast.success('Account added.');
      navigation.goBack();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not add account.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Add account"
        titleSize={20}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <FadeInView style={styles.bodyInner}>
          <View style={styles.preview}>
            <IconBadge icon={preset.glyph} tone={preset.tone} size="lg" />
            <AppText variant="xs" muted style={styles.previewLabel}>
              {preset.label}
            </AppText>
          </View>

          <AppText variant="sm" style={styles.label}>
            Account type
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.presets}>
            {ACCOUNT_PRESETS.map(p => {
              const active = p.key === presetKey;
              return (
                <PressableScale
                  key={p.key}
                  onPress={() => setPresetKey(p.key)}
                  scaleTo={0.93}>
                  <View style={[styles.preset, active && styles.presetActive]}>
                    <AppText
                      variant="sm"
                      style={[styles.presetText, active && styles.presetTextActive]}>
                      {p.label}
                    </AppText>
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>

          <AppText variant="sm" style={styles.label}>
            Name
          </AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. HDFC Savings"
            placeholderTextColor={colors.ink400}
            autoCapitalize="words"
            style={styles.input}
          />

          <AppText variant="sm" style={styles.label}>
            {preset.balanceLabel}
          </AppText>
          <TextInput
            value={balance}
            onChangeText={t => setBalance(t.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            placeholderTextColor={colors.ink400}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          {preset.class === 'ASSET' ? (
            <View style={styles.primaryRow}>
              <View style={styles.primaryText}>
                <AppText style={styles.primaryTitle}>Set as primary</AppText>
                <AppText variant="xs" muted>
                  Default account for quick-add
                </AppText>
              </View>
              <Toggle value={makePrimary} onValueChange={setMakePrimary} />
            </View>
          ) : null}
          </FadeInView>
        </ScrollView>

        <View style={styles.footer}>
          <PressableScale
            onPress={save}
            disabled={busy}
            style={[styles.saveBtn, busy && styles.saveBtnDisabled]}>
            <IconCheck size={20} color={colors.white} strokeWidth={2.4} />
            <AppText style={styles.saveText}>
              {busy ? 'Saving…' : 'Add account'}
            </AppText>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  flex: {flex: 1},
  body: {paddingHorizontal: spacing.lg, paddingBottom: spacing.xl},
  bodyInner: {gap: spacing.sm},
  preview: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md},
  previewLabel: {fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
  label: {fontWeight: '700', color: colors.ink700, marginTop: spacing.sm},
  presets: {gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.lg},
  preset: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  presetActive: {backgroundColor: colors.mint500, borderColor: colors.mint500},
  presetText: {color: colors.ink600, fontWeight: '700'},
  presetTextActive: {color: colors.white},
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
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 14,
    marginTop: spacing.md,
  },
  primaryText: {flex: 1},
  primaryTitle: {fontWeight: '700', fontSize: 15, color: colors.ink900},
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.mint500,
    marginVertical: spacing.sm,
    ...shadow.sm,
  },
  saveBtnDisabled: {opacity: 0.6},
  saveText: {color: colors.white, fontWeight: '700', fontSize: 16},
});
