"use client";

import { useCallback, useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useUserSettings } from "@/hooks/use-user-settings";
import { runDueRecurringTemplates } from "@/lib/recurring/service";

export function RecurringRunner() {
  const { user } = useAuth();
  const { settings, setupComplete } = useUserSettings();

  const run = useCallback(() => {
    if (!user || !setupComplete || !settings) {
      return;
    }

    void runDueRecurringTemplates(user.uid, settings.timezone).catch(() => {
      // Retry on the next focus or mount.
    });
  }, [settings, setupComplete, user]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        run();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [run]);

  return null;
}
