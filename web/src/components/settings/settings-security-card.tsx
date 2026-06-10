"use client";

import { useRouter } from "next/navigation";

import { IconLogout, IconShield } from "@/components/icons";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";

export function SettingsSecurityCard() {
  const { signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <section className="rounded-lg border border-line bg-paper p-5">
      <h3 className="mb-3 flex items-center gap-2.5 font-display text-[15px] font-bold text-ink-900">
        <IconShield className="text-mint-600" />
        Security
      </h3>

      <div className="flex items-center justify-between border-b border-line-soft py-2.5 text-sm font-semibold text-ink-700">
        <span>Sign-in provider</span>
        <Tag variant="income" dot>
          Google / email
        </Tag>
      </div>

      <div className="flex items-center justify-between py-2.5 text-sm font-semibold text-ink-700">
        <span>Active session</span>
        <span className="text-ink-500">This browser</span>
      </div>

      <Button
        variant="ghost"
        fullWidth
        className="mt-4 text-expense hover:bg-expense-bg hover:text-expense"
        onClick={() => void handleSignOut()}
      >
        <IconLogout />
        Sign out
      </Button>
    </section>
  );
}
