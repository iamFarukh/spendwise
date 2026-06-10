"use client";

import { useEffect, useId, useRef, useState } from "react";

import { IconCheck, IconChevronDown } from "@/components/icons";
import { cn } from "@/lib/cn";

import type { SelectOption } from "@/components/ui/select-field";

type SettingsInlineSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  leading?: React.ReactNode;
  ariaLabel: string;
};

export function SettingsInlineSelect({
  value,
  onChange,
  options,
  disabled = false,
  leading,
  ariaLabel,
}: SettingsInlineSelectProps) {
  const fieldId = useId();
  const listboxId = `${fieldId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [open, selectedIndex]);

  function selectOption(index: number) {
    const option = options[index];
    if (!option) {
      return;
    }
    onChange(option.value);
    setOpen(false);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open && highlightedIndex >= 0) {
        selectOption(highlightedIndex);
      } else {
        setOpen((current) => !current);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((current) =>
        current < options.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((current) =>
        current > 0 ? current - 1 : options.length - 1,
      );
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "inline-flex h-[42px] max-w-[min(100vw-2rem,320px)] items-center gap-2 rounded-md border border-line bg-canvas px-3.5 text-sm font-bold text-ink-900",
          "transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          open && "border-mint-400 shadow-[0_0_0_3px_var(--mint-100)]",
          !open &&
            "hover:border-mint-200 focus-visible:border-mint-400 focus-visible:shadow-[0_0_0_3px_var(--mint-100)] focus-visible:outline-none",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {leading}
        <span className="truncate">{selected?.label ?? "Select…"}</span>
        <IconChevronDown
          className={cn(
            "ml-1 h-4 w-4 shrink-0 text-ink-400 transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)]",
            open && "rotate-180 text-mint-600",
          )}
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={
            highlightedIndex >= 0
              ? `${fieldId}-option-${highlightedIndex}`
              : undefined
          }
          className="dropdown-panel absolute top-[calc(100%+6px)] right-0 z-[var(--z-dropdown)] max-h-[280px] min-w-full overflow-y-auto rounded-md border border-line bg-paper p-1.5 shadow-md"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  id={`${fieldId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(index)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
                    isHighlighted && "bg-tint",
                    isSelected && "bg-mint-50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[15px] font-semibold",
                        isSelected ? "text-mint-700" : "text-ink-900",
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="mt-0.5 block text-xs leading-snug font-medium text-ink-500">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
                  ) : (
                    <span className="w-4 shrink-0" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
