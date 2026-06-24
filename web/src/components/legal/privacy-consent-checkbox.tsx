"use client";

import Link from "next/link";

import { IconShield } from "@/components/icons";

type PrivacyConsentCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function PrivacyConsentCheckbox({
  checked,
  onChange,
  disabled,
}: PrivacyConsentCheckboxProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 rounded border-line text-mint-600 focus:ring-mint-500"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label="I agree to the Privacy Policy"
      />
      <span className="text-sm font-semibold leading-6 text-ink-700">
        I agree to the{" "}
        <Link
          href="/privacy"
          className="font-bold text-mint-700 underline"
          onClick={(event) => event.stopPropagation()}
        >
          Privacy Policy
        </Link>
        <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-ink-400">
          <IconShield className="h-3.5 w-3.5 text-mint-600" />
          Required to create an account
        </span>
      </span>
    </label>
  );
}
