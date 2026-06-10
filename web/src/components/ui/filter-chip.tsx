"use client";

import { cn } from "@/lib/cn";

type FilterChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export function FilterChip({
  label,
  active = false,
  onClick,
  disabled = false,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "motion-chip rounded-pill px-3.5 py-1.5 text-[13px] font-bold",
        "transition-[background-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
        "disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "bg-mint-500 text-white shadow-sm"
          : "text-ink-500 hover:bg-tint hover:text-ink-700",
        className,
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
