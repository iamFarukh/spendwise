"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { configured, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/login");
    }
  }, [configured, loading, router, user]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-ink-500">
        Loading…
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto flex max-w-xl flex-1 flex-col gap-4 px-6 py-16">
        <p className="text-sm text-ink-600">
          Firebase is not configured. Add your env vars to{" "}
          <code className="rounded bg-tint px-1 font-mono text-ink-800">
            web/.env.local
          </code>
          .
        </p>
        <Link href="/login" className="text-sm font-bold text-mint-600">
          Go to login
        </Link>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
