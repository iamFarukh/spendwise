import {PRIVACY_ANALYTICS_EVENTS} from '@pfos/shared';

import {getFirebaseApp} from '@/lib/firebase/client';

type PrivacyEventParams = {
  policy_version?: string;
  source?: string;
  screen?: string;
};

async function getAnalytics() {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  try {
    const {getAnalytics, isSupported} = await import('firebase/analytics');
    const supported = await isSupported();
    if (!supported) {
      return null;
    }
    return getAnalytics(app);
  } catch {
    return null;
  }
}

export async function trackPrivacyEvent(
  event: (typeof PRIVACY_ANALYTICS_EVENTS)[keyof typeof PRIVACY_ANALYTICS_EVENTS],
  params: PrivacyEventParams = {},
): Promise<void> {
  if (__DEV__) {
    console.info(`[analytics] ${event}`, params);
  }

  const analytics = await getAnalytics();
  if (!analytics) {
    return;
  }

  try {
    const {logEvent} = await import('firebase/analytics');
    logEvent(analytics, event, params);
  } catch {
    // Analytics is best-effort and must not block UX.
  }
}

export function trackPrivacyPolicyViewed(params: PrivacyEventParams = {}) {
  return trackPrivacyEvent(PRIVACY_ANALYTICS_EVENTS.viewed, params);
}

export function trackPrivacyPolicyAccepted(params: PrivacyEventParams = {}) {
  return trackPrivacyEvent(PRIVACY_ANALYTICS_EVENTS.accepted, params);
}

export function trackPrivacyPolicyDeclined(params: PrivacyEventParams = {}) {
  return trackPrivacyEvent(PRIVACY_ANALYTICS_EVENTS.declined, params);
}
