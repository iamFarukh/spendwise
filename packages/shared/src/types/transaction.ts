export type TransactionType =
  | "OPENING"
  | "INCOME"
  | "TRANSFER"
  | "WITHDRAWAL"
  | "EXPENSE"
  | "INVESTMENT"
  | "REDEMPTION"
  | "REFUND"
  | "LOAN_GIVEN"
  | "LOAN_RECEIVED"
  | "LOAN_SETTLED"
  | "LIABILITY_PAYMENT"
  | "RECON_ADJUST";

export type TransactionSource =
  | "MANUAL"
  | "SMS"
  | "NOTIFICATION"
  | "RECURRING"
  | "RECONCILIATION"
  | "SHARE";

export type TransactionStatus = "PENDING" | "VERIFIED";

/**
 * Provenance for transactions imported from shared UPI/app text (Share to
 * SpendWise). `rawText` is the exact untouched shared string; `parser`/
 * `parserVersion` record which strategy produced the draft so older imports can
 * be re-parsed if the parser improves.
 */
export interface ImportMeta {
  rawText: string;
  sourceApp?: string;
  importedAt: string;
  parser: string;
  parserVersion: number;
}

export interface TransactionSplit {
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  note?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  type: TransactionType;
  amount: number;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  splits?: TransactionSplit[] | null;
  merchant?: string;
  paymentMethod?: string;
  personId?: string | null;
  notes?: string;
  isGlobalExpense: boolean;
  linkedTransactionId?: string | null;
  recurringId?: string | null;
  source: TransactionSource;
  importMeta?: ImportMeta | null;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}
