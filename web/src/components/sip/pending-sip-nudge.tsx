"use client";

import Link from "next/link";

import { formatPendingBadge } from "@pfos/shared";

import { IconClock } from "@/components/icons";
import { usePendingCount } from "@/hooks/use-transaction";

/** Compact nudge when SIP or other entries need a tick in Pending. */
export function PendingSipNudge() {
  const { count } = usePendingCount();
  const badge = formatPendingBadge(count);

  if (!badge) {
    return null;
  }

  return (
    <Link
      href="/pending"
      className="flex items-center gap-3 rounded-xl border border-pending/30 bg-pending-bg px-4 py-3.5 transition-colors hover:border-pending/50"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pending/15 text-pending">
        <IconClock className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-ink-900">
          {count === 1 ? "1 entry needs your tick" : `${badge} entries need your tick`}
        </p>
        <p className="text-xs text-ink-500">
          SIP payments and other captures — confirm in Pending
        </p>
      </div>
      <span className="rounded-pill bg-pending px-2.5 py-0.5 text-xs font-extrabold text-white">
        {badge}
      </span>
    </Link>
  );
}
