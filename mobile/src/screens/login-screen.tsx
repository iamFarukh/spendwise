import {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AppText} from '@/components/ui/app-text';
import {Gradient} from '@/components/ui/gradient';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {
  IconApple,
  IconChevronRight,
  IconGlobe,
  IconGoogle,
  IconLock,
  LogoMark,
} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {sendPasswordReset, signInWithEmail, signInWithGoogle, signUpWithEmail} from '@/lib/auth/actions';
import {getAuthErrorMessage} from '@/lib/auth/errors';
import {useToast} from '@/providers/toast-provider';

type AuthMode = 'sign-in' | 'sign-up';

export function LoginScreen() {
  const toast = useToast();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'sign-in') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error('Enter your email first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      toast.success('Password reset email sent.');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = Boolean(email) && password.length >= 6 && !busy;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Gradient
        colors={[colors.mint600, colors.mint800, '#06402F']}
        start={{x: 0.2, y: 0}}
        end={{x: 0.7, y: 1}}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FadeInView index={0} style={styles.top}>
            <LogoMark size={60} />
            <AppText style={styles.wordmark}>SpendWise</AppText>
            <AppText style={styles.tagline}>
              Your ledger of truth — where every rupee lives.
            </AppText>
          </FadeInView>

          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <FadeInView index={1} style={styles.sheetInner}>
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
                      setMode(option.value);
                      setError(null);
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
              onPress={() => toast.notify('Apple sign-in is coming soon.')}
              style={[styles.oauth, styles.oauthApple]}>
              <IconApple size={19} color={colors.white} />
              <AppText style={[styles.oauthText, styles.oauthTextApple]}>
                Continue with Apple
              </AppText>
            </PressableScale>

            <PressableScale onPress={handleGoogle} style={styles.oauth}>
              <IconGoogle size={20} />
              <AppText style={styles.oauthText}>Continue with Google</AppText>
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
              <View style={styles.input}>
                <IconGlobe size={18} color={colors.ink400} />
                <TextInput
                  style={styles.inputText}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.ink400}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
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
              <View style={styles.input}>
                <IconLock size={18} color={colors.ink400} />
                <TextInput
                  style={styles.inputText}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.ink400}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={10}>
                  <IconLock size={19} color={colors.ink400} />
                </Pressable>
              </View>
            </View>

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

            <AppText style={styles.foot}>
              By continuing you agree to our{' '}
              <AppText style={styles.footLink}>Terms</AppText> &{' '}
              <AppText style={styles.footLink}>Privacy Policy</AppText>.
            </AppText>
            </FadeInView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.mint700},
  safe: {flex: 1},
  flex: {flex: 1},
  top: {alignItems: 'center', paddingHorizontal: 30, paddingVertical: 30},
  wordmark: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 30,
    letterSpacing: -0.5,
    marginTop: 14,
  },
  tagline: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 270,
    marginTop: 8,
    lineHeight: 22,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  sheetContent: {padding: 24, paddingTop: 26},
  sheetInner: {gap: spacing.sm},
  seg: {
    flexDirection: 'row',
    backgroundColor: colors.canvas2,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
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
    height: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
  },
  oauthApple: {backgroundColor: '#0E1714', borderColor: '#0E1714'},
  oauthText: {fontWeight: '700', fontSize: 15, color: colors.ink900},
  oauthTextApple: {color: colors.white},
  divider: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg},
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
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
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
    paddingTop: 18,
  },
  footLink: {color: colors.mint700, fontWeight: '700', fontSize: 11.5},
});
