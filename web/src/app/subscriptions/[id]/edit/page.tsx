"use client";

import { useParams } from "next/navigation";

import { SubscriptionFormScreen } from "@/components/subscriptions/subscription-form";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { AppLoading } from "@/components/motion/app-loading";
import { useSubscription } from "@/hooks/use-subscriptions";

export default function EditSubscriptionPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <EditSubscriptionContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function EditSubscriptionContent() {
  const params = useParams<{ id: string }>();
  const { subscription, loading } = useSubscription(params.id);

  if (loading) {
    return <AppLoading title="Edit Subscription" showSearch={false} />;
  }

  return <SubscriptionFormScreen mode="edit" existing={subscription} />;
}
