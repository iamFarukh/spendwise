"use client";

import { useParams } from "next/navigation";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { RecurringFormScreen } from "@/components/recurring/recurring-form";
import { useRecurringTemplate } from "@/hooks/use-recurring-template";

export default function EditRecurringPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <EditRecurringContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function EditRecurringContent() {
  const params = useParams<{ id: string }>();
  const { template, loading } = useRecurringTemplate(params.id);

  return (
    <RecurringFormScreen
      mode="edit"
      existing={template}
      loadingExisting={loading}
    />
  );
}
