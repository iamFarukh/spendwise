"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { AuthLoading } from "@/components/motion/app-loading";
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
    return <AuthLoading />;
  }

  if (!setupComplete) {
    return null;
  }

  return <>{children}</>;
}
