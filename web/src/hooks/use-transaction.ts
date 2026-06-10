"use client";

import type { Transaction } from "@pfos/shared";
import { useMemo } from "react";

import { useTransactions } from "@/hooks/use-transactions";

export function useTransaction(id: string | null | undefined) {
  const { transactions, loading, error } = useTransactions();

  const transaction = useMemo<Transaction | null>(() => {
    if (!id) {
      return null;
    }
    return transactions.find((txn) => txn.id === id) ?? null;
  }, [id, transactions]);

  return { transaction, loading, error };
}

export function usePendingCount() {
  const { transactions, loading } = useTransactions();

  const count = useMemo(
    () =>
      transactions.filter(
        (txn) => txn.status === "PENDING" && txn.type !== "OPENING",
      ).length,
    [transactions],
  );

  return { count, loading };
}
