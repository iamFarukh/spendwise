/**
 * Legacy in-app SIP reminder ledger. OS scheduling now lives in
 * `lib/notifications/push.ts` via Notifee trigger notifications.
 */
export async function scheduleSipReminders(): Promise<void> {
  // No-op — kept for callers that may still import this module.
}

export async function readSipReminderMessages(): Promise<string[]> {
  return [];
}
