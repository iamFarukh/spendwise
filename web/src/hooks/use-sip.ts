import { useMemo } from "react";

import {
  computeSipAnalytics,
  computeSipDashboard,
  filterSipTemplates,
  type SipAnalytics,
  type SipDashboardSummary,
} from "@pfos/shared";

import { useRecurring } from "@/hooks/use-recurring";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";

export function useSips() {
  const { templates, loading, error } = useRecurring();
  const sips = useMemo(() => filterSipTemplates(templates), [templates]);
  return { sips, templates, loading, error };
}

export function useSipDashboard(): {
  dashboard: SipDashboardSummary | null;
  loading: boolean;
  error: string | null;
} {
  const { templates, loading, error } = useRecurring();
  const { transactions } = useTransactions();
  const { settings } = useUserSettings();
  const timezone = settings?.timezone ?? "Asia/Kolkata";

  const dashboard = useMemo(() => {
    if (!settings) {
      return null;
    }
    return computeSipDashboard(templates, transactions, timezone);
  }, [settings, templates, transactions, timezone]);

  return { dashboard, loading, error };
}

export function useSipAnalytics(): {
  analytics: SipAnalytics | null;
  loading: boolean;
} {
  const { templates, loading } = useRecurring();
  const { transactions } = useTransactions();
  const { settings } = useUserSettings();
  const timezone = settings?.timezone ?? "Asia/Kolkata";

  const analytics = useMemo(() => {
    if (!settings) {
      return null;
    }
    return computeSipAnalytics(templates, transactions, timezone);
  }, [settings, templates, transactions, timezone]);

  return { analytics, loading };
}

export function useSipDueCount(): number {
  const { dashboard } = useSipDashboard();
  return dashboard?.pendingReminderCount ?? 0;
}
