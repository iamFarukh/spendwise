import {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {colors, spacing} from '@/constants/theme';
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '@/lib/auth/actions';
import {getAuthErrorMessage} from '@/lib/auth/errors';

type AuthMode = 'sign-in' | 'sign-up';

export function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <AppText variant="display" style={styles.heroTitle}>
              SpendWise
            </AppText>
            <AppText variant="body" style={styles.heroSub}>
              Know where every rupee lives — your personal ledger of truth.
            </AppText>
          </View>

          <Card style={styles.form}>
            <AppText variant="h2">Sign in</AppText>
            <AppText variant="body" style={styles.sub}>
              Same account as web — data syncs instantly.
            </AppText>

            <Button
              variant="ghost"
              label="Continue with Google"
              onPress={handleGoogle}
              loading={busy}
              style={styles.gap}
            />

            <AppText variant="sm" style={styles.divider}>
              or use email
            </AppText>

            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />

            <Input
              label="Password"
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              style={styles.gap}
            />

            {error ? (
              <AppText variant="sm" style={styles.error}>
                {error}
              </AppText>
            ) : null}

            <Button
              label={
                mode === 'sign-in' ? 'Sign in' : 'Create account'
              }
              onPress={handleEmail}
              loading={busy}
              disabled={!email || password.length < 6}
              style={styles.gap}
            />

            <AppText variant="sm" style={styles.switch}>
              {mode === 'sign-in' ? 'New here? ' : 'Have an account? '}
              <AppText
                variant="sm"
                style={styles.switchLink}
                onPress={() => {
                  setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                  setError(null);
                }}>
                {mode === 'sign-in' ? 'Create account' : 'Sign in'}
              </AppText>
            </AppText>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas2},
  flex: {flex: 1},
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  hero: {
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.mint700,
  },
  heroSub: {
    color: colors.ink600,
  },
  form: {
    gap: spacing.md,
  },
  sub: {
    marginBottom: spacing.sm,
  },
  gap: {
    marginTop: spacing.md,
  },
  divider: {
    textAlign: 'center',
    color: colors.ink400,
    marginVertical: spacing.sm,
  },
  error: {
    color: colors.expense,
    fontWeight: '600',
  },
  switch: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  switchLink: {
    color: colors.mint700,
    fontWeight: '700',
  },
});
