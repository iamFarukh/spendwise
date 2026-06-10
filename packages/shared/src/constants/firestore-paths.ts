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
  recurring: (uid: string) => `users/${uid}/recurring`,
  merchants: (uid: string) => `users/${uid}/merchants`,
  reconciliations: (uid: string) => `users/${uid}/reconciliations`,
} as const;
