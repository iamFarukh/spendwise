import {useState} from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {SpendWiseLoginHero} from '@/components/brand/spendwise-brand';
import {PrivacyConsentCheckbox} from '@/components/legal/privacy-consent-checkbox';
import {AppText} from '@/components/ui/app-text';
import {Gradient} from '@/components/ui/gradient';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {
  IconChevronRight,
  IconGlobe,
  IconGoogle,
  IconLock,
} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {sendPasswordReset, signInWithEmail, signInWithGoogle, signUpWithEmail} from '@/lib/auth/actions';
import {getAuthErrorMessage} from '@/lib/auth/errors';
import {OfflineError} from '@/lib/network/connectivity';
import {recordPrivacyAcceptance} from '@/lib/legal/privacy-acceptance';
import {
  trackPrivacyPolicyDeclined,
} from '@/lib/analytics/privacy';
import type {RootStackParamList} from '@/navigation/root-navigator';
import {useNetwork} from '@/providers/network-provider';
import {useToast} from '@/providers/toast-provider';

type AuthMode = 'sign-in' | 'sign-up';
type FocusField = 'email' | 'password' | null;

/** Resting gap between the hero content and the top safe area. */
const HERO_PAD = 30;

/** Fixed hero height from the full screen — does not change when adjustResize shrinks the window. */
const HERO_HEIGHT = Math.round(Dimensions.get('window').height * 0.32);

