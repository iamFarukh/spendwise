import type { Account } from "../types/account";
import type { Transaction } from "../types/transaction";

export type AccountBalance = {
  account: Account;
  balance: number;
};

function isCountedTransaction(
  txn: Transaction,
  includePending: boolean,
): boolean {
  if (txn.type === "OPENING") {
    return true;
  }
  if (includePending) {
    return true;
  }
  return txn.status === "VERIFIED";
}

function applyDelta(
  deltas: Map<string, number>,
  accountId: string | null | undefined,
  delta: number,
) {
  if (!accountId || delta === 0) {
    return;
  }
  deltas.set(accountId, (deltas.get(accountId) ?? 0) + delta);
}

function expenseFromDelta(account: Account | undefined, amount: number): number {
  if (account?.class === "LIABILITY") {
    return amount;
  }
  return -amount;
}

function refundToDelta(account: Account | undefined, amount: number): number {
  if (account?.class === "LIABILITY") {
    return -amount;
  }
  return amount;
}

/** Per-account ledger deltas for a single transaction. */
export function getTransactionAccountDeltas(
  txn: Transaction,
  accountsById: Map<string, Account>,
): Map<string, number> {
  const deltas = new Map<string, number>();
  const from = txn.fromAccountId
    ? accountsById.get(txn.fromAccountId)
    : undefined;
  const to = txn.toAccountId ? accountsById.get(txn.toAccountId) : undefined;

  switch (txn.type) {
    case "OPENING":
    case "INCOME":
      applyDelta(deltas, txn.toAccountId, txn.amount);
      break;
    case "EXPENSE":
      applyDelta(deltas, txn.fromAccountId, expenseFromDelta(from, txn.amount));
      break;
    case "TRANSFER":
    case "WITHDRAWAL":
    case "INVESTMENT":
      applyDelta(deltas, txn.fromAccountId, -txn.amount);
      if (txn.toAccountId) {
        applyDelta(deltas, txn.toAccountId, txn.amount);
      }
      break;
    case "LIABILITY_PAYMENT":
      applyDelta(deltas, txn.fromAccountId, -txn.amount);
      if (to?.class === "LIABILITY") {
        applyDelta(deltas, txn.toAccountId, -txn.amount);
      } else {
        applyDelta(deltas, txn.toAccountId, txn.amount);
      }
      break;
    case "REDEMPTION":
      applyDelta(deltas, txn.fromAccountId, -txn.amount);
      applyDelta(deltas, txn.toAccountId, txn.amount);
      break;
    case "REFUND":
      applyDelta(deltas, txn.toAccountId, refundToDelta(to, txn.amount));
      break;
    case "LOAN_GIVEN":
      applyDelta(deltas, txn.fromAccountId, -txn.amount);
      break;
    case "LOAN_RECEIVED":
      applyDelta(deltas, txn.toAccountId, txn.amount);
      break;
    case "LOAN_SETTLED":
      applyDelta(deltas, txn.fromAccountId, -txn.amount);
      applyDelta(deltas, txn.toAccountId, txn.amount);
      break;
    case "RECON_ADJUST":
      if (txn.fromAccountId) {
        applyDelta(
          deltas,
          txn.fromAccountId,
          expenseFromDelta(from, txn.amount),
        );
      } else if (txn.toAccountId) {
        applyDelta(deltas, txn.toAccountId, txn.amount);
      }
      break;
    default:
      break;
  }

  return deltas;
}

export function deriveAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  options?: { includePending?: boolean; beforeDate?: string },
): AccountBalance[] {
  const activeAccounts = accounts.filter((account) => !account.archived);
  const accountsById = new Map(activeAccounts.map((a) => [a.id, a]));
  const deltas = new Map<string, number>();
  const includePending = options?.includePending ?? false;
  const beforeDate = options?.beforeDate;

  for (const txn of transactions) {
    if (!isCountedTransaction(txn, includePending)) {
      continue;
    }
    if (beforeDate && txn.date >= beforeDate) {
      continue;
    }

    for (const [accountId, delta] of getTransactionAccountDeltas(
      txn,
      accountsById,
    )) {
      applyDelta(deltas, accountId, delta);
    }
  }

  return activeAccounts
    .map((account) => ({
      account,
      balance: deltas.get(account.id) ?? 0,
    }))
    .sort((a, b) => a.account.sortOrder - b.account.sortOrder);
}

export type ClassTotals = {
  assets: number;
  tracking: number;
  liabilities: number;
};

export function sumBalancesByClass(balances: AccountBalance[]): ClassTotals {
  return balances.reduce(
    (totals, { account, balance }) => {
      if (account.class === "ASSET") {
        totals.assets += balance;
      } else if (account.class === "TRACKING") {
        totals.tracking += balance;
      } else {
        totals.liabilities += balance;
      }
      return totals;
    },
    { assets: 0, tracking: 0, liabilities: 0 },
  );
}

/** Net worth = assets + tracking − liabilities (owed). */
export function computeNetWorth(
  balances: AccountBalance[],
  options?: { includeTracking?: boolean },
): number {
  const { assets, tracking, liabilities } = sumBalancesByClass(balances);
  const trackingTotal =
    options?.includeTracking === false ? 0 : tracking;
  return assets + trackingTotal - liabilities;
}
