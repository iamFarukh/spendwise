export type ExportGroup =
  | "INCOME"
  | "EXPENSES"
  | "TRANSFERS"
  | "INVESTMENTS"
  | "REFUNDS"
  | "OTHER";

export type ExportFormat = "pdf" | "xlsx" | "csv" | "json";

export const UNSPECIFIED_PAYMENT_METHOD = "__unspecified__" as const;

export const EXPORT_GROUP_LABELS: Record<ExportGroup, string> = {
  INCOME: "Income",
  EXPENSES: "Expenses",
  TRANSFERS: "Transfers",
  INVESTMENTS: "Investments",
  REFUNDS: "Refunds",
  OTHER: "Other Activity",
};
