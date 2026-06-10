import type {
  Account,
  AccountClass,
  ReconcileCadence,
} from "@pfos/shared";

import {
  ACCOUNT_KIND_OPTIONS,
  CLASS_LABELS,
} from "@/lib/setup/constants";

export const RECONCILE_CADENCE_OPTIONS: {
  value: ReconcileCadence;
  label: string;
  description: string;
}[] = [
  {
    value: "WEEKLY",
    label: "Weekly",
    description: "Cash and wallets — reconcile often",
  },
  {
    value: "MONTHLY",
    label: "Monthly",
    description: "Banks and cards — match your statement",
  },
  {
    value: "MANUAL",
    label: "Manual",
    description: "Reconcile when you are ready",
  },
  {
    value: "NEVER",
    label: "Never",
    description: "Tracking accounts — no reconciliation",
  },
];

export function defaultReconcileCadence(
  accountClass: AccountClass,
  kind: Account["kind"],
): ReconcileCadence {
  if (accountClass === "TRACKING") {
    return "NEVER";
  }
  if (accountClass === "LIABILITY") {
    return "MONTHLY";
  }
  if (kind === "CASH" || kind === "WALLET") {
    return "WEEKLY";
  }
  return "MONTHLY";
}

export function getReconcileCadenceLabel(cadence: ReconcileCadence): string {
  switch (cadence) {
    case "WEEKLY":
      return "reconcile weekly";
    case "MONTHLY":
      return "auto-reconcile monthly";
    case "MANUAL":
      return "reconcile manually";
    case "NEVER":
      return "not reconciled";
    default:
      return cadence;
  }
}

export function getAccountKindLabel(account: Account): string {
  const match = ACCOUNT_KIND_OPTIONS[account.class].find(
    (option) => option.kind === account.kind,
  );
  return match?.label ?? account.kind;
}

export function getAccountCardSubtitle(account: Account): string {
  const kind = getAccountKindLabel(account);
  const cadence = getReconcileCadenceLabel(account.reconcileCadence);
  if (account.class === "TRACKING") {
    return `${CLASS_LABELS[account.class]} · not spending`;
  }
  return `${kind} · ${cadence}`;
}
