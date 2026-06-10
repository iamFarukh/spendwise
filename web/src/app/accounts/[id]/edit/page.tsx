"use client";

import { useParams } from "next/navigation";

import { AccountFormScreen } from "@/components/accounts/account-form";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { useAccount } from "@/hooks/use-account";

export default function EditAccountPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <EditAccountContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function EditAccountContent() {
  const params = useParams<{ id: string }>();
  const { account, loading } = useAccount(params.id);

  return (
    <AccountFormScreen
      mode="edit"
      existing={account}
      loadingExisting={loading}
    />
  );
}
