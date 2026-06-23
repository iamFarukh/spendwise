"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  INVESTMENT_SEARCH_DEBOUNCE_MS,
  MIN_INVESTMENT_SEARCH_CHARS,
  getInvestmentNamePlaceholder,
  isSearchableInvestmentType,
  searchMutualFunds,
  type MutualFundSearchResult,
  type SipInvestmentType,
} from "@pfos/shared";

import { IconChevronDown, IconPlus, IconSearch } from "@/components/icons";
import { cn } from "@/lib/cn";

type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

type InvestmentNameFieldProps = {
  label: string;
  /** The chosen investment type, or "" when the user hasn't picked one yet. */
  investmentType: SipInvestmentType | "";
  value: string;
  /** Manual text edits (also clears any previously selected scheme code). */
  onChangeText: (text: string) => void;
  /** A result was picked from the dropdown — name + scheme code. */
  onSelectResult: (name: string, schemeCode: number) => void;
};

/**
 * SIP "Name" field with a Google-style suggestion dropdown for searchable types
 * (mutual funds): debounced search, cancelled stale requests, inline
 * loading/empty/error, full keyboard support (↑/↓ to move, Enter to select,
 * Escape to close). For other types it's a plain text input.
 */
export function InvestmentNameField({
  label,
  investmentType,
  value,
  onChangeText,
  onSelectResult,
}: InvestmentNameFieldProps) {
  const type = investmentType || null;
  const disabled = !investmentType;
  const searchable = isSearchableInvestmentType(type);

  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<MutualFundSearchResult[]>([]);
  const [highlighted, setHighlighted] = useState(-1);

  const fieldId = useId();
  const listboxId = `${fieldId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Set right after a programmatic select so the populated value won't re-search.
  const suppressRef = useRef(false);

  function runSearch(query: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setOpen(true);
    searchMutualFunds(query, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setResults(items);
        setHighlighted(items.length > 0 ? 0 : -1);
        setStatus(items.length > 0 ? "success" : "empty");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error)?.name === "AbortError") {
          return;
        }
        setResults([]);
        setHighlighted(-1);
        setStatus("error");
      });
  }

  // Debounced search — only while a searchable type is focused.
  useEffect(() => {
    if (!searchable || !focused) return;
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = value.trim();
    if (query.length < MIN_INVESTMENT_SEARCH_CHARS) {
      abortRef.current?.abort();
      setResults([]);
      setStatus("idle");
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(
      () => runSearch(query),
      INVESTMENT_SEARCH_DEBOUNCE_MS,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, searchable, focused]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open || highlighted < 0) return;
    document
      .getElementById(`${fieldId}-option-${highlighted}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted, fieldId]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function selectResult(item: MutualFundSearchResult) {
    suppressRef.current = true;
    onSelectResult(item.schemeName, item.schemeCode);
    setOpen(false);
    setStatus("idle");
    setResults([]);
    inputRef.current?.blur();
  }

  /** No result fit — let the user keep the typed text as a manual name. */
  function addCustom() {
    setOpen(false);
    setStatus("idle");
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (status !== "success" || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((current) =>
        current < results.length - 1 ? current + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((current) =>
        current > 0 ? current - 1 : results.length - 1,
      );
    } else if (event.key === "Enter") {
      if (open && highlighted >= 0 && results[highlighted]) {
        event.preventDefault();
        selectResult(results[highlighted]);
      }
    }
  }

  const showDropdown = searchable && open && status !== "idle";

  return (
    <label className="block">
      <span className="mb-[7px] block text-[13px] font-bold text-ink-700">
        {label}
      </span>
      <div ref={rootRef} className="relative">
        <div
          className={cn(
            "flex h-[46px] items-center gap-2 rounded-md border bg-canvas px-3.5 transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
            focused
              ? "border-mint-400 shadow-[0_0_0_3px_var(--mint-100)]"
              : "border-line",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          {searchable ? (
            <IconSearch
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                focused ? "text-mint-600" : "text-ink-400",
              )}
            />
          ) : null}
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && highlighted >= 0
                ? `${fieldId}-option-${highlighted}`
                : undefined
            }
            disabled={disabled}
            value={value}
            onChange={(e) => onChangeText(e.target.value)}
            onFocus={() => {
              setFocused(true);
              if (status !== "idle") setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={getInvestmentNamePlaceholder(type)}
            autoComplete="off"
            className="w-full border-none bg-transparent text-[15px] font-semibold text-ink-900 shadow-none outline-none placeholder:font-medium placeholder:text-ink-500 focus:shadow-none focus-visible:shadow-none disabled:cursor-not-allowed"
          />
        </div>

        {showDropdown ? (
          <div
            id={listboxId}
            role="listbox"
            className="dropdown-panel absolute top-[calc(100%+6px)] right-0 left-0 z-[var(--z-dropdown)] max-h-[300px] overflow-y-auto rounded-md border border-line bg-paper shadow-md"
          >
            {status === "loading" ? (
              <LoadingState />
            ) : status === "error" ? (
              <ErrorState
                onRetry={() => runSearch(value.trim())}
                onAddCustom={addCustom}
              />
            ) : status === "empty" ? (
              <EmptyState onAddCustom={addCustom} />
            ) : (
              <ul className="p-1.5">
                {results.map((item, index) => {
                  const isHighlighted = index === highlighted;
                  return (
                    <li key={item.schemeCode} role="presentation">
                      <button
                        type="button"
                        id={`${fieldId}-option-${index}`}
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setHighlighted(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectResult(item)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
                          isHighlighted && "bg-tint",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-ink-900">
                            {item.schemeName}
                          </span>
                          <span className="mt-0.5 block text-[12px] font-medium tabular-nums text-ink-500">
                            {item.schemeCode}
                          </span>
                        </span>
                        <IconChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-ink-400" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 p-3.5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-ink-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-mint-200 border-t-mint-600" />
        Searching funds…
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-2.5 w-[85%] animate-pulse rounded bg-canvas-2" />
          <div className="h-2.5 w-[40%] animate-pulse rounded bg-canvas-2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAddCustom }: { onAddCustom: () => void }) {
  return (
    <div className="space-y-2 p-3.5">
      <p className="text-[14px] font-bold text-ink-900">No funds found</p>
      <p className="text-[12px] font-medium text-ink-500">
        Can&apos;t find your investment?
      </p>
      <AddCustomButton onClick={onAddCustom} />
    </div>
  );
}

function ErrorState({
  onRetry,
  onAddCustom,
}: {
  onRetry: () => void;
  onAddCustom: () => void;
}) {
  return (
    <div className="space-y-2 p-3.5">
      <p className="text-[14px] font-bold text-ink-900">
        Unable to load results
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRetry}
          className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-[13px] font-bold text-ink-700 transition-colors hover:border-mint-200 hover:bg-tint"
        >
          Retry
        </button>
        <AddCustomButton onClick={onAddCustom} />
      </div>
    </div>
  );
}

function AddCustomButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-3.5 py-1.5 text-[13px] font-bold text-mint-700 transition-colors hover:bg-mint-100"
    >
      <IconPlus className="h-4 w-4" />
      Add Custom Investment
    </button>
  );
}
