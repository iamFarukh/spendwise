"use client";

import { useParams } from "next/navigation";

import { SipFormScreen } from "@/components/sip/sip-form";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { AppLoading } from "@/components/motion/app-loading";
import { useRecurringTemplate } from "@/hooks/use-recurring-template";

export default function EditSipPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <EditSipContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function EditSipContent() {
  const params = useParams<{ id: string }>();
  const { template, loading } = useRecurringTemplate(params.id);

  if (loading) {
    return <AppLoading title="Edit SIP" showSearch={false} />;
  }

  return <SipFormScreen mode="edit" existing={template} />;
}
