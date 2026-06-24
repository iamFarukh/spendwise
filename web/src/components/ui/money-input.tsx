"use client";

import { useId, useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/cn";

type MoneyInputProps = {
  label: string;
  /** Normalized amount string, e.g. "12345.50" (no grouping). */
  value: string;
  onChange: (value: string) => void;
  currency: string;
  hint?: string;
  error?: string;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  className?: string;
};

export function getCurrencySymbol(currency: string): string {
  try {
    return (
      new Intl.NumberFormat("en-IN", { style: "currency", currency })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

/** "1234567.5" → "12,34,567.5" (en-IN grouping, typing-friendly). */
function formatAmount(raw: string): string {
  if (!raw) return "";
  const [intPart = "", decPart] = raw.split(".");
  const grouped = intPart
    ? new Intl.NumberFormat("en-IN").format(Number(intPart) || 0)
    : "0";
  return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
}

/** Keep digits and at most one dot with two decimals. */
function normalizeAmount(text: string): string {
  let raw = text.replace(/[^\d.]/g, "");
  const dot = raw.indexOf(".");
  if (dot !== -1) {
    raw =
      raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  }
  // Cap to a sane ledger magnitude (15 integer digits).
  const [intPart, decPart] = raw.split(".");
  const cappedInt = (intPart ?? "").slice(0, 15);
  return decPart !== undefined ? `${cappedInt}.${decPart}` : cappedInt;
}

/**
 * Currency input with live en-IN grouping. Negative amounts are impossible
 * by construction — only digits and a decimal point are accepted.
 */
export function MoneyInput({
  label,
  value,
  onChange,
  currency,
  hint,
  error,
  required = false,
  autoFocus = false,
  id,
  name,
  className,
}: MoneyInputProps) {
  const generatedId = useId();
  const inputId = id ?? name ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);

  const display = formatAmount(value);
  const symbol = getCurrencySymbol(currency);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (pendingCaret.current === null || !input) return;
    // Map "significant chars before caret" back to a caret position in the
    // formatted string so grouping commas never displace the cursor.
    let remaining = pendingCaret.current;
    let position = 0;
    for (const char of input.value) {
      if (remaining === 0) break;
      position += 1;
      if (/[\d.]/.test(char)) remaining -= 1;
    }
    input.setSelectionRange(position, position);
    pendingCaret.current = null;
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    const caret = event.target.selectionStart ?? text.length;
    const significantBeforeCaret = normalizeAmount(
      text.slice(0, caret),
    ).length;
    pendingCaret.current = significantBeforeCaret;
    onChange(normalizeAmount(text));
  }

  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <label className={cn("block", className)} htmlFor={inputId}>
      <span className="mb-[7px] block text-[13px] font-bold text-ink-700">
        {label}
        {required ? (
          <span className="ml-0.5 text-expense" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      <div
        className={cn(
          "flex h-[46px] items-stretch overflow-hidden rounded-md border bg-canvas transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          error
            ? "border-expense focus-within:border-expense focus-within:shadow-[0_0_0_3px_var(--expense-bg)]"
            : "border-line focus-within:border-mint-400 focus-within:shadow-[0_0_0_3px_var(--mint-100)]",
        )}
      >
        <span
          className="flex min-w-11 shrink-0 items-center justify-center border-r border-line-soft bg-tint px-3 text-[14px] font-bold text-mint-700"
          aria-hidden="true"
        >
          {symbol}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          value={display}
          onChange={handleChange}
          placeholder="0"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="tnum w-full border-none bg-transparent px-3.5 font-semibold text-[15px] text-ink-900 outline-none placeholder:font-medium placeholder:text-ink-500"
        />
      </div>
      {error ? (
        <p
          key={error}
          id={`${inputId}-error`}
          role="alert"
          className="input-shake mt-2 text-[13px] font-bold text-expense-strong"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-2 text-[13px] text-ink-500">
          {hint}
        </p>
      ) : null}
    </label>
  );
}
