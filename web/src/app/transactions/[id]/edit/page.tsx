"use client";

import { useParams } from "next/navigation";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { TransactionFormScreen } from "@/components/transactions/transaction-form";
import { useTransaction } from "@/hooks/use-transaction";

export default function EditTransactionPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <EditTransactionContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function EditTransactionContent() {
  const params = useParams<{ id: string }>();
  const { transaction, loading } = useTransaction(params.id);

  return (
    <TransactionFormScreen
      mode="edit"
      existing={transaction}
      loadingExisting={loading}
    />
  );
}
