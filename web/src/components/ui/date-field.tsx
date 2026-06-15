"use client";

import { toDateStringInTimezone } from "@pfos/shared";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { IconCalendar } from "@/components/icons";
import { cn } from "@/lib/cn";
import {
  buildCalendarMonth,
  formatDateLabel,
  formatMonthLabel,
  isDateDisabled,
  parseDateString,
  WEEKDAY_LABELS,
} from "@/lib/dates/calendar";

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  minDate?: string;
  maxDate?: string;
  timezone?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
};

function addDaysToDateString(date: string, delta: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + delta))
    .toISOString()
    .slice(0, 10);
}

type PopoverPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: "below" | "above";
};

export function DateField({
  label,
  value,
  onChange,
  hint,
  error,
  minDate,
  maxDate,
  timezone,
  disabled = false,
  required = false,
  id,
  className,
}: DateFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [focusDate, setFocusDate] = useState<string | null>(null);

  const selected = value ? parseDateString(value) : null;
  const [viewYear, setViewYear] = useState(selected?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.month ?? new Date().getMonth() + 1);

  // Derived-state pattern: snap the visible month to an externally changed value.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value) {
      const parsed = parseDateString(value);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const panelHeight = panelRef.current?.offsetHeight ?? 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const placement =
        spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow
          ? "above"
          : "below";

      const width = Math.max(rect.width, 300);
      const left = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - width - 12,
      );

      setPosition(
        placement === "below"
          ? {
              top: rect.bottom + 8,
              left,
              width,
              placement,
            }
          : {
              bottom: window.innerHeight - rect.top + 8,
              left,
              width,
              placement,
            },
      );
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, viewMonth, viewYear]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const today = timezone
    ? toDateStringInTimezone(new Date(), timezone)
    : new Date().toISOString().slice(0, 10);

  const days = buildCalendarMonth(viewYear, viewMonth);
  const rovingDate =
    focusDate && days.some((day) => day.date === focusDate)
      ? focusDate
      : days.some((day) => day.date === value)
        ? value
        : days.some((day) => day.date === today)
          ? today
          : days.find((day) => day.inMonth)?.date;

  useEffect(() => {
    if (!open || !focusDate) return;
    panelRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)
      ?.focus();
  }, [open, focusDate]);

  function handleGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const delta = deltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = addDaysToDateString(rovingDate ?? today, delta);
    setFocusDate(next);
    const parsed = parseDateString(next);
    if (parsed.year !== viewYear || parsed.month !== viewMonth) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  }

  function selectDate(date: string) {
    if (isDateDisabled(date, minDate, maxDate)) {
      return;
    }
    onChange(date);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleToday() {
    if (!isDateDisabled(today, minDate, maxDate)) {
      onChange(today);
      const parsed = parseDateString(today);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const displayValue = value ? formatDateLabel(value) : "Select date";

  return (
    <div className={cn("relative", className)}>
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
        ref={triggerRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${fieldId}-label`}
        onClick={() => {
          setFocusDate(null);
          setOpen((current) => !current);
        }}
        className={cn(
          "flex h-[46px] w-full items-center justify-between gap-2 rounded-md border bg-canvas px-3.5 text-left transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          error ? "border-expense" : "border-line hover:border-mint-200",
          "focus-visible:border-mint-400 focus-visible:shadow-[0_0_0_3px_var(--mint-100)] focus-visible:outline-none",
          open && "border-mint-400 shadow-[0_0_0_3px_var(--mint-100)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span
          className={cn(
            "font-semibold text-[15px]",
            value ? "text-ink-900" : "text-ink-500",
          )}
        >
          {displayValue}
        </span>
        <IconCalendar className="shrink-0 text-mint-600" />
      </button>

      {error ? (
        <p
          key={error}
          role="alert"
          className="input-shake mt-2 text-[13px] font-bold text-expense-strong"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-[13px] text-ink-500">{hint}</p>
      ) : null}

      {open && position
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Choose date"
              className={cn(
                "date-picker-panel fixed z-[var(--z-dropdown)] rounded-xl border border-line bg-paper p-3 shadow-lg",
                position.placement === "above" && "origin-bottom",
              )}
              style={{
                top: position.top,
                bottom: position.bottom,
                left: position.left,
                width: position.width,
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => shiftMonth(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-canvas text-ink-600 transition-colors hover:border-mint-200 hover:bg-tint hover:text-mint-700"
                >
                  <ChevronLeft />
                </button>
                <p className="font-display text-[15px] font-bold text-ink-900">
                  {formatMonthLabel(viewYear, viewMonth)}
                </p>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => shiftMonth(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-canvas text-ink-600 transition-colors hover:border-mint-200 hover:bg-tint hover:text-mint-700"
                >
                  <ChevronRight />
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {WEEKDAY_LABELS.map((weekday) => (
                  <div
                    key={weekday}
                    className="py-1 text-center text-[11px] font-bold tracking-wide text-ink-500 uppercase"
                  >
                    {weekday}
                  </div>
                ))}
              </div>

              <div
                className="grid grid-cols-7 gap-0.5"
                onKeyDown={handleGridKeyDown}
              >
                {days.map((day) => {
                  const selectedDay = day.date === value;
                  const isToday = day.date === today;
                  const disabledDay = isDateDisabled(
                    day.date,
                    minDate,
                    maxDate,
                  );

                  return (
                    <button
                      key={day.date}
                      type="button"
                      data-date={day.date}
                      tabIndex={day.date === rovingDate ? 0 : -1}
                      disabled={disabledDay}
                      onClick={() => selectDate(day.date)}
                      className={cn(
                        "tnum flex h-9 w-full items-center justify-center rounded-md text-[13px] font-semibold transition-colors",
                        !day.inMonth && "text-ink-300",
                        day.inMonth && !selectedDay && "text-ink-800",
                        !selectedDay &&
                          !disabledDay &&
                          "hover:bg-tint hover:text-mint-800",
                        isToday &&
                          !selectedDay &&
                          "ring-1 ring-mint-300 ring-inset",
                        selectedDay &&
                          "bg-mint-500 text-white shadow-sm hover:bg-mint-600",
                        disabledDay && "cursor-not-allowed opacity-35",
                      )}
                    >
                      {day.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3">
                <button
                  type="button"
                  onClick={handleToday}
                  disabled={isDateDisabled(today, minDate, maxDate)}
                  className="text-[13px] font-bold text-mint-700 transition-colors hover:text-mint-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-700"
                >
                  Close
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
