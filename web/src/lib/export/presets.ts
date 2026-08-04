import {
  buildDefaultFilenameStem,
  getBucketsAggregateRange,
  resolveExportDateRange,
  sanitizeFilenameStem,
  type ExportGroup,
  type ExportRequest,
  type PeriodBucket,
} from "@pfos/shared";

import type { TransactionTypeFilter } from "@/lib/transactions/filter";

export const ALL_EXPORT_GROUPS: ExportGroup[] = [
  "INCOME",
  "EXPENSES",
  "TRANSFERS",
  "INVESTMENTS",
  "REFUNDS",
  "OTHER",
];

export function transactionTypeFilterToExportGroups(
  filter: TransactionTypeFilter,
): ExportGroup[] {
  switch (filter) {
    case "ALL":
      return [...ALL_EXPORT_GROUPS];
    case "EXPENSE":
    case "BILL_PAYMENT":
      return ["EXPENSES"];
    case "INCOME":
      return ["INCOME"];
    case "TRANSFER":
      return ["TRANSFERS"];
    case "INVESTMENT":
      return ["INVESTMENTS"];
    case "REFUND":
      return ["REFUNDS"];
    default:
      return [...ALL_EXPORT_GROUPS];
  }
}

export function transactionsExportPresets(args: {
  typeFilter: TransactionTypeFilter;
  monthStart: string;
  monthEnd: string;
  isCurrentCalendarMonth: boolean;
  accountId?: string | null;
}): Partial<ExportRequest> {
  const presets: Partial<ExportRequest> = {
    format: "pdf",
    groups: transactionTypeFilterToExportGroups(args.typeFilter),
  };

  if (args.isCurrentCalendarMonth) {
    presets.datePreset = "this_month";
  } else {
    presets.datePreset = "custom";
    presets.customRange = { from: args.monthStart, to: args.monthEnd };
  }

  if (args.accountId) {
    presets.accountIds = [args.accountId];
  }

  return presets;
}

export function reportsExportPresets(
  buckets: PeriodBucket[],
): Partial<ExportRequest> {
  const range = getBucketsAggregateRange(buckets);
  if (!range) {
    return {
      format: "pdf",
      datePreset: "this_month",
      groups: [...ALL_EXPORT_GROUPS],
    };
  }

  return {
    format: "pdf",
    datePreset: "custom",
    customRange: { from: range.start, to: range.end },
    groups: [...ALL_EXPORT_GROUPS],
  };
}

export function settingsExportPresets(): Partial<ExportRequest> {
  return {
    format: "json",
    datePreset: "all_time",
    groups: [...ALL_EXPORT_GROUPS],
  };
}

const DEFAULT_EXPORT_COLUMN_OPTIONS: ExportRequest["options"] = {
  runningBalance: true,
  notes: true,
  merchant: true,
  transactionId: false,
  timestamps: false,
};

export function buildSettingsQuickJsonRequest(args: {
  preparedFor: string;
  timezone: string;
  currency: string;
  locale: string;
}): ExportRequest {
  const datePreset = "all_time";
  const range = resolveExportDateRange(datePreset, args.timezone);
  const filenameStem = sanitizeFilenameStem(
    buildDefaultFilenameStem({
      format: "json",
      source: "settings",
      range,
      generatedAt: new Date(),
    }),
  );

  return {
    exportVersion: 1,
    format: "json",
    source: "settings",
    datePreset,
    groups: [...ALL_EXPORT_GROUPS],
    accountIds: "all",
    categoryIds: "all",
    paymentMethods: "all",
    verifiedOnly: false,
    options: DEFAULT_EXPORT_COLUMN_OPTIONS,
    sort: "newest",
    filenameStem,
    preparedFor: args.preparedFor,
    timezone: args.timezone,
    currency: args.currency,
    locale: args.locale,
  };
}

export function exportLocale(): string {
  if (typeof navigator === "undefined") {
    return "en-IN";
  }
  return navigator.language || "en-IN";
}
