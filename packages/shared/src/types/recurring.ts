import type { ManualTransactionType } from "../transactions/form";

export type RecurringFrequency = "WEEKLY" | "MONTHLY";

export type RecurringTransactionType = Extract<
  ManualTransactionType,
  "EXPENSE" | "INCOME" | "TRANSFER" | "INVESTMENT" | "LIABILITY_PAYMENT"
>;

export interface RecurringTemplate {
  id: string;
  name: string;
  type: RecurringTransactionType;
  amount: number;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  merchant?: string;
  notes?: string;
  frequency: RecurringFrequency;
  /** 1–31 for monthly templates */
  dayOfMonth: number;
  /** 0–6 (Sun–Sat) for weekly templates */
  dayOfWeek: number;
  nextRunDate: string;
  lastGeneratedDate?: string | null;
  autoConfirm: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
