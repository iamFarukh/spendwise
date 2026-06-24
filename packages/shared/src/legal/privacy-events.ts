/** Firebase Analytics / product telemetry event names for privacy flows. */
export const PRIVACY_ANALYTICS_EVENTS = {
  viewed: "privacy_policy_viewed",
  accepted: "privacy_policy_accepted",
  declined: "privacy_policy_declined",
} as const;

export type PrivacyAnalyticsEvent =
  (typeof PRIVACY_ANALYTICS_EVENTS)[keyof typeof PRIVACY_ANALYTICS_EVENTS];
