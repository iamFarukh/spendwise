import {useCallback, useEffect, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {SpendWiseLoginHero} from '@/components/brand/spendwise-brand';
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
import {useToast} from '@/providers/toast-provider';

type AuthMode = 'sign-in' | 'sign-up';
type FocusField = 'email' | 'password' | null;

/** The white card overdraws below the screen so lifting it never reveals a gap. */
const SHEET_OVERDRAW = 400;
/** Top padding inside the card. */
const SHEET_PAD_TOP = 20;
/** Breathing room kept between the focused target and the keyboard. */
const FIELD_KB_GAP = 16;
/** Resting gap between the hero content and the top safe area. */
const HERO_PAD = 30;

export function LoginScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const {height: windowH} = useWindowDimensions();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FocusField>(null);

  const emailRef = useRef<View>(null);
  const passwordRef = useRef<View>(null);
  const submitRef = useRef<View>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single keyboard clock — frame-synced with the OS keyboard curve.
  const keyboard = useAnimatedKeyboard();
  const targetBottomY = useSharedValue(0);
  const windowHeight = useSharedValue(windowH);

  const heroPadTop = insets.top + HERO_PAD;

  // Keep animated layout in sync when Android adjustResize shrinks the window.
  windowHeight.value = windowH;

  const remeasureTarget = useCallback(() => {
    const ref =
      focusedField === 'password'
        ? submitRef
        : focusedField === 'email'
          ? passwordRef
          : null;
    ref?.current?.measureInWindow((_x, y, _w, h) => {
      targetBottomY.value = y + h;
    });
  }, [focusedField, targetBottomY]);

  const handleFieldFocus = useCallback(
    (field: FocusField) => {
      if (blurTimer.current) {
        clearTimeout(blurTimer.current);
        blurTimer.current = null;
      }
      setFocusedField(field);
      requestAnimationFrame(() => {
        const ref = field === 'password' ? submitRef : passwordRef;
        ref?.current?.measureInWindow((_x, y, _w, h) => {
          targetBottomY.value = y + h;
        });
      });
    },
    [targetBottomY],
  );

  const handleFieldBlur = useCallback(() => {
    blurTimer.current = setTimeout(() => {
      setFocusedField(null);
      targetBottomY.value = 0;
    }, 120);
  }, [targetBottomY]);

  // Re-measure when the keyboard height changes so lift stays accurate after
  // the hero collapses or the sheet shifts.
  useAnimatedReaction(
    () => keyboard.height.value,
    (height, prev) => {
      if (height > 0 && height !== prev) {
        runOnJS(remeasureTarget)();
      }
    },
    [remeasureTarget],
  );

  // Android resizes the window (adjustResize) instead of reporting a reliable
  // keyboard height — remeasure the focused target whenever the window changes
  // so the lift reflects the field's post-resize position.
  useEffect(() => {
    if (Platform.OS !== 'android' || !focusedField) {
      return;
    }
    const id = requestAnimationFrame(remeasureTarget);
    return () => cancelAnimationFrame(id);
  }, [windowH, focusedField, remeasureTarget]);

  const heroCollapse = useDerivedValue(() => {
    if (Platform.OS === 'android') {
      return 0;
    }
    const tall = windowHeight.value * 0.3;
    return interpolate(keyboard.height.value, [0, 260], [0, tall * 0.58], Extrapolation.CLAMP);
  });

  const lift = useDerivedValue(() => {
    if (targetBottomY.value <= 0) {
      return 0;
    }
    // Android's adjustResize shrinks the window to sit above the keyboard, so the
    // shrunk window bottom IS the keyboard top. The hero/sheet collapse handles
    // most of it; lift only what still overflows below the focused field.
    if (Platform.OS === 'android') {
      const overflow = targetBottomY.value + FIELD_KB_GAP - windowHeight.value;
      return Math.max(0, Math.min(SHEET_OVERDRAW, overflow));
    }
    if (keyboard.height.value <= 0) {
      return 0;
    }
    const kbTop = windowHeight.value - keyboard.height.value;
    const overflow = targetBottomY.value + FIELD_KB_GAP - kbTop;
    return Math.max(0, Math.min(SHEET_OVERDRAW, overflow));
  });

  const sheetStyle = useAnimatedStyle(() => {
    const tall = windowHeight.value * 0.3;
    return {
      top: tall - heroCollapse.value,
      height: windowHeight.value - tall + SHEET_OVERDRAW,
      transform: [{translateY: -lift.value}],
    };
  });

  const heroContentStyle = useAnimatedStyle(() => {
    const p = Math.min(1, keyboard.height.value / 200);
    return {
      opacity: interpolate(p, [0, 1], [1, 0], Extrapolation.CLAMP),
      transform: [
        {translateY: interpolate(p, [0, 1], [0, -24], Extrapolation.CLAMP)},
        {scale: interpolate(p, [0, 1], [1, 0.9], Extrapolation.CLAMP)},
      ],
    };
  });

  const taglineStyle = useAnimatedStyle(() => {
    const p = Math.min(1, keyboard.height.value / 140);
    return {
      opacity: interpolate(p, [0, 1], [1, 0], Extrapolation.CLAMP),
      transform: [{translateY: interpolate(p, [0, 1], [0, -8], Extrapolation.CLAMP)}],
    };
  });

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

      {/* HERO — logo + wordmark + tagline, fades as keyboard opens. */}
      <View style={[styles.hero, {paddingTop: heroPadTop}]} pointerEvents="none">
        <Animated.View style={heroContentStyle}>
          <FadeInView index={0}>
            <SpendWiseLoginHero />
          </FadeInView>
        </Animated.View>
        <Animated.View style={taglineStyle}>
          <FadeInView index={1}>
            <AppText style={styles.tagline}>
              Your ledger of truth — where every rupee lives.
            </AppText>
          </FadeInView>
        </Animated.View>
      </View>

      {/* CARD — collapses with the hero, lifts only enough for the focused field. */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <Pressable
          style={[styles.sheetContent, {paddingBottom: insets.bottom + 16}]}
          onPress={Keyboard.dismiss}
          accessible={false}>
          <FadeInView index={2} style={styles.sheetInner}>
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

              <View ref={emailRef} collapsable={false} style={styles.field}>
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
                    onFocus={() => handleFieldFocus('email')}
                    onBlur={handleFieldBlur}
                  />
                </View>
              </View>

              <View ref={passwordRef} collapsable={false} style={styles.field}>
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
                    onFocus={() => handleFieldFocus('password')}
                    onBlur={handleFieldBlur}
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

              <View ref={submitRef} collapsable={false}>
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
            </View>

            <AppText style={styles.foot}>
              By continuing you agree to our{' '}
              <AppText style={styles.footLink}>Terms</AppText> &{' '}
              <AppText style={styles.footLink}>Privacy Policy</AppText>.
            </AppText>
          </FadeInView>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.mint700},
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
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
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    ...shadow.md,
  },
  sheetContent: {flex: 1, paddingHorizontal: 24, paddingTop: SHEET_PAD_TOP},
  sheetInner: {gap: spacing.md},
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
    height: 48,
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
    paddingTop: 6,
  },
  footLink: {color: colors.mint700, fontWeight: '700', fontSize: 11.5},
});
