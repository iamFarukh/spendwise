export interface Reconciliation {
  id: string;
  accountId: string;
  date: string;
  expected: number;
  actual: number;
  gap: number;
  resolutionTransactionId: string | null;
  createdAt: string;
}
