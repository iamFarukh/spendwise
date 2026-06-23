export const firestorePaths = {
  user: (uid: string) => `users/${uid}`,
  settings: (uid: string) => `users/${uid}/settings/default`,
  accounts: (uid: string) => `users/${uid}/accounts`,
  account: (uid: string, accountId: string) =>
    `users/${uid}/accounts/${accountId}`,
  transactions: (uid: string) => `users/${uid}/transactions`,
  transaction: (uid: string, transactionId: string) =>
    `users/${uid}/transactions/${transactionId}`,
  categories: (uid: string) => `users/${uid}/categories`,
  category: (uid: string, categoryId: string) =>
    `users/${uid}/categories/${categoryId}`,
  recurring: (uid: string) => `users/${uid}/recurring`,
  recurringTemplate: (uid: string, templateId: string) =>
    `users/${uid}/recurring/${templateId}`,
  merchants: (uid: string) => `users/${uid}/merchants`,
  reconciliations: (uid: string) => `users/${uid}/reconciliations`,
  reconciliation: (uid: string, reconciliationId: string) =>
    `users/${uid}/reconciliations/${reconciliationId}`,
  notifications: (uid: string) => `users/${uid}/notifications`,
  notification: (uid: string, notificationId: string) =>
    `users/${uid}/notifications/${notificationId}`,
} as const;
