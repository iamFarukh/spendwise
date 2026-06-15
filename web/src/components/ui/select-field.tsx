"use client";

import { useEffect, useId, useRef, useState } from "react";

import { IconCheck, IconChevronDown } from "@/components/icons";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type SelectFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
};

export function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  id,
  name,
  className,
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? name ?? generatedId;
  const listboxId = `${fieldId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef({ query: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    document
      .getElementById(`${fieldId}-option-${highlightedIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex, fieldId]);

  useEffect(() => {
    if (!open) return;

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

  function openList() {
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openList();
      } else if (highlightedIndex >= 0) {
        selectOption(highlightedIndex);
      } else {
        setOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openList();
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
        openList();
        return;
      }
      setHighlightedIndex((current) =>
        current > 0 ? current - 1 : options.length - 1,
      );
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setHighlightedIndex(options.length - 1);
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
      return;
    }

    // Typeahead: jump to the next option whose label starts with the
    // accumulated query (resets after 500ms of inactivity).
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      const now = Date.now();
      const state = typeaheadRef.current;
      state.query =
        now - state.at > 500
          ? event.key.toLowerCase()
          : state.query + event.key.toLowerCase();
      state.at = now;

      const startFrom = (open ? Math.max(highlightedIndex, 0) : selectedIndex) + 1;
      for (let offset = 0; offset < options.length; offset += 1) {
        const index = (startFrom + offset) % options.length;
        if (options[index].label.toLowerCase().startsWith(state.query)) {
          if (open) {
            setHighlightedIndex(index);
          } else {
            onChange(options[index].value);
          }
          return;
        }
      }
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <span
        id={`${fieldId}-label`}
        className="mb-[7px] block text-[13px] font-bold text-ink-700"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-expense" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>

      <button
        type="button"
        id={fieldId}
        name={name}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={`${fieldId}-label`}
        aria-activedescendant={
          open && highlightedIndex >= 0
            ? `${fieldId}-option-${highlightedIndex}`
            : undefined
        }
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
          } else {
            openList();
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex h-[46px] w-full items-stretch overflow-hidden rounded-md border border-line bg-canvas text-left transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          open && "border-mint-400 shadow-[0_0_0_3px_var(--mint-100)]",
          !open &&
            "hover:border-mint-200 focus-visible:border-mint-400 focus-visible:shadow-[0_0_0_3px_var(--mint-100)] focus-visible:outline-none",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center px-3.5">
          <span className="truncate text-[15px] font-semibold text-ink-900">
            {selected?.label ?? "Select…"}
          </span>
        </span>
        <span
          className="flex w-11 shrink-0 items-center justify-center border-l border-line-soft pl-2 pr-3.5"
          aria-hidden="true"
        >
          <IconChevronDown
            className={cn(
              "text-ink-400 transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)]",
              open && "rotate-180 text-mint-600",
            )}
          />
        </span>
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={`${fieldId}-label`}
          className="dropdown-panel absolute top-[calc(100%+6px)] right-0 left-0 z-[var(--z-dropdown)] max-h-[280px] overflow-y-auto rounded-md border border-line bg-paper p-1.5 shadow-md"
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
                      <span className="mt-0.5 block text-[12px] leading-snug font-medium text-ink-500">
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

      {hint ? (
        <p className="mt-2 text-[13px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}
