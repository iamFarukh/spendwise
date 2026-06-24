"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
};

export function Input({
  className,
  label,
  hint,
  error,
  id,
  ref,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-[7px] block text-[13px] font-bold text-ink-700">
        {label}
        {props.required ? (
          <span className="ml-0.5 text-expense" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      <div
        className={cn(
          "flex h-[46px] items-center gap-2 rounded-md border bg-canvas px-3.5 transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          error
            ? "border-expense focus-within:border-expense focus-within:shadow-[0_0_0_3px_var(--expense-bg)]"
            : "border-line focus-within:border-mint-400 focus-within:shadow-[0_0_0_3px_var(--mint-100)]",
          className,
        )}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="w-full border-none bg-transparent font-semibold text-[15px] text-ink-900 outline-none shadow-none focus:shadow-none focus-visible:shadow-none placeholder:font-medium placeholder:text-ink-500"
          {...props}
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