export function LoginScreen() {
  const toast = useToast();
  const {requireOnline} = useNetwork();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusField>(null);

  const heroPadTop = insets.top + HERO_PAD;

  function openPrivacyPolicy() {
    navigation.navigate('PrivacyPolicy', {source: 'login'});
  }

  function requirePrivacyConsent(): boolean {
    if (mode !== 'sign-up' || privacyAccepted) {
      return true;
    }
    setError('Please accept the Privacy Policy to create an account.');
    void trackPrivacyPolicyDeclined({source: 'login'});
    return false;
  }

  async function handleGoogle() {
    if (!requirePrivacyConsent()) {
      return;
    }
    if (!(await requireOnline())) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const credential = await signInWithGoogle();
      // Sign-up tab with consent checked — record now so root nav can skip the
      // blocking privacy screen. Sign-in tab new users are routed to privacy
      // acceptance by RootNavigator instead of being signed out mid-flow.
      if (mode === 'sign-up' && privacyAccepted) {
        await recordPrivacyAcceptance(credential.user.uid);
      }
    } catch (err) {
      if (!(err instanceof OfflineError)) {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail() {
    if (!requirePrivacyConsent()) {
      return;
    }
    if (!(await requireOnline())) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'sign-in') {
        await signInWithEmail(email, password);
      } else {
        const credential = await signUpWithEmail(email, password);
        await recordPrivacyAcceptance(credential.user.uid);
      }
    } catch (err) {
      if (!(err instanceof OfflineError)) {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error('Enter your email first.');
      return;
    }
    if (!(await requireOnline())) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      toast.success('Password reset email sent.');
    } catch (err) {
      if (!(err instanceof OfflineError)) {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    Boolean(email) &&
    password.length >= 6 &&
    !busy &&
    (mode === 'sign-in' || privacyAccepted);

  const form = (
    <View style={styles.sheetShell}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.sheetContent,
          {paddingBottom: insets.bottom + spacing.lg},
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never">
        <View style={styles.core}>
          <View style={styles.seg}>
            {(
              [
                {value: 'sign-in', label: 'Sign in'},
                {value: 'sign-up', label: 'Create account'},
              ] as const
            ).map(option => {
              const active = option.value === mode;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.segItem, active && styles.segItemActive]}
                  onPress={() => {
                    const nextMode = option.value;
                    setMode(nextMode);
                    setError(null);
                    if (nextMode === 'sign-in') {
                      setPrivacyAccepted(false);
                    }
                  }}>
                  <AppText
                    style={[styles.segText, active && styles.segTextActive]}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <PressableScale
            onPress={handleGoogle}
            disabled={busy}
            style={[styles.oauth, busy && styles.oauthDisabled]}>
            <IconGoogle size={20} />
            <AppText style={styles.oauthText}>
              {busy ? 'Signing in…' : 'Continue with Google'}
            </AppText>
          </PressableScale>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <AppText variant="sm" style={styles.dividerText}>
              or use email
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.field}>
            <AppText style={styles.fieldLabel}>Email</AppText>
            <View
              style={[
                styles.input,
                focusedField === 'email' && styles.inputFocused,
              ]}>
              <IconGlobe
                size={18}
                color={focusedField === 'email' ? colors.mint600 : colors.ink500}
              />
              <TextInput
                style={styles.inputText}
                placeholder="you@example.com"
                placeholderTextColor={colors.ink400}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                importantForAutofill="yes"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                blurOnSubmit={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <AppText style={styles.fieldLabel}>Password</AppText>
              <Pressable onPress={handleForgotPassword} hitSlop={8}>
                <AppText style={styles.forgot}>Forgot?</AppText>
              </Pressable>
            </View>
            <View
              style={[
                styles.input,
                focusedField === 'password' && styles.inputFocused,
              ]}>
              <IconLock
                size={18}
                color={
                  focusedField === 'password' ? colors.mint600 : colors.ink500
                }
              />
              <TextInput
                style={styles.inputText}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.ink400}
                secureTextEntry={!showPassword}
                autoComplete={mode === 'sign-in' ? 'password' : 'password-new'}
                textContentType="password"
                importantForAutofill="yes"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="done"
                onSubmitEditing={() => void handleEmail()}
              />
              <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={10}>
                <IconLock
                  size={19}
                  color={
                    focusedField === 'password' ? colors.mint600 : colors.ink500
                  }
                />
              </Pressable>
            </View>
          </View>

          {mode === 'sign-up' ? (
            <PrivacyConsentCheckbox
              checked={privacyAccepted}
              onChange={setPrivacyAccepted}
              onOpenPolicy={openPrivacyPolicy}
              disabled={busy}
            />
          ) : null}

          {error ? (
            <AppText variant="sm" style={styles.error}>
              {error}
            </AppText>
          ) : null}

          <PressableScale
            onPress={handleEmail}
            disabled={!canSubmit}
            style={[styles.primary, !canSubmit && styles.primaryDisabled]}>
            <AppText style={styles.primaryText}>
              {busy
                ? 'Please wait…'
                : mode === 'sign-in'
                  ? 'Sign in'
                  : 'Create account'}
            </AppText>
            <IconChevronRight size={19} color={colors.white} />
          </PressableScale>
        </View>

        <AppText style={styles.foot}>
          By continuing you agree to our{' '}
          <AppText
            style={styles.footLink}
            onPress={openPrivacyPolicy}
            accessibilityRole="link"
            accessibilityLabel="Read Privacy Policy">
            Privacy Policy
          </AppText>
          .
        </AppText>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Gradient
        colors={[colors.mint600, colors.mint800, '#06402F']}
        start={{x: 0.2, y: 0}}
        end={{x: 0.7, y: 1}}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.hero, {paddingTop: heroPadTop, height: HERO_HEIGHT}]}>
        <FadeInView index={0}>
          <SpendWiseLoginHero />
        </FadeInView>
        <FadeInView index={1}>
          <AppText style={styles.tagline}>
            Your ledger of truth — where every rupee lives.
          </AppText>
        </FadeInView>
      </View>

      {/*
        Android: adjustResize shrinks this flex:1 area and the ScrollView keeps
        the focused TextInput visible — no custom scrollTo, no keyboard listeners.
        iOS: KeyboardAvoidingView padding is the only extra handler.
      */}
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={insets.top}>
          {form}
        </KeyboardAvoidingView>
      ) : (
        form
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.mint700},
  flex: {flex: 1},
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  tagline: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 270,
    marginTop: 10,
    lineHeight: 22,
  },
  sheetShell: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    overflow: 'hidden',
    ...shadow.md,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: spacing.md,
  },
  core: {gap: spacing.sm},
  seg: {
    flexDirection: 'row',
    backgroundColor: colors.canvas2,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  segItem: {flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.sm},
  segItemActive: {backgroundColor: colors.paper, ...shadow.xs},
  segText: {fontWeight: '700', fontSize: 15, color: colors.ink500},
  segTextActive: {color: colors.ink900},
  oauth: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
  },
  oauthDisabled: {opacity: 0.6},
  oauthText: {fontWeight: '700', fontSize: 15, color: colors.ink900},
  divider: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.sm},
  dividerLine: {flex: 1, height: 1, backgroundColor: colors.line},
  dividerText: {color: colors.ink400, fontWeight: '600'},
  field: {marginBottom: 2},
  fieldRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  fieldLabel: {fontSize: 13, fontWeight: '700', color: colors.ink700, marginBottom: 7},
  forgot: {color: colors.mint700, fontWeight: '700', fontSize: 11.5},
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: colors.ink300,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
  },
  inputFocused: {
    borderColor: colors.mint500,
    backgroundColor: colors.paper,
  },
  inputText: {flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink900, padding: 0},
  error: {color: colors.expense, fontWeight: '600', marginTop: spacing.sm},
  primary: {
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
  primaryDisabled: {opacity: 0.5},
  primaryText: {color: colors.white, fontWeight: '700', fontSize: 16},
  foot: {
    textAlign: 'center',
    fontSize: 11.5,
    color: colors.ink400,
    fontWeight: '600',
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  footLink: {color: colors.mint700, fontWeight: '700', fontSize: 11.5},
});
