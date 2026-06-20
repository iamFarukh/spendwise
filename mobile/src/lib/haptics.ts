import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';

const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
} as const;

/** Fire once — callers should not repeat for the same toast. */
function trigger(type: HapticFeedbackTypes) {
  try {
    ReactNativeHapticFeedback.trigger(type, HAPTIC_OPTIONS);
  } catch {
    // Haptics are optional — never block toast UX.
  }
}

export function hapticSuccess() {
  trigger(HapticFeedbackTypes.notificationSuccess);
}

export function hapticError() {
  trigger(HapticFeedbackTypes.notificationError);
}

export function hapticWarning() {
  trigger(HapticFeedbackTypes.notificationWarning);
}

export function hapticInfo() {
  trigger(HapticFeedbackTypes.impactLight);
}

/** A single soft medium tap — used once when the cold-start splash completes. */
export function hapticMedium() {
  trigger(HapticFeedbackTypes.impactMedium);
}
