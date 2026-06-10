"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { RecurringFormScreen } from "@/components/recurring/recurring-form";

export default function NewRecurringPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <RecurringFormScreen mode="create" />
      </RequireSetupComplete>
    </RequireAuth>
  );
}
