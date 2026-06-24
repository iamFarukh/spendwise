/** Per-category opt-outs for the notification system. All default on. */
export interface NotificationPrefs {
  /** Daily "log today's spend" + missed-activity nudges. */
  transactionReminders: boolean;
  /** SIP due-today reminders. */
  sipReminders: boolean;
  /** Subscription renewal reminders. */
  subscriptionReminders: boolean;
  /** Reconciliation / balance-discrepancy alerts. */
  accountAlerts: boolean;
  /** Weekly spending & savings summary. */
  weeklyInsights: boolean;
  /** Product / system updates. */
  productUpdates: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  transactionReminders: true,
  sipReminders: true,
  subscriptionReminders: true,
  accountAlerts: true,
  weeklyInsights: true,
  productUpdates: true,
};

export interface UserSettings {
  baseCurrency: string;
  timezone: string;
  asOfDate: string;
  primaryAccountId: string | null;
  setupComplete: boolean;
  loansEnabled: boolean;
  /** When true, tracking account balances count toward net worth. */
  includeTrackingInNetWorth: boolean;
  /** When true, amounts display as whole units (no fractional digits). */
  roundAmounts: boolean;
  /** ISO timestamp of the last manual ledger backup. */
  lastBackupAt: string | null;
  /** Per-category notification opt-outs (optional; defaults all-on). */
  notificationPrefs?: NotificationPrefs;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  baseCurrency: "INR",
  timezone: "Asia/Kolkata",
  asOfDate: "",
  primaryAccountId: null,
  setupComplete: false,
  loansEnabled: false,
  includeTrackingInNetWorth: true,
  roundAmounts: true,
  lastBackupAt: null,
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
};
