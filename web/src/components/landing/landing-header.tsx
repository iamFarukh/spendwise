"use client";

import Link from "next/link";

import { SpendWiseBrand } from "@/components/brand/spendwise-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

export function LandingHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
        <Link
          href="/"
          className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500"
          aria-label="SpendWise home"
        >
          <SpendWiseBrand size={40} showTagline priority />
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#download">Download</NavLink>
          <NavLink href="/privacy">Privacy</NavLink>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {loading ? (
            <span className="inline-flex h-[42px] w-28" aria-hidden />
          ) : user ? (
            <Link href="/dashboard">
              <Button size="md">Open dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex">
                <Button variant="ghost" size="md">
                  Sign in
                </Button>
              </Link>
              <Link href="/login?mode=sign-up">
                <Button size="md">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-bold text-ink-600 transition-colors hover:bg-tint hover:text-ink-900"
    >
      {children}
    </Link>
  );
}
