"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { SpendWiseBrand } from "@/components/brand/spendwise-logo";
import {
  IconCard,
  IconChart,
  IconClock,
  IconGear,
  IconGrid,
  IconHome,
  IconList,
  IconPlus,
  IconRepeat,
  IconSearch,
  IconTrend,
  IconWallet,
} from "@/components/icons";
import { PageEnter } from "@/components/motion/page-enter";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { usePendingCount } from "@/hooks/use-transaction";
import { formatPendingBadge } from "@pfos/shared";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
};

const overviewNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <IconHome /> },
  { href: "/transactions", label: "Transactions", icon: <IconList /> },
  { href: "/accounts", label: "Accounts", icon: <IconWallet /> },
  { href: "/categories", label: "Categories", icon: <IconGrid /> },
];

const manageNavBase: Omit<NavItem, "badge">[] = [
  { href: "/recurring", label: "Recurring", icon: <IconRepeat /> },
  { href: "/sip", label: "SIPs", icon: <IconTrend /> },
  { href: "/subscriptions", label: "Subscriptions", icon: <IconCard /> },
  { href: "/reports", label: "Reports", icon: <IconChart /> },
  { href: "/pending", label: "Pending", icon: <IconClock /> },
];

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  primaryAction?: { label: string; href?: string };
  headerActions?: React.ReactNode;
};

export function AppShell({
  children,
  title,
  subtitle,
  showSearch = true,
  primaryAction,
  headerActions,
}: AppShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { count: pendingCount } = usePendingCount();
  const pendingBadge = formatPendingBadge(pendingCount);

  const manageNav: NavItem[] = manageNavBase.map((item) =>
    item.href === "/pending" && pendingBadge
      ? { ...item, badge: pendingBadge }
      : item,
  );

  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "User";
  const email = user?.email ?? "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <aside className="flex h-full w-[248px] shrink-0 flex-col overflow-y-auto border-r border-line bg-paper px-4 py-6">
        <div className="mb-6 px-2">
          <SpendWiseBrand showTagline />
        </div>

        <NavGroup label="Overview" items={overviewNav} pathname={pathname} />
        <NavGroup label="Manage" items={manageNav} pathname={pathname} />

        <div className="flex-1" />

        <nav>
          <NavLink
            href="/settings"
            label="Settings"
            icon={<IconGear />}
            active={pathname === "/settings"}
          />
        </nav>

        <div className="mt-2.5 flex items-center gap-2.5 rounded-md border border-line p-2.5">
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-mint-bright to-mint-600 font-display text-sm font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <b className="block truncate text-[13px] font-bold text-ink-900">
              {displayName}
            </b>
            <span className="block truncate text-[11.5px] text-ink-400">
              {email}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-[var(--z-sticky)] flex h-[72px] shrink-0 items-center gap-4 border-b border-line bg-paper/95 px-8 backdrop-blur-sm">
          <div>
            <div className="font-display text-[22px] font-bold text-ink-900">
              {title}
            </div>
            {subtitle ? (
              <small className="block text-[13px] font-semibold text-ink-400">
                {subtitle}
              </small>
            ) : null}
          </div>
          <div className="flex-1" />
          {showSearch ? <HeaderSearch /> : null}
          {headerActions ? (
            headerActions
          ) : primaryAction ? (
            primaryAction.href ? (
              <Link href={primaryAction.href}>
                <Button>
                  <IconPlus />
                  {primaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button>
                <IconPlus />
                {primaryAction.label}
              </Button>
            )
          ) : null}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-8">
          <PageEnter>{children}</PageEnter>
        </main>
      </div>
    </div>
  );
}

function HeaderSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        router.push(
          query ? `/transactions?q=${encodeURIComponent(query)}` : "/transactions",
        );
      }}
      className="flex h-10 w-60 items-center gap-2 rounded-pill border border-line bg-canvas px-3.5 text-[13px] font-semibold text-ink-500 transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus-within:border-mint-400 focus-within:shadow-[0_0_0_3px_var(--mint-100)]"
    >
      <IconSearch />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search transactions"
        aria-label="Search transactions"
        className="w-full border-none bg-transparent text-ink-900 outline-none placeholder:font-semibold placeholder:text-ink-400"
      />
    </form>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="mb-2">
      <div className="px-3 pt-4 pb-2 text-[11.5px] font-bold tracking-[0.7px] text-ink-400 uppercase">
        {label}
      </div>
      {items.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          badge={item.badge}
          active={
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          }
        />
      ))}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  badge,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold",
        "motion-press transition-[background-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        active
          ? "bg-mint-500 text-white shadow-sm"
          : "text-ink-600 hover:bg-tint hover:text-ink-800",
      )}
    >
      {icon}
      <span>{label}</span>
      {badge ? (
        <span
          className={cn(
            "ml-auto rounded-pill px-2 py-0.5 text-[11.5px] font-bold",
            active
              ? "bg-white/25 text-white"
              : "bg-pending-bg text-pending",
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
