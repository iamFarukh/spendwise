import { PRIVACY_ANALYTICS_EVENTS } from "@pfos/shared";
import { logEvent } from "firebase/analytics";

import { getFirebaseAnalytics } from "@/lib/firebase/client";

type PrivacyEventParams = {
  policy_version?: string;
  source?: string;
  screen?: string;
};

export async function trackPrivacyEvent(
  event: (typeof PRIVACY_ANALYTICS_EVENTS)[keyof typeof PRIVACY_ANALYTICS_EVENTS],
  params: PrivacyEventParams = {},
): Promise<void> {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) {
    return;
  }

  logEvent(analytics, event, params);
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
