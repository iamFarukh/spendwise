import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
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
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {SIP_INVESTMENT_TYPE_OPTIONS, type SipInvestmentType} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {useKeyboardAwareScroll} from '@/components/ui/keyboard-aware-scroll-view';
import {IconBadge} from '@/components/ui/icon-badge';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {SetupStep} from '@/components/setup/setup-step';
import {StepIllustration} from '@/components/setup/step-illustration';
import {DayOfMonthPicker} from '@/components/sip/day-of-month-picker';
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconPlus,
  IconShield,
} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {ACCOUNT_PRESETS, getPreset} from '@/lib/accounts/presets';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {formatLedgerMoney} from '@/lib/format/currency';
import {hapticLight} from '@/lib/haptics';
import {completeMobileSetup, type MobileSetupSipInput} from '@/lib/setup/service';
import {useAuth} from '@/providers/auth-provider';
import {useSetupCompletion} from '@/providers/setup-completion-provider';
import {useToast} from '@/providers/toast-provider';

type Draft = {
  id: string;
  presetKey: string;
  name: string;
  balance: number;
};

const TIMEZONE = 'Asia/Kolkata';
const TOTAL_STEPS = 5;

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
  const {celebrate} = useSetupCompletion();

  const [step, setStep] = useState(0);

  // ---- Account-step state ----
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [presetKey, setPresetKey] = useState('bank');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  // ---- SIP-step state ----
  const [sipName, setSipName] = useState('');
  const [sipType, setSipType] = useState<SipInvestmentType>('MUTUAL_FUND');
  const [sipAmount, setSipAmount] = useState('');
  const [sipFromAccountId, setSipFromAccountId] = useState('');
  const [sipDay, setSipDay] = useState(5);

  const [busy, setBusy] = useState(false);

  const preset = getPreset(presetKey);

  const assetDrafts = useMemo(
    () => drafts.filter(d => getPreset(d.presetKey).class === 'ASSET'),
    [drafts],
  );

  // Default the SIP source to the first asset account once we reach that step.
  useEffect(() => {
    if (assetDrafts.length === 0) {
      if (sipFromAccountId) {
        setSipFromAccountId('');
      }
      return;
    }
    if (!assetDrafts.some(d => d.id === sipFromAccountId)) {
      setSipFromAccountId(assetDrafts[0].id);
    }
  }, [assetDrafts, sipFromAccountId]);

  function buildDraftFromForm(): Draft | null {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }
    const amount = balance === '' ? 0 : Number(balance);
    if (!Number.isFinite(amount)) {
      throw new Error('Enter a valid opening balance.');
    }
    return {
      id: crypto.randomUUID(),
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
      hapticLight();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err));
    }
  }

  function removeDraft(id: string) {
    setDrafts(current => current.filter(d => d.id !== id));
  }

  /** Commit any half-typed account on the form, returning the full list. */
  function commitPendingAccount(): Draft[] | null {
    try {
      const pending = buildDraftFromForm();
      if (!pending) {
        return drafts;
      }
      if (
        drafts.some(
          d => d.name.trim().toLowerCase() === pending.name.toLowerCase(),
        )
      ) {
        toast.error('You already added an account with this name.');
        return null;
      }
      const next = [...drafts, pending];
      setDrafts(next);
      setName('');
      setBalance('');
      return next;
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err));
      return null;
    }
  }

  function goNext() {
    hapticLight();
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    hapticLight();
    setStep(s => Math.max(s - 1, 0));
  }

  function continueFromAccounts() {
    const committed = commitPendingAccount();
    if (!committed) {
      return;
    }
    if (committed.length === 0) {
      toast.error('Add at least one account to continue.');
      return;
    }
    goNext();
  }

  async function finish(includeSip: boolean) {
    if (!user || busy) {
      return;
    }
    if (drafts.length === 0) {
      toast.error('Add at least one account first.');
      setStep(1);
      return;
    }

    let sip: MobileSetupSipInput | null = null;
    if (includeSip) {
      const trimmedSip = sipName.trim();
      if (!trimmedSip) {
        toast.error('Name your SIP, or tap Skip for now.');
        return;
      }
      const amount = Number(sipAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error('Enter a SIP amount greater than zero.');
        return;
      }
      if (!sipFromAccountId) {
        toast.error('Add a bank or cash account to fund this SIP.');
        return;
      }
      sip = {
        name: trimmedSip,
        amount,
        fromAccountId: sipFromAccountId,
        dayOfMonth: sipDay,
        investmentType: sipType,
        notes: '',
      };
    }

    hapticLight();
    setBusy(true);

    const accountsToCreate = drafts;
    const setupAccounts = accountsToCreate.map(draft => {
      const p = getPreset(draft.presetKey);
      return {
        id: draft.id,
        name: draft.name,
        class: p.class,
        kind: p.kind,
        icon: p.icon,
        color: p.color,
        openingBalance: draft.balance,
      };
    });

    try {
      validateDrafts(accountsToCreate);
      await celebrate(async () => {
        await completeMobileSetup(user.uid, {
          accounts: setupAccounts,
          baseCurrency: 'INR',
          timezone: TIMEZONE,
          sip,
        });
      });
      // On success the navigator has already swapped to Home beneath the
      // celebration overlay — nothing left to do here.
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not finish setup.'));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {step > 0 ? (
          <PressableScale onPress={goBack} hitSlop={10} style={styles.backBtn} disabled={busy}>
            <IconChevronLeft size={22} color={colors.ink700} />
          </PressableScale>
        ) : (
          <View style={styles.backBtn} />
        )}
        <WizardProgress step={step} total={TOTAL_STEPS} />
        <Pressable onPress={() => signOut()} hitSlop={8} disabled={busy}>
          <AppText variant="sm" style={styles.signOut}>
            Sign out
          </AppText>
        </Pressable>
      </View>

      <View style={styles.stepArea}>
        <SetupStep key={step}>
          {step === 0 ? (
            <WelcomeStep onNext={goNext} />
          ) : step === 1 ? (
            <AccountsStep
              drafts={drafts}
              presetKey={presetKey}
              setPresetKey={setPresetKey}
              name={name}
              setName={setName}
              balance={balance}
              setBalance={setBalance}
              balanceLabel={preset.balanceLabel}
              onAdd={addDraft}
              onRemove={removeDraft}
              onContinue={continueFromAccounts}
            />
          ) : step === 2 ? (
            <InfoStep
              kind="expenses"
              title="Every expense, automatically sorted"
              subtitle="As money moves, SpendWise files each transaction into the right category — no spreadsheets, no manual tagging."
              bullets={[
                'Spending grouped by category in real time',
                'Spot where your money actually goes',
                'Edit or recategorize anytime',
              ]}
              onNext={goNext}
            />
          ) : step === 3 ? (
            <InfoStep
              kind="goals"
              title="Watch your savings grow"
              subtitle="Set targets and see progress fill as your balances climb. Small, steady steps add up."
              bullets={[
                'Visualize progress toward each goal',
                'Stay motivated with live tracking',
                'Celebrate every milestone',
              ]}
              onNext={goNext}
            />
          ) : (
            <SipStep
              sipName={sipName}
              setSipName={setSipName}
              sipType={sipType}
              setSipType={setSipType}
              sipAmount={sipAmount}
              setSipAmount={setSipAmount}
              sipFromAccountId={sipFromAccountId}
              setSipFromAccountId={setSipFromAccountId}
              sipDay={sipDay}
              setSipDay={setSipDay}
              assetDrafts={assetDrafts}
              busy={busy}
              onSetup={() => finish(true)}
              onSkip={() => finish(false)}
            />
          )}
        </SetupStep>
      </View>
    </SafeAreaView>
  );
}

