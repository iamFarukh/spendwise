import type { Account } from "../types/account";
import type { Transaction } from "../types/transaction";

import {
  computeNetWorth,
  deriveAccountBalances,
  sumBalancesByClass,
  type AccountBalance,
  type ClassTotals,
} from "./balances";
import { getMonthRange, isDateInRange, toDateStringInTimezone } from "./dates";

export type MonthlySummary = {
  income: number;
  expenses: number;
  investments: number;
  savings: number;
};

export type LedgerSummary = {
  accountBalances: AccountBalance[];
  classTotals: ClassTotals;
  netWorth: number;
  netWorthAtMonthStart: number;
  netWorthChangeThisMonth: number;
  monthly: MonthlySummary;
  recentTransactions: Transaction[];
};

function isVerifiedInMonth(
  txn: Transaction,
  start: string,
  end: string,
): boolean {
  return (
    txn.status === "VERIFIED" &&
    txn.type !== "OPENING" &&
    isDateInRange(txn.date, start, end)
  );
}

export function computeMonthlySummary(
  transactions: Transaction[],
  timezone: string,
  referenceDate = new Date(),
): MonthlySummary {
  const { start, end } = getMonthRange(timezone, referenceDate);

  let income = 0;
  let expenses = 0;
  let investments = 0;

  for (const txn of transactions) {
    if (!isVerifiedInMonth(txn, start, end)) {
      continue;
    }

    switch (txn.type) {
      case "INCOME":
        income += txn.amount;
        break;
      case "EXPENSE":
        expenses += txn.amount;
        break;
      case "REFUND":
        expenses -= txn.amount;
        break;
      case "RECON_ADJUST":
        if (txn.fromAccountId) {
          expenses += txn.amount;
        } else if (txn.categoryId) {
          expenses -= txn.amount;
        } else {
          income += txn.amount;
        }
        break;
      case "INVESTMENT":
        investments += txn.amount;
        break;
      default:
        break;
    }
  }

  return {
    income,
    expenses,
    investments,
    savings: income - expenses - investments,
  };
}

export function computeLedgerSummary(
  accounts: Account[],
  transactions: Transaction[],
  timezone: string,
  referenceDate = new Date(),
  options?: { includeTrackingInNetWorth?: boolean },
): LedgerSummary {
  const netWorthOptions = {
    includeTracking: options?.includeTrackingInNetWorth !== false,
  };
  const accountBalances = deriveAccountBalances(accounts, transactions);
  const classTotals = sumBalancesByClass(accountBalances);
  const netWorth = computeNetWorth(accountBalances, netWorthOptions);
  const { start: monthStart } = getMonthRange(timezone, referenceDate);
  const balancesAtMonthStart = deriveAccountBalances(accounts, transactions, {
    beforeDate: monthStart,
  });
  const netWorthAtMonthStart = computeNetWorth(
    balancesAtMonthStart,
    netWorthOptions,
  );
  const monthly = computeMonthlySummary(transactions, timezone, referenceDate);

  const recentTransactions = [...transactions]
    .filter((txn) => txn.type !== "OPENING")
    .sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, 20);

  return {
    accountBalances,
    classTotals,
    netWorth,
    netWorthAtMonthStart,
    netWorthChangeThisMonth: netWorth - netWorthAtMonthStart,
    monthly,
    recentTransactions,
  };
}

export function formatRelativeTransactionDate(
  date: string,
  timezone: string,
  referenceDate = new Date(),
): string {
  const today = toDateStringInTimezone(referenceDate, timezone);
  if (date === today) {
    return "Today";
  }

  const yesterday = toDateStringInTimezone(
    new Date(referenceDate.getTime() - 86_400_000),
    timezone,
  );
  if (date === yesterday) {
    return "Yesterday";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: timezone,
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    // Runtimes whose Intl rejects IANA zones: format "D Mon" manually.
    const monthsShort = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const [, month, day] = date.split("-").map(Number);
    if (!month || !day) {
      return date;
    }
    return `${day} ${monthsShort[(month - 1) % 12]}`;
  }
}
