import type { TransactionStatus } from "../types/transaction";

export type ExportGroup =
  | "INCOME"
  | "EXPENSES"
  | "TRANSFERS"
  | "INVESTMENTS"
  | "REFUNDS"
  | "OTHER";

export type ExportStatementRow = {
  transactionId: string;
  date: string;
  time: string;
  typeGroup: ExportGroup;
  status: TransactionStatus;
  categoryName: string;
  accountId: string;
  accountName: string;
  counterpartyAccountName: string;
  paymentMethod: string;
  merchant: string;
  displayDescription: string;
  amount: number;
  signedAmount: number;
  runningBalance?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ExportAccountStatement = {
  accountId: string;
  accountName: string;
  openingBalance: number;
  closingBalance: number;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  rows: ExportStatementRow[];
};

export type ExportFormat = "pdf" | "xlsx" | "csv" | "json";

export type ExportSort =
  | "newest"
  | "oldest"
  | "highest_amount"
  | "lowest_amount";

export type ExportColumnOptions = {
  runningBalance: boolean;
  notes: boolean;
  merchant: boolean;
  transactionId: boolean;
  timestamps: boolean;
};

export type ExportRequest = {
  exportVersion: 1;
  format: ExportFormat;
  source: "transactions" | "reports" | "settings";
  datePreset: ExportDatePreset;
  customRange?: { from: string; to: string };
  groups: ExportGroup[];
  accountIds: string[] | "all";
  categoryIds: string[] | "all";
  paymentMethods: string[] | "all";
  verifiedOnly: boolean;
  options: ExportColumnOptions;
  sort: ExportSort;
  filenameStem: string;
  preparedFor: string;
  timezone: string;
  currency: string;
  locale: string;
};

export type ExportValidationErrorCode =
  | "INVALID_RANGE"
  | "NO_ACCOUNTS"
  | "NO_GROUPS"
  | "EMPTY_FILENAME"
  | "UNSUPPORTED_FORMAT"
  | "UNSUPPORTED_LOCALE"
  | "NO_MATCHES";

export const SUPPORTED_EXPORT_FORMATS: readonly ExportFormat[] = [
  "pdf",
  "xlsx",
  "csv",
  "json",
];

export type ExportDatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "last_year"
  | "all_time"
  | "custom";

export const UNSPECIFIED_PAYMENT_METHOD = "__unspecified__" as const;

export const EXPORT_GROUP_LABELS: Record<ExportGroup, string> = {
  INCOME: "Income",
  EXPENSES: "Expenses",
  TRANSFERS: "Transfers",
  INVESTMENTS: "Investments",
  REFUNDS: "Refunds",
  OTHER: "Other Activity",
};
