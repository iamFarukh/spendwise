"use client";

import { SubscriptionFormScreen } from "@/components/subscriptions/subscription-form";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";

export default function NewSubscriptionPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <SubscriptionFormScreen mode="create" />
      </RequireSetupComplete>
    </RequireAuth>
  );
}
