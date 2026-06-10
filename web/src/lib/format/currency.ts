type MoneyFormatOptions = {
  maximumFractionDigits?: number;
};

export function formatMoney(
  amount: number,
  currency: string,
  options?: MoneyFormatOptions,
): string {
  const maximumFractionDigits = options?.maximumFractionDigits ?? 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN", {
      maximumFractionDigits,
    })}`;
  }
}

export type LedgerMoneySettings = {
  baseCurrency: string;
  roundAmounts?: boolean;
} | null | undefined;

function ledgerFractionDigits(settings: LedgerMoneySettings): number {
  return settings?.roundAmounts === false ? 2 : 0;
}

export function formatLedgerMoney(
  amount: number,
  settings: LedgerMoneySettings,
): string {
  const currency = settings?.baseCurrency ?? "INR";
  return formatMoney(amount, currency, {
    maximumFractionDigits: ledgerFractionDigits(settings),
  });
}

export function formatLedgerSignedMoney(
  amount: number,
  settings: LedgerMoneySettings,
  options?: { forceNegative?: boolean },
): string {
  const currency = settings?.baseCurrency ?? "INR";
  const maximumFractionDigits = ledgerFractionDigits(settings);
  const abs = Math.abs(amount);
  try {
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits,
    }).format(abs);
    if (options?.forceNegative || amount < 0) {
      return `−${formatted}`;
    }
    if (amount > 0) {
      return `+${formatted}`;
    }
    return formatted;
  } catch {
    const base = `${currency} ${abs.toLocaleString("en-IN", {
      maximumFractionDigits,
    })}`;
    if (options?.forceNegative || amount < 0) {
      return `−${base}`;
    }
    if (amount > 0) {
      return `+${base}`;
    }
    return base;
  }
}

export function parseMoneyInput(value: string): number {
  const normalized = value.replace(/,/g, "").trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatCompactMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    if (amount >= 1000) {
      return `${currency} ${(amount / 1000).toFixed(1)}k`;
    }
    return formatMoney(amount, currency);
  }
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
