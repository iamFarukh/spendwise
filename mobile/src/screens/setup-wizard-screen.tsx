import {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {toDateStringInTimezone} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {
  IconCheck,
  IconClose,
  IconPlus,
  IconShield,
  LogoMark,
} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {ACCOUNT_PRESETS, getPreset} from '@/lib/accounts/presets';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {formatLedgerMoney} from '@/lib/format/currency';
import {completeMobileSetup} from '@/lib/setup/service';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';

type Draft = {
  localId: string;
  presetKey: string;
  name: string;
  balance: number;
};

const TIMEZONE = 'Asia/Kolkata';
let draftCounter = 0;

function validateDrafts(accounts: Draft[]): void {
  const names = new Set<string>();
  for (const draft of accounts) {
    const key = draft.name.trim().toLowerCase();
    if (!key) {
      throw new Error('Every account needs a name.');
    }
    if (names.has(key)) {
      throw new Error(`Duplicate account name: ${draft.name.trim()}`);
    }
    names.add(key);
    if (draft.balance < 0) {
      throw new Error(
        `Opening balance for ${draft.name.trim()} cannot be negative.`,
      );
    }
  }
}

export function SetupWizardScreen() {
  const {user, signOut} = useAuth();
  const toast = useToast();

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [presetKey, setPresetKey] = useState('bank');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [busy, setBusy] = useState(false);

  const preset = getPreset(presetKey);
  const canFinish = drafts.length > 0 || name.trim().length > 0;

  function buildDraftFromForm(): Draft | null {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }
    const amount = balance === '' ? 0 : Number(balance);
    if (!Number.isFinite(amount)) {
      throw new Error('Enter a valid opening balance.');
    }
    draftCounter += 1;
    return {
      localId: `d-${draftCounter}`,
      presetKey,
      name: trimmed,
      balance: amount,
    };
  }

  function addDraft() {
    try {
      const draft = buildDraftFromForm();
      if (!draft) {
        toast.error('Name this account first.');
        return;
      }
      if (
        drafts.some(d => d.name.trim().toLowerCase() === draft.name.toLowerCase())
      ) {
        toast.error('You already added an account with this name.');
        return;
      }
      setDrafts(current => [...current, draft]);
      setName('');
      setBalance('');
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err));
    }
  }

  function removeDraft(localId: string) {
    setDrafts(current => current.filter(d => d.localId !== localId));
  }

  async function finish() {
    if (!user) {
      return;
    }
    const pending = buildDraftFromForm();
    const accountsToCreate = pending ? [...drafts, pending] : drafts;
    if (accountsToCreate.length === 0) {
      toast.error('Add at least one account to continue.');
      return;
    }
    if (pending) {
      setDrafts(accountsToCreate);
      setName('');
      setBalance('');
    }
    setBusy(true);
    const asOfDate = toDateStringInTimezone(new Date(), TIMEZONE);
    try {
      validateDrafts(accountsToCreate);
      const setupAccounts = accountsToCreate.map(draft => {
        const p = getPreset(draft.presetKey);
        return {
          id: crypto.randomUUID(),
          name: draft.name,
          class: p.class,
          kind: p.kind,
          icon: p.icon,
          color: p.color,
          openingBalance: draft.balance,
        };
      });
      await completeMobileSetup(user.uid, {
        accounts: setupAccounts,
        baseCurrency: 'INR',
        timezone: TIMEZONE,
        asOfDate,
      });
      toast.success('You’re all set!');
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not finish setup.'));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <LogoMark size={40} />
            <AppText style={styles.brandText}>SpendWise</AppText>
          </View>
          <AppText style={styles.title}>Add the accounts you use</AppText>
          <AppText variant="body" muted style={styles.subtitle}>
            Anywhere money sits — bank, cash, a card you owe on. Today’s balance
            becomes your day-zero opening entry.
          </AppText>

          <View style={styles.note}>
            <IconShield size={20} color={colors.mint600} />
            <AppText variant="sm" style={styles.noteText}>
              Each balance is recorded as an OPENING entry — your ledger’s
              starting point. You can edit accounts later.
            </AppText>
          </View>

          {drafts.map((draft, index) => {
            const p = getPreset(draft.presetKey);
            return (
              <FadeInView key={draft.localId} index={index}>
                <View style={styles.draftRow}>
                  <IconBadge icon={p.glyph} tone={p.tone} size="md" />
                  <View style={styles.draftInfo}>
                    <AppText style={styles.draftName}>{draft.name}</AppText>
                    <AppText variant="xs" muted>
                      {p.label} ·{' '}
                      {formatLedgerMoney(draft.balance, {baseCurrency: 'INR'})}
                    </AppText>
                  </View>
                  <PressableScale
                    onPress={() => removeDraft(draft.localId)}
                    hitSlop={10}>
                    <IconClose size={18} color={colors.ink400} />
                  </PressableScale>
                </View>
              </FadeInView>
            );
          })}

          <View style={styles.form}>
            <AppText variant="sm" style={styles.formLabel}>
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

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Account name · e.g. HDFC Savings"
              placeholderTextColor={colors.ink400}
              autoCapitalize="words"
              style={styles.input}
            />
            <TextInput
              value={balance}
              onChangeText={t => setBalance(t.replace(/[^0-9.]/g, ''))}
              placeholder={preset.balanceLabel}
              placeholderTextColor={colors.ink400}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <PressableScale onPress={addDraft} style={styles.addBtn} scaleTo={0.97}>
              <IconPlus size={18} color={colors.mint700} strokeWidth={2.4} />
              <AppText style={styles.addBtnText}>Add account</AppText>
            </PressableScale>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PressableScale
            onPress={finish}
            disabled={busy || !canFinish}
            style={[
              styles.finishBtn,
              (busy || !canFinish) && styles.finishBtnDisabled,
            ]}>
            <IconCheck size={20} color={colors.white} strokeWidth={2.4} />
            <AppText style={styles.finishText}>
              {busy
                ? 'Setting up…'
                : `Finish setup${drafts.length ? ` · ${drafts.length}` : ''}`}
            </AppText>
          </PressableScale>
          <Pressable onPress={() => signOut()} hitSlop={8}>
            <AppText variant="sm" style={styles.signOut}>
              Sign out
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  flex: {flex: 1},
  body: {padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: spacing.sm},
  brandText: {fontWeight: '700', fontSize: 18, color: colors.ink900},
  title: {fontWeight: '700', fontSize: 24, letterSpacing: -0.5, color: colors.ink900},
  subtitle: {marginTop: 4, marginBottom: spacing.md, lineHeight: 21},
  note: {
    flexDirection: 'row',
    gap: 11,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.mint200,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: spacing.sm,
  },
  noteText: {flex: 1, color: colors.ink700, lineHeight: 19},
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 13,
  },
  draftInfo: {flex: 1, minWidth: 0},
  draftName: {fontWeight: '700', fontSize: 15, color: colors.ink900},
  form: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  formLabel: {fontWeight: '700', color: colors.ink700},
  presets: {gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.lg},
  preset: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
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
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink900,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.mint100,
  },
  addBtnText: {color: colors.mint700, fontWeight: '700', fontSize: 15},
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.mint500,
    marginTop: spacing.sm,
    ...shadow.sm,
  },
  finishBtnDisabled: {opacity: 0.5},
  finishText: {color: colors.white, fontWeight: '700', fontSize: 16},
  signOut: {textAlign: 'center', color: colors.ink500, fontWeight: '600', paddingVertical: 6},
});
