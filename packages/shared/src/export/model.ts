import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { Transaction } from "../types/transaction";
import { buildAccountStatements } from "./balances";
import { resolveExportDateRange } from "./date-presets";
import { filterExportTransactions } from "./filter";
import {
  buildCategorySummary,
  buildDailySummary,
  buildExportSummary,
  buildLargestTransactions,
  buildVisualizations,
} from "./summary";
import {
  buildDefaultFilenameStem,
  createReportId,
  sanitizeFilenameStem,
} from "./meta";
import type {
  ExportDocument,
  ExportRequest,
  ExportSort,
  ExportStatementRow,
} from "./types";
import { ExportValidationError, validateExportRequest } from "./validate";

function resolveSelectedAccountIds(
  accounts: Account[],
  accountIds: string[] | "all",
): string[] {
  if (accountIds !== "all") {
    return accountIds;
  }
  return [...accounts]
    .filter((a) => !a.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((a) => a.id);
}

function compareRowsBySort(
  a: ExportStatementRow,
  b: ExportStatementRow,
  sort: ExportSort,
): number {
  switch (sort) {
    case "newest": {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      const created = b.createdAt.localeCompare(a.createdAt);
      if (created !== 0) {
        return created;
      }
      return b.transactionId.localeCompare(a.transactionId);
    }
    case "oldest": {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      const created = a.createdAt.localeCompare(b.createdAt);
      if (created !== 0) {
        return created;
      }
      return a.transactionId.localeCompare(b.transactionId);
    }
    case "highest_amount": {
      const diff = Math.abs(b.amount) - Math.abs(a.amount);
      if (diff !== 0) {
        return diff;
      }
      return compareRowsBySort(a, b, "oldest");
    }
    case "lowest_amount": {
      const diff = Math.abs(a.amount) - Math.abs(b.amount);
      if (diff !== 0) {
        return diff;
      }
      return compareRowsBySort(a, b, "oldest");
    }
    default:
      return 0;
  }
}

function sortFlatRows(
  rows: ExportStatementRow[],
  sort: ExportSort,
): ExportStatementRow[] {
  return [...rows].sort((a, b) => compareRowsBySort(a, b, sort));
}

function buildFlatTransactions(args: {
  filtered: Transaction[];
  statements: ReturnType<typeof buildAccountStatements>;
  useStatementRows: boolean;
}): ExportStatementRow[] {
  const { filtered, statements, useStatementRows } = args;

  if (useStatementRows) {
    return statements.flatMap((s) => s.rows);
  }

  const statement = statements[0];
  if (!statement) {
    return [];
  }
  const rowByTxnId = new Map(
    statement.rows.map((row) => [row.transactionId, row]),
  );
  return filtered
    .map((t) => rowByTxnId.get(t.id))
    .filter((row): row is ExportStatementRow => row !== undefined);
}

export function buildExportDocument(args: {
  request: ExportRequest;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  generatedAt?: Date;
}): ExportDocument {
  const { request, transactions, accounts, categories } = args;
  const generatedAt = args.generatedAt ?? new Date();

  const validation = validateExportRequest(request);
  if (!validation.ok) {
    throw new ExportValidationError(validation.code, validation.message);
  }

  const range = resolveExportDateRange(
    request.datePreset,
    request.timezone,
    request.customRange,
    generatedAt,
  );

  const filtered = filterExportTransactions(transactions, {
    range,
    groups: request.groups,
    accountIds: request.accountIds,
    categoryIds: request.categoryIds,
    paymentMethods: request.paymentMethods,
    verifiedOnly: request.verifiedOnly,
  });

  if (filtered.length === 0) {
    throw new ExportValidationError(
      "NO_MATCHES",
      "No transactions match the current filters.",
    );
  }

  const selectedAccountIds = resolveSelectedAccountIds(
    accounts,
    request.accountIds,
  );

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const statements = buildAccountStatements({
    accounts,
    allLedgerTransactions: transactions,
    filteredTransactions: filtered,
    range,
    selectedAccountIds,
    includeRunningBalance: request.options.runningBalance,
    categoriesById,
    includePending: !request.verifiedOnly,
  });

  const useStatementRows =
    request.options.runningBalance || selectedAccountIds.length > 1;

  const keepStatementOrder = request.options.runningBalance;

  let flatRows = buildFlatTransactions({
    filtered,
    statements,
    useStatementRows,
  });

  const effectiveSort = keepStatementOrder
    ? ("statement_order" as const)
    : request.sort;

  if (!keepStatementOrder) {
    flatRows = sortFlatRows(flatRows, request.sort);
  }

  const summary = buildExportSummary(statements, flatRows);
  const categorySummary = buildCategorySummary(filtered, categoriesById);
  const dailySummary = buildDailySummary(flatRows);
  const largestTransactions = buildLargestTransactions(flatRows);
  const visualizations = buildVisualizations(summary, categorySummary);

  const sanitizedStem = sanitizeFilenameStem(request.filenameStem);
  const filenameStem =
    sanitizedStem ||
    buildDefaultFilenameStem({
      format: request.format,
      source: request.source,
      range,
      generatedAt,
    });

  return {
    metadata: {
      version: 1,
      locale: request.locale,
      timezone: request.timezone,
      currency: request.currency,
      reportId: createReportId(generatedAt),
      filenameStem,
      preparedFor: request.preparedFor,
      source: request.source,
      format: request.format,
      generatedAt: generatedAt.toISOString(),
      recordCount: summary.transactionCount,
      generationTimeMs: 0,
    },
    filters: {
      range,
      groups: request.groups,
      accountIds: request.accountIds,
      categoryIds: request.categoryIds,
      paymentMethods: request.paymentMethods,
      verifiedOnly: request.verifiedOnly,
      options: request.options,
      sort: request.sort,
      effectiveSort,
    },
    summary,
    visualizations,
    categorySummary,
    dailySummary,
    largestTransactions,
    accounts: statements,
    transactions: flatRows,
  };
}
