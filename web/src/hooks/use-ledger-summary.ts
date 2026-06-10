"use client";

import { computeLedgerSummary, type LedgerSummary } from "@pfos/shared";
import { useMemo } from "react";

import { useAccounts } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";

export function useLedgerSummary() {
  const { settings, loading: settingsLoading, error: settingsError } =
    useUserSettings();
  const { accounts, loading: accountsLoading, error: accountsError } =
    useAccounts();
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
  } = useTransactions();

  const summary = useMemo<LedgerSummary | null>(() => {
    if (!settings) {
      return null;
    }
    return computeLedgerSummary(accounts, transactions, settings.timezone);
  }, [accounts, settings, transactions]);

  return {
    summary,
    settings,
    accounts,
    transactions,
    loading: settingsLoading || accountsLoading || transactionsLoading,
    error: settingsError ?? accountsError ?? transactionsError,
  };
}
