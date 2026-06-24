"use client";

import { SipFormScreen } from "@/components/sip/sip-form";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";

export default function NewSipPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <SipFormScreen mode="create" />
      </RequireSetupComplete>
    </RequireAuth>
  );
}
