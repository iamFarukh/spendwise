import type {ComponentType} from 'react';
import Config from 'react-native-config';

type SentryModule = typeof import('@sentry/react-native');

let sentry: SentryModule | null = null;
let initialized = false;

function loadSentry(): SentryModule | null {
  if (sentry) {
    return sentry;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentry = require('@sentry/react-native') as SentryModule;
    return sentry;
  } catch {
    return null;
  }
}

/** Call once at app startup (before rendering). */
export function initCrashReporting(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  const dsn = Config.SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  const Sentry = loadSentry();
  if (!Sentry) {
    return;
  }

  const sentryDebug = Config.SENTRY_DEBUG?.trim() === 'true';

  Sentry.init({
    dsn,
    // Native Sentry logs benign cache housekeeping (e.g. envelope delete races)
    // as ERROR when debug is on — React Native surfaces those as red LogBox screens.
    debug: sentryDebug,
    sendDefaultPii: true,
    // Structured logs + console capture create extra envelopes; keep dev builds quiet.
    enableLogs: !__DEV__,
    replaysSessionSampleRate: __DEV__ ? 0 : 0.1,
    replaysOnErrorSampleRate: __DEV__ ? 0 : 1,
    integrations: __DEV__
      ? []
      : [
          Sentry.mobileReplayIntegration(),
          Sentry.feedbackIntegration(),
        ],
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const Sentry = loadSentry();
  if (!Sentry || !Config.SENTRY_DSN?.trim()) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[crash]', error, context);
    }
    return;
  }
  Sentry.captureException(error, {extra: context});
}

export function wrapWithSentry(component: ComponentType): ComponentType {
  const Sentry = loadSentry();
  if (!Sentry || !Config.SENTRY_DSN?.trim()) {
    return component;
  }
  return Sentry.wrap(component) as ComponentType;
}
