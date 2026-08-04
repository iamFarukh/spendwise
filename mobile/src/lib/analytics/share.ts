import {SHARE_ANALYTICS_EVENTS} from '@pfos/shared';

import {getFirebaseApp} from '@/lib/firebase/client';

/**
 * Only event metadata is ever logged here — never the shared transaction text or
 * any transaction content.
 */
type ShareEventParams = {
  parser?: string;
  score?: number;
  confidence?: string;
  field?: string;
};

async function getAnalytics() {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  try {
    const {getAnalytics, isSupported} = await import('firebase/analytics');
    if (!(await isSupported())) {
      return null;
    }
    return getAnalytics(app);
  } catch {
    return null;
  }
}

export async function trackShareEvent(
  event: (typeof SHARE_ANALYTICS_EVENTS)[keyof typeof SHARE_ANALYTICS_EVENTS],
  params: ShareEventParams = {},
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
    // best-effort only — must not block UX
  }
}
