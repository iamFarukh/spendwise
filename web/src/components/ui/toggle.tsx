import { cn } from "@/lib/cn";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
};

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[26px] w-[46px] rounded-pill border transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
        "disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? "border-mint-500 bg-mint-500"
          : "border-line bg-canvas",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow-sm",
          "transition-[transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)]",
          checked && "translate-x-5 shadow-md",
        )}
      />
    </button>
  );
}
