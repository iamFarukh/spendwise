import type { Category } from "../types/category";
import type { Transaction } from "../types/transaction";
import type {
  ExportAccountStatement,
  ExportCategorySummaryRow,
  ExportDailySummaryRow,
  ExportStatementRow,
  ExportSummary,
  ExportVisualizations,
} from "./types";

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

  for (const row of firstRowPerTransaction(flatRows)) {
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
        other += row.amount;
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
    transactionCount: transactionIds.size,
  };
}

export function buildCategorySummary(
  filtered: Transaction[],
  categoriesById: Map<string, Category>,
): ExportCategorySummaryRow[] {
  const totals = new Map<string | null, number>();

  for (const t of filtered) {
    if (t.type !== "EXPENSE" && t.type !== "LIABILITY_PAYMENT") {
      continue;
    }
    const key = t.categoryId ?? null;
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }

  const rows: ExportCategorySummaryRow[] = [];
  for (const [categoryId, amount] of totals) {
    if (amount === 0) {
      continue;
    }
    const categoryName = categoryId
      ? (categoriesById.get(categoryId)?.name ?? categoryId)
      : "Uncategorized";
    rows.push({ categoryId, categoryName, amount });
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
    { income: number; expense: number; txnIds: Set<string> }
  >();

  for (const row of flatRows) {
    let bucket = byDate.get(row.date);
    if (!bucket) {
      bucket = { income: 0, expense: 0, txnIds: new Set() };
      byDate.set(row.date, bucket);
    }
    bucket.txnIds.add(row.transactionId);
    if (row.typeGroup === "INCOME") {
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
