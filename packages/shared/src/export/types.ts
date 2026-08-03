export type ExportGroup =
  | "INCOME"
  | "EXPENSES"
  | "TRANSFERS"
  | "INVESTMENTS"
  | "REFUNDS"
  | "OTHER";

export type ExportFormat = "pdf" | "xlsx" | "csv" | "json";

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
