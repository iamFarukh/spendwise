"use client";

import { useParams } from "next/navigation";

import { CategoryFormScreen } from "@/components/categories/category-form";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { useCategory } from "@/hooks/use-category";

export default function EditCategoryPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <EditCategoryContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function EditCategoryContent() {
  const params = useParams<{ id: string }>();
  const { category, loading } = useCategory(params.id);

  return (
    <CategoryFormScreen
      mode="edit"
      existing={category}
      loadingExisting={loading}
    />
  );
}
