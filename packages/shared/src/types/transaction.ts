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
  | "RECONCILIATION";

export type TransactionStatus = "PENDING" | "VERIFIED";

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
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}
