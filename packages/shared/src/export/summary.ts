import type { Category } from "../types/category";
import type { Transaction, TransactionType } from "../types/transaction";
import type {
  ExportAccountStatement,
  ExportCategorySummaryRow,
  ExportDailySummaryRow,
  ExportOtherBreakdownRow,
  ExportStatementRow,
  ExportSummary,
  ExportVisualizations,
} from "./types";

const OTHER_TYPE_LABELS: Partial<Record<TransactionType, string>> = {
  OPENING: "Opening balance",
  REDEMPTION: "Redemption",
  LOAN_GIVEN: "Loan given",
  LOAN_RECEIVED: "Loan received",
  LOAN_SETTLED: "Loan settled",
  RECON_ADJUST: "Reconciliation adjustment",
};

function firstRowPerTransaction(
  flatRows: ExportStatementRow[],
): ExportStatementRow[] {
  const seen = new Map<string, ExportStatementRow>();
  for (const row of flatRows) {
    if (!seen.has(row.transactionId)) {
      seen.set(row.transactionId, row);
    }
  }
  return [...seen.values()];
}

function absAmount(row: ExportStatementRow): number {
  return Math.abs(row.signedAmount);
}

function buildOtherBreakdown(
  uniqueRows: ExportStatementRow[],
): ExportOtherBreakdownRow[] {
  const buckets = new Map<
    TransactionType,
    { amount: number; transactionCount: number }
  >();

  for (const row of uniqueRows) {
    if (row.typeGroup !== "OTHER") {
      continue;
    }
    const existing = buckets.get(row.transactionType);
    if (existing) {
      existing.amount += absAmount(row);
      existing.transactionCount += 1;
    } else {
      buckets.set(row.transactionType, {
        amount: absAmount(row),
        transactionCount: 1,
      });
    }
  }

  return [...buckets.entries()]
    .map(([transactionType, bucket]) => ({
      transactionType,
      label: OTHER_TYPE_LABELS[transactionType] ?? transactionType,
      amount: bucket.amount,
      transactionCount: bucket.transactionCount,
    }))
    .sort((a, b) => {
      if (b.amount !== a.amount) {
        return b.amount - a.amount;
      }
      return a.label.localeCompare(b.label);
    });
}

export function buildExportSummary(
  _statements: ExportAccountStatement[],
  flatRows: ExportStatementRow[],
): ExportSummary {
  let income = 0;
  let expense = 0;
  let transfers = 0;
  let investments = 0;
  let refunds = 0;
  let other = 0;

  const uniqueRows = firstRowPerTransaction(flatRows);

  for (const row of uniqueRows) {
    switch (row.typeGroup) {
      case "INCOME":
        income += row.signedAmount;
        break;
      case "EXPENSES":
        expense += absAmount(row);
        break;
      case "TRANSFERS":
        transfers += row.amount;
        break;
      case "INVESTMENTS":
        investments += row.amount;
        break;
      case "REFUNDS":
        refunds += row.amount;
        break;
      case "OTHER":
        other += absAmount(row);
        break;
      default:
        break;
    }
  }

  const transactionIds = new Set(flatRows.map((r) => r.transactionId));

  return {
    income,
    expense,
    net: income - expense,
    transfers,
    investments,
    refunds,
    other,
    otherBreakdown: buildOtherBreakdown(uniqueRows),
    transactionCount: transactionIds.size,
  };
}

export function buildCategorySummary(
  filtered: Transaction[],
  categoriesById: Map<string, Category>,
): ExportCategorySummaryRow[] {
  const totals = new Map<
    string | null,
    { amount: number; transactionIds: Set<string> }
  >();

  for (const t of filtered) {
    if (t.type !== "EXPENSE" && t.type !== "LIABILITY_PAYMENT") {
      continue;
    }
    const key = t.categoryId ?? null;
    let bucket = totals.get(key);
    if (!bucket) {
      bucket = { amount: 0, transactionIds: new Set() };
      totals.set(key, bucket);
    }
    bucket.amount += t.amount;
    bucket.transactionIds.add(t.id);
  }

  const totalSpend = [...totals.values()].reduce((sum, b) => sum + b.amount, 0);

  const rows: ExportCategorySummaryRow[] = [];
  for (const [categoryId, bucket] of totals) {
    if (bucket.amount === 0) {
      continue;
    }
    const categoryName = categoryId
      ? (categoriesById.get(categoryId)?.name ?? categoryId)
      : "Uncategorized";
    rows.push({
      categoryId,
      categoryName,
      amount: bucket.amount,
      share: totalSpend > 0 ? (bucket.amount / totalSpend) * 100 : 0,
      transactionCount: bucket.transactionIds.size,
    });
  }

  rows.sort((a, b) => {
    if (b.amount !== a.amount) {
      return b.amount - a.amount;
    }
    return a.categoryName.localeCompare(b.categoryName);
  });

  return rows;
}

export function buildDailySummary(
  flatRows: ExportStatementRow[],
): ExportDailySummaryRow[] {
  const byDate = new Map<
    string,
    { income: number; expense: number; txnIds: Set<string>; seen: Set<string> }
  >();

  for (const row of flatRows) {
    let bucket = byDate.get(row.date);
    if (!bucket) {
      bucket = {
        income: 0,
        expense: 0,
        txnIds: new Set(),
        seen: new Set(),
      };
      byDate.set(row.date, bucket);
    }
    bucket.txnIds.add(row.transactionId);
    // One contribution per transaction per day (avoid transfer double-rows).
    if (bucket.seen.has(row.transactionId)) {
      continue;
    }
    bucket.seen.add(row.transactionId);

    if (row.typeGroup === "INCOME" || row.typeGroup === "REFUNDS") {
      bucket.income += absAmount(row);
    } else if (row.typeGroup === "EXPENSES") {
      bucket.expense += absAmount(row);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { income, expense, txnIds }]) => ({
      date,
      income,
      expense,
      net: income - expense,
      transactions: txnIds.size,
    }));
}

export function buildLargestTransactions(
  flatRows: ExportStatementRow[],
  limit = 10,
): ExportStatementRow[] {
  const unique: ExportStatementRow[] = [];
  const seen = new Set<string>();
  for (const row of flatRows) {
    if (seen.has(row.transactionId)) {
      continue;
    }
    seen.add(row.transactionId);
    unique.push(row);
  }

  unique.sort((a, b) => {
    const diff = Math.abs(b.amount) - Math.abs(a.amount);
    if (diff !== 0) {
      return diff;
    }
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.transactionId.localeCompare(b.transactionId);
  });

  return unique.slice(0, limit);
}

export function buildVisualizations(
  summary: ExportSummary,
  categorySummary: ExportCategorySummaryRow[],
): ExportVisualizations {
  return {
    incomeExpense: {
      labels: ["Period"],
      income: [summary.income],
      expense: [summary.expense],
    },
    categoryBreakdown: categorySummary.map(({ categoryName, amount }) => ({
      label: categoryName,
      amount,
    })),
  };
}
