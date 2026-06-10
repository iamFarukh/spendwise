"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useUserSettings } from "@/hooks/use-user-settings";

export function RequireSetupComplete({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { loading, setupComplete } = useUserSettings();

  useEffect(() => {
    if (!loading && !setupComplete) {
      router.replace("/setup");
    }
  }, [loading, router, setupComplete]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-ink-500">
        Loading…
      </div>
    );
  }

  if (!setupComplete) {
    return null;
  }

  return <>{children}</>;
}
