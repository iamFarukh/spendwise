"use client";

import type { Category } from "@pfos/shared";
import { useMemo } from "react";

import { useAllCategories } from "@/hooks/use-all-categories";

export function useCategory(id: string | null | undefined) {
  const { categories, loading, error } = useAllCategories();

  const category = useMemo<Category | null>(() => {
    if (!id) {
      return null;
    }
    return categories.find((item) => item.id === id) ?? null;
  }, [categories, id]);

  return { category, loading, error };
}
