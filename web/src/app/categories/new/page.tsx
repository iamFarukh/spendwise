"use client";

import { CategoryFormScreen } from "@/components/categories/category-form";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";

export default function NewCategoryPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <CategoryFormScreen mode="create" />
      </RequireSetupComplete>
    </RequireAuth>
  );
}
