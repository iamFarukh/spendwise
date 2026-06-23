import type { ManualTransactionType } from "../transactions/form";

/** Investment vehicle for SIP / recurring investment plans. */
export type SipInvestmentType =
  | "MUTUAL_FUND"
  | "STOCK"
  | "ETF"
  | "GOLD"
  | "RECURRING_DEPOSIT"
  | "FIXED_DEPOSIT"
  | "OTHER";

export type RecurringFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

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
  /** 0–6 (Sun–Sat) for weekly / bi-weekly templates */
  dayOfWeek: number;
  nextRunDate: string;
  lastGeneratedDate?: string | null;
  autoConfirm: boolean;
  active: boolean;
  /** SIP-only: mutual fund, stock, ETF, gold, RD, FD, etc. */
  investmentType?: SipInvestmentType;
  /** SIP-only: scheme code of the selected asset (e.g. mfapi.in scheme code). */
  investmentSchemeCode?: number | null;
  /** SIP-only: auto-post ledger entry at end of day when not recorded manually. */
  autoCreateTransaction?: boolean;
  /** SIP-only: morning / evening reminder toggles. */
  notificationsEnabled?: boolean;
  /** ISO date until which due reminders are hidden (snooze). */
  snoozedUntil?: string | null;
  /** Run dates skipped without posting (YYYY-MM-DD). */
  skippedOccurrences?: string[];
  createdAt: string;
  updatedAt: string;
}
