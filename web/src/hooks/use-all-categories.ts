"use client";

import { useLedgerCategories } from "@/components/providers/ledger-data-provider";

export function useAllCategories() {
  return useLedgerCategories({ includeSystem: true });
}
