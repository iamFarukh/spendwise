"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { TransactionFormScreen } from "@/components/transactions/transaction-form";

export default function NewTransactionPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <TransactionFormScreen mode="create" />
      </RequireSetupComplete>
    </RequireAuth>
  );
}
