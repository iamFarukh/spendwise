import { cn } from "@/lib/cn";

type AmountFieldProps = {
  currencySymbol: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function AmountField({
  currencySymbol,
  value,
  onChange,
  className,
  inputRef,
}: AmountFieldProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-tint px-5 py-4",
        className,
      )}
    >
      <span className="text-[13px] font-bold text-ink-700">Amount</span>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-[28px] font-bold text-ink-400">
          {currencySymbol}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="tnum min-w-0 flex-1 border-none bg-transparent font-display text-[48px] leading-none font-bold tracking-[-1px] text-ink-900 outline-none placeholder:text-ink-300"
          aria-label="Amount"
        />
      </div>
    </div>
  );
}

export function getCurrencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}
