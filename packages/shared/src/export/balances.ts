import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { Transaction } from "../types/transaction";
import {
  deriveAccountBalances,
  getTransactionAccountDeltas,
} from "../accounting/balances";
import { buildDisplayDescription } from "./display";
import { getExportGroup } from "./groups";
import {
  UNSPECIFIED_PAYMENT_METHOD,
  type ExportAccountStatement,
  type ExportGroup,
  type ExportStatementRow,
} from "./types";

/** UTC HH:mm from ISO `createdAt` (v1 deterministic export time). */
export function formatExportRowTime(createdAt: string | undefined): string {
  if (!createdAt) {
    return "";
  }
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(createdAt);
  if (!match) {
    return "";
  }
  return `${match[2]}:${match[3]}`;
}

function compareTransactions(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  const createdA = a.createdAt ?? "";
  const createdB = b.createdAt ?? "";
  if (createdA !== createdB) {
    return createdA < createdB ? -1 : 1;
  }
  if (a.id !== b.id) {
    return a.id < b.id ? -1 : 1;
  }
  return 0;
}

function counterpartyName(
  txn: Transaction,
  accountId: string,
  accountsById: Map<string, Account>,
): string {
  const fromId = txn.fromAccountId;
  const toId = txn.toAccountId;
  if (accountId === fromId && toId) {
    return accountsById.get(toId)?.name ?? toId;
  }
  if (accountId === toId && fromId) {
    return accountsById.get(fromId)?.name ?? fromId;
  }
  return "";
}

function aggregatePeriodTotals(rows: ExportStatementRow[]): {
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  investments: number;
  refunds: number;
  other: number;
  netChange: number;
} {
  let income = 0;
  let expense = 0;
  let transferIn = 0;
  let transferOut = 0;
  let investments = 0;
  let refunds = 0;
  let other = 0;

  for (const row of rows) {
    switch (row.typeGroup) {
      case "INCOME":
        income += row.signedAmount;
        break;
      case "EXPENSES":
        expense += Math.abs(row.signedAmount);
        break;
      case "TRANSFERS":
        if (row.signedAmount > 0) {
          transferIn += row.signedAmount;
        } else if (row.signedAmount < 0) {
          transferOut += -row.signedAmount;
        }
        break;
      case "INVESTMENTS":
        investments += Math.abs(row.signedAmount);
        break;
      case "REFUNDS":
        refunds += Math.abs(row.signedAmount);
        break;
      case "OTHER":
        other += Math.abs(row.signedAmount);
        break;
      default:
        break;
    }
  }

  const netChange = rows.reduce((sum, row) => sum + row.signedAmount, 0);

  return {
    income,
    expense,
    transferIn,
    transferOut,
    investments,
    refunds,
    other,
    netChange,
  };
}

function buildStatementRow(
  txn: Transaction,
  accountId: string,
  signedAmount: number,
  accountsById: Map<string, Account>,
  categoriesById: Map<string, Category>,
): ExportStatementRow {
  const account = accountsById.get(accountId);
  const categoryName = txn.categoryId
    ? (categoriesById.get(txn.categoryId)?.name ?? "")
    : "";

  return {
    transactionId: txn.id,
    date: txn.date,
    time: formatExportRowTime(txn.createdAt),
    typeGroup: getExportGroup(txn.type),
    transactionType: txn.type,
    status: txn.status,
    categoryName,
    accountId,
    accountName: account?.name ?? accountId,
    counterpartyAccountName: counterpartyName(txn, accountId, accountsById),
    paymentMethod: txn.paymentMethod?.trim()
      ? txn.paymentMethod.trim()
      : UNSPECIFIED_PAYMENT_METHOD,
    merchant: txn.merchant ?? "",
    displayDescription: buildDisplayDescription(txn, accountsById, {
      perspectiveAccountId: accountId,
      categoryName,
    }),
    amount: txn.amount,
    signedAmount,
    notes: txn.notes ?? "",
    createdAt: txn.createdAt ?? "",
    updatedAt: txn.updatedAt ?? "",
  };
}

export function buildAccountStatements(args: {
  accounts: Account[];
  allLedgerTransactions: Transaction[];
  filteredTransactions: Transaction[];
  range: { start: string; end: string };
  selectedAccountIds: string[];
  includeRunningBalance: boolean;
  categoriesById: Map<string, Category>;
  includePending: boolean;
}): ExportAccountStatement[] {
  const {
    accounts,
    allLedgerTransactions,
    filteredTransactions,
    range,
    selectedAccountIds,
    includeRunningBalance,
    categoriesById,
    includePending,
  } = args;

  const accountsById = new Map(accounts.map((a) => [a.id, a]));

  const openingByAccountId = new Map(
    deriveAccountBalances(accounts, allLedgerTransactions, {
      includePending,
      beforeDate: range.start,
    }).map(({ account, balance }) => [account.id, balance]),
  );

  const sortedFiltered = [...filteredTransactions].sort(compareTransactions);

  return selectedAccountIds.map((accountId) => {
    const account = accountsById.get(accountId);
    const openingBalance = openingByAccountId.get(accountId) ?? 0;

    const rows: ExportStatementRow[] = [];
    for (const txn of sortedFiltered) {
      const deltas = getTransactionAccountDeltas(txn, accountsById);
      const signedAmount = deltas.get(accountId);
      if (signedAmount === undefined) {
        continue;
      }
      rows.push(
        buildStatementRow(
          txn,
          accountId,
          signedAmount,
          accountsById,
          categoriesById,
        ),
      );
    }

    let running = openingBalance;
    if (includeRunningBalance) {
      for (const row of rows) {
        running += row.signedAmount;
        row.runningBalance = running;
      }
    }

    const periodDelta = rows.reduce((sum, row) => sum + row.signedAmount, 0);
    const closingBalance = openingBalance + periodDelta;
    const totals = aggregatePeriodTotals(rows);

    return {
      accountId,
      accountName: account?.name ?? accountId,
      openingBalance,
      closingBalance,
      ...totals,
      rows,
    };
  });
}
