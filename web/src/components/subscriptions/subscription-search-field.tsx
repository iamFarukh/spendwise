"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  MIN_SUBSCRIPTION_SEARCH_CHARS,
  SUBSCRIPTION_SEARCH_DEBOUNCE_MS,
  searchSubscriptionAssets,
  type SubscriptionAsset,
} from "@pfos/shared";

import { IconChevronDown, IconPlus, IconSearch } from "@/components/icons";
import { SubscriptionLogo } from "@/components/subscriptions/subscription-logo";
import { cn } from "@/lib/cn";

type SubscriptionSearchFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectAsset: (asset: SubscriptionAsset) => void;
  onAddCustom: () => void;
};

/**
 * Subscription search field with a Google / Apple-style suggestion dropdown.
 * Search is 100% local (the bundled asset library) — instant, no network.
 * Begins after 2 characters, debounced, full keyboard support.
 */
export function SubscriptionSearchField({
  label,
  value,
  onChangeText,
  onSelectAsset,
  onAddCustom,
}: SubscriptionSearchFieldProps) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SubscriptionAsset[]>([]);
  const [empty, setEmpty] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const fieldId = useId();
  const listboxId = `${fieldId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRef = useRef(false);

  // Debounced local search while focused.
  useEffect(() => {
    if (!focused) return;
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = value.trim();
    if (query.length < MIN_SUBSCRIPTION_SEARCH_CHARS) {
      setResults([]);
      setEmpty(false);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const items = searchSubscriptionAssets(query);
      setResults(items);
      setEmpty(items.length === 0);
      setHighlighted(items.length > 0 ? 0 : -1);
      setOpen(true);
    }, SUBSCRIPTION_SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  useEffect(() => {
    if (!open || highlighted < 0) return;
    document
      .getElementById(`${fieldId}-option-${highlighted}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted, fieldId]);

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
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function selectAsset(asset: SubscriptionAsset) {
    suppressRef.current = true;
    onSelectAsset(asset);
    setOpen(false);
    setResults([]);
    setEmpty(false);
    inputRef.current?.blur();
  }

  function addCustom() {
    onAddCustom();
    setOpen(false);
    setEmpty(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((c) => (c < results.length - 1 ? c + 1 : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((c) => (c > 0 ? c - 1 : results.length - 1));
    } else if (event.key === "Enter") {
      if (open && highlighted >= 0 && results[highlighted]) {
        event.preventDefault();
        selectAsset(results[highlighted]);
      }
    }
  }

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
          )}
        >
          <IconSearch
            className={cn(
              "h-[18px] w-[18px] shrink-0",
              focused ? "text-mint-600" : "text-ink-400",
            )}
          />
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
            value={value}
            onChange={(e) => onChangeText(e.target.value)}
            onFocus={() => {
              setFocused(true);
              if (results.length > 0 || empty) setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Search ChatGPT, Netflix, Spotify…"
            autoComplete="off"
            className="w-full border-none bg-transparent text-[15px] font-semibold text-ink-900 shadow-none outline-none placeholder:font-medium placeholder:text-ink-500 focus:shadow-none focus-visible:shadow-none"
          />
        </div>

        {open ? (
          <div
            id={listboxId}
            role="listbox"
            className="dropdown-panel absolute top-[calc(100%+6px)] right-0 left-0 z-[var(--z-dropdown)] max-h-[320px] overflow-y-auto rounded-md border border-line bg-paper shadow-md"
          >
            {empty ? (
              <div className="space-y-2 p-3.5">
                <p className="text-[14px] font-bold text-ink-900">
                  Can&apos;t find your subscription?
                </p>
                <p className="text-[12px] font-medium text-ink-500">
                  Add it manually and fill in the details.
                </p>
                <AddCustomButton onClick={addCustom} />
              </div>
            ) : (
              <ul className="p-1.5">
                {results.map((item, index) => {
                  const isHighlighted = index === highlighted;
                  return (
                    <li key={item.id} role="presentation">
                      <button
                        type="button"
                        id={`${fieldId}-option-${index}`}
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setHighlighted(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectAsset(item)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
                          isHighlighted && "bg-tint",
                        )}
                      >
                        <SubscriptionLogo
                          name={item.name}
                          iconSlug={item.iconSlug}
                          category={item.category}
                          color={item.color}
                          monogram={item.mark}
                          size={36}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold text-ink-900">
                            {item.name}
                          </span>
                          <span className="mt-0.5 block text-[12px] font-medium text-ink-500">
                            {item.category}
                          </span>
                        </span>
                        <IconChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-ink-400" />
                      </button>
                    </li>
                  );
                })}
                <li role="presentation" className="border-t border-line-soft p-1.5">
                  <AddCustomButton onClick={addCustom} />
                </li>
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </label>
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
      Add Custom Subscription
    </button>
  );
}
