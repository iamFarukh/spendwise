"use client";

import type { Account } from "@pfos/shared";
import { useMemo } from "react";

import { useAccounts } from "@/hooks/use-accounts";

export function useAccount(id: string | null | undefined) {
  const { accounts, loading, error } = useAccounts();

  const account = useMemo<Account | null>(() => {
    if (!id) {
      return null;
    }
    return accounts.find((item) => item.id === id) ?? null;
  }, [accounts, id]);

  return { account, loading, error };
}
