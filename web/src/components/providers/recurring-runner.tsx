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

    void runDueRecurringTemplates(user.uid, settings.timezone).catch((err) => {
      // Idempotent posting (deterministic ids) makes a retry safe on the next
      // focus or mount; log so failures aren't silently swallowed.
      console.error("Recurring runner failed:", err);
    });
  }, [settings, setupComplete, user]);

  useEffect(() => {
    run();
    const interval = window.setInterval(run, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
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
