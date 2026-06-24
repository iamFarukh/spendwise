"use client";

import Link from "next/link";

import { SpendWiseBrand } from "@/components/brand/spendwise-logo";
import { useAuth } from "@/components/providers/auth-provider";

export function LegalPageHeader() {
  const { user, loading } = useAuth();
  const homeHref = user ? "/dashboard" : "/login";
  const actionHref = user ? "/dashboard" : "/login";
  const actionLabel = user ? "Go to dashboard" : "Sign in";

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-6 px-6 py-4 md:px-8">
        <Link
          href={homeHref}
          className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500"
          aria-label="SpendWise home"
        >
          <SpendWiseBrand size={38} priority />
        </Link>
        {loading ? (
          <span
            className="inline-flex min-h-11 min-w-[5.5rem] shrink-0 items-center justify-end"
            aria-hidden
          />
        ) : (
          <Link
            href={actionHref}
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-bold text-mint-700 transition-colors hover:bg-tint hover:text-mint-800"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    </header>
  );
}
