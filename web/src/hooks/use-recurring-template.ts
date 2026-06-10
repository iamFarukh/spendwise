"use client";

import type { RecurringTemplate } from "@pfos/shared";
import { useMemo } from "react";

import { useRecurring } from "@/hooks/use-recurring";

export function useRecurringTemplate(id: string | null | undefined) {
  const { templates, loading, error } = useRecurring();

  const template = useMemo<RecurringTemplate | null>(() => {
    if (!id) {
      return null;
    }
    return templates.find((item) => item.id === id) ?? null;
  }, [id, templates]);

  return { template, loading, error };
}
