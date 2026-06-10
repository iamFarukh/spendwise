"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { AccountFormScreen } from "@/components/accounts/account-form";

export default function NewAccountPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <AccountFormScreen mode="create" />
      </RequireSetupComplete>
    </RequireAuth>
  );
}
