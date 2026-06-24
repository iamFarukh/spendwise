"use client";

import { AccountDeletionContent } from "@/components/legal/account-deletion-content";
import { LegalPageHeader } from "@/components/legal/legal-page-header";
import { APP_VERSION } from "@/constants/app";
import { BUNDLED_ACCOUNT_DELETION } from "@pfos/shared";

export default function AccountDeletionPage() {
  const document = BUNDLED_ACCOUNT_DELETION;

  return (
    <div className="min-h-screen bg-canvas">
      <LegalPageHeader />

      <main className="mx-auto max-w-3xl px-6 py-8 md:px-8 md:py-10">
        <header className="mb-8 border-b border-line-soft pb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
            {document.title}
          </h1>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-ink-500">
            How to delete your SpendWise account and associated data
          </p>
        </header>

        <div className="space-y-5">
          <div className="rounded-lg border border-line bg-paper p-6 md:p-8">
            <AccountDeletionContent document={document} />
          </div>

          <footer className="text-center text-xs font-semibold text-ink-400">
            <p>App v{APP_VERSION}</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