/* --------------------------- Progress bar -------------------------------- */

function WizardProgress({step, total}: {step: number; total: number}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue((step + 1) / total);

  useEffect(() => {
    const target = (step + 1) / total;
    progress.value = reduceMotion
      ? target
      : withTiming(target, {duration: 360, easing: Easing.out(Easing.cubic)});
  }, [progress, reduceMotion, step, total]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{scaleX: progress.value}],
  }));

  return (
    <View style={styles.progressCol}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, fillStyle]} />
      </View>
      <AppText variant="xs" style={styles.progressLabel}>
        Step {step + 1} of {total}
      </AppText>
    </View>
  );
}

/* ----------------------------- Welcome ----------------------------------- */

function WelcomeStep({onNext}: {onNext: () => void}) {
  return (
    <View style={styles.frame}>
      <View style={styles.welcomeBody}>
        <View style={styles.illuWrap}>
          <StepIllustration kind="welcome" />
        </View>
        <AppText style={styles.bigTitle}>
          Let’s set up your financial workspace
        </AppText>
        <AppText variant="body" style={styles.centerCopy}>
          A calm, connected home for every account, expense, and investment.
          This takes about a minute.
        </AppText>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Get started" onPress={onNext} icon="arrow" />
      </View>
    </View>
  );
}

/* ----------------------------- Accounts ---------------------------------- */

type AccountsStepProps = {
  drafts: Draft[];
  presetKey: string;
  setPresetKey: (key: string) => void;
  name: string;
  setName: (v: string) => void;
  balance: string;
  setBalance: (v: string) => void;
  balanceLabel: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onContinue: () => void;
};

function AccountsStep({
  drafts,
  presetKey,
  setPresetKey,
  name,
  setName,
  balance,
  setBalance,
  balanceLabel,
  onAdd,
  onRemove,
  onContinue,
}: AccountsStepProps) {
  const scrollRef = useRef<ScrollView>(null);
  const keyboardAware = useKeyboardAwareScroll(scrollRef);
  return (
    <KeyboardAvoidingView
      style={styles.frame}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...keyboardAware}>
        <View style={styles.illuWrapSm}>
          <StepIllustration kind="accounts" />
        </View>
        <AppText style={styles.title}>Add the accounts you use</AppText>
        <AppText variant="body" muted style={styles.subtitle}>
          Anywhere money sits — bank, cash, a card you owe on. Today’s balance
          becomes your day-zero opening entry.
        </AppText>

        <View style={styles.note}>
          <IconShield size={20} color={colors.mint600} />
          <AppText variant="sm" style={styles.noteText}>
            Each balance is recorded as an OPENING entry — your ledger’s starting
            point. You can edit accounts later.
          </AppText>
        </View>

        {drafts.map((draft, index) => {
          const p = getPreset(draft.presetKey);
          return (
            <FadeInView key={draft.id} index={index}>
              <View style={styles.draftRow}>
                <IconBadge icon={p.glyph} tone={p.tone} size="md" />
                <View style={styles.draftInfo}>
                  <AppText style={styles.draftName}>{draft.name}</AppText>
                  <AppText variant="xs" muted>
                    {p.label} ·{' '}
                    {formatLedgerMoney(draft.balance, {baseCurrency: 'INR'})}
                  </AppText>
                </View>
                <PressableScale onPress={() => onRemove(draft.id)} hitSlop={10}>
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
                <PressableScale key={p.key} onPress={() => setPresetKey(p.key)} scaleTo={0.93}>
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
            placeholder={balanceLabel}
            placeholderTextColor={colors.ink400}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <PressableScale onPress={onAdd} style={styles.addBtn} scaleTo={0.97}>
            <IconPlus size={18} color={colors.mint700} strokeWidth={2.4} />
            <AppText style={styles.addBtnText}>Add account</AppText>
          </PressableScale>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={`Continue${drafts.length ? ` · ${drafts.length}` : ''}`}
          onPress={onContinue}
          icon="arrow"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/* --------------------------- Info steps ---------------------------------- */

function InfoStep({
  kind,
  title,
  subtitle,
  bullets,
  onNext,
}: {
  kind: 'expenses' | 'goals';
  title: string;
  subtitle: string;
  bullets: string[];
  onNext: () => void;
}) {
  return (
    <View style={styles.frame}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.infoBody}
        showsVerticalScrollIndicator={false}>
        <View style={styles.illuWrap}>
          <StepIllustration kind={kind} />
        </View>
        <AppText style={styles.bigTitle}>{title}</AppText>
        <AppText variant="body" style={styles.centerCopy}>
          {subtitle}
        </AppText>
        <View style={styles.bullets}>
          {bullets.map((b, i) => (
            <FadeInView key={b} index={i} delay={120}>
              <View style={styles.bulletRow}>
                <View style={styles.bulletTick}>
                  <IconCheck size={13} color={colors.mint700} strokeWidth={2.6} />
                </View>
                <AppText style={styles.bulletText}>{b}</AppText>
              </View>
            </FadeInView>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Continue" onPress={onNext} icon="arrow" />
      </View>
    </View>
  );
}

/* ------------------------------- SIP ------------------------------------- */

type SipStepProps = {
  sipName: string;
  setSipName: (v: string) => void;
  sipType: SipInvestmentType;
  setSipType: (v: SipInvestmentType) => void;
  sipAmount: string;
  setSipAmount: (v: string) => void;
  sipFromAccountId: string;
  setSipFromAccountId: (v: string) => void;
  sipDay: number;
  setSipDay: (v: number) => void;
  assetDrafts: Draft[];
  busy: boolean;
  onSetup: () => void;
  onSkip: () => void;
};

function SipStep({
  sipName,
  setSipName,
  sipType,
  setSipType,
  sipAmount,
  setSipAmount,
  sipFromAccountId,
  setSipFromAccountId,
  sipDay,
  setSipDay,
  assetDrafts,
  busy,
  onSetup,
  onSkip,
}: SipStepProps) {
  const canSetup = assetDrafts.length > 0;
  const scrollRef = useRef<ScrollView>(null);
  const keyboardAware = useKeyboardAwareScroll(scrollRef);
  return (
    <KeyboardAvoidingView
      style={styles.frame}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...keyboardAware}>
        <View style={styles.illuWrapSm}>
          <StepIllustration kind="sip" />
        </View>
        <View style={styles.optionalRow}>
          <AppText style={styles.title}>Track your SIP investments</AppText>
          <View style={styles.optionalTag}>
            <AppText variant="xs" style={styles.optionalTagText}>
              Optional
            </AppText>
          </View>
        </View>
        <AppText variant="body" muted style={styles.subtitle}>
          Track your recurring SIP investments automatically. On each SIP date a
          pending entry appears — confirm it in one tap.
        </AppText>

        <Field label="SIP name">
          <TextInput
            style={styles.input}
            value={sipName}
            onChangeText={setSipName}
            placeholder="e.g. Nifty Index Fund"
            placeholderTextColor={colors.ink400}
          />
        </Field>

        <Field label="Type">
          <ScrollRow>
            {SIP_INVESTMENT_TYPE_OPTIONS.map(option => (
              <Chip
                key={option.value}
                label={option.label}
                active={sipType === option.value}
                onPress={() => setSipType(option.value)}
              />
            ))}
          </ScrollRow>
        </Field>

        <Field label="Amount">
          <TextInput
            style={styles.input}
            value={sipAmount}
            onChangeText={t => setSipAmount(t.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="2000"
            placeholderTextColor={colors.ink400}
          />
        </Field>

        <Field label="Frequency">
          <View style={styles.row}>
            <View style={[styles.chip, styles.chipActive]}>
              <AppText variant="xs" style={[styles.chipText, styles.chipTextActive]}>
                Monthly
              </AppText>
            </View>
          </View>
        </Field>

        <Field label="Paid from">
          {canSetup ? (
            <ScrollRow>
              {assetDrafts.map(account => (
                <Chip
                  key={account.id}
                  label={account.name}
                  active={sipFromAccountId === account.id}
                  onPress={() => setSipFromAccountId(account.id)}
                />
              ))}
            </ScrollRow>
          ) : (
            <AppText variant="sm" muted style={styles.sipHint}>
              Add a bank or cash account to fund a SIP. You can set one up later
              from the SIP tab.
            </AppText>
          )}
        </Field>

        <Field label="SIP date">
          <DayOfMonthPicker value={sipDay} onChange={setSipDay} timezone={TIMEZONE} />
        </Field>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Set up SIP"
          onPress={onSetup}
          icon="check"
          disabled={busy || !canSetup}
        />
        <PressableScale onPress={onSkip} disabled={busy} hitSlop={6} style={styles.skipBtn}>
          <AppText style={styles.skipText}>Skip for now</AppText>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ----------------------------- Shared bits ------------------------------- */

function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: 'arrow' | 'check';
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
      scaleTo={0.97}>
      {icon === 'check' ? (
        <IconCheck size={20} color={colors.white} strokeWidth={2.4} />
      ) : null}
      <AppText style={styles.primaryText}>{label}</AppText>
      {icon === 'arrow' ? (
        <IconChevronRight size={20} color={colors.white} strokeWidth={2.4} />
      ) : null}
    </PressableScale>
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
        <AppText variant="xs" style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  progressCol: {flex: 1, gap: 5},
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    backgroundColor: colors.mint500,
    transformOrigin: 'left',
  },
  progressLabel: {color: colors.ink500, fontWeight: '600'},
  signOut: {color: colors.ink500, fontWeight: '600'},

  stepArea: {flex: 1, position: 'relative'},
  frame: {flex: 1},
  scroll: {flex: 1},

  // Layout bodies
  scrollBody: {padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm},
  welcomeBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  infoBody: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  illuWrap: {alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm},
  illuWrapSm: {alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs},

  // Typography
  bigTitle: {
    fontWeight: '700',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: colors.ink900,
    textAlign: 'center',
  },
  centerCopy: {textAlign: 'center', lineHeight: 22, color: colors.ink600},
  title: {fontWeight: '700', fontSize: 23, letterSpacing: -0.5, color: colors.ink900},
  subtitle: {marginTop: 4, marginBottom: spacing.sm, lineHeight: 21},

  // Bullets
  bullets: {alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm},
  bulletRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  bulletTick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.mint100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {flex: 1, color: colors.ink700, fontWeight: '600', fontSize: 15},

  // Accounts
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

  // SIP
  optionalRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap'},
  optionalTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.mint100,
  },
  optionalTagText: {color: colors.mint700, fontWeight: '700'},
  field: {gap: 8, marginTop: spacing.sm},
  fieldLabel: {fontWeight: '700', color: colors.ink700},
  row: {flexDirection: 'row', gap: 8, paddingVertical: 2},
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
  sipHint: {lineHeight: 19},

  // Footer + buttons
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.mint500,
    marginTop: spacing.sm,
    ...shadow.sm,
  },
  primaryBtnDisabled: {opacity: 0.5},
  primaryText: {color: colors.white, fontWeight: '700', fontSize: 16},
  skipBtn: {alignItems: 'center', justifyContent: 'center', paddingVertical: 10},
  skipText: {color: colors.ink500, fontWeight: '700', fontSize: 15},
});
