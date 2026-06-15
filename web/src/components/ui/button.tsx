import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost" | "soft";
type ButtonSize = "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-mint-500 text-white shadow-sm hover:bg-mint-600 active:bg-mint-700",
  ghost:
    "border border-line bg-paper text-ink-700 hover:bg-tint active:bg-canvas",
  soft:
    "border border-transparent bg-mint-100 text-mint-700 hover:bg-mint-200 active:bg-mint-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-[42px] px-[18px] text-[15px] rounded-md",
  lg: "h-[50px] px-6 text-base rounded-lg",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner without shifting layout; implies disabled. */
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "motion-press motion-chip relative inline-flex items-center justify-center gap-2 font-bold",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "hover:-translate-y-px hover:shadow-sm active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
        "disabled:cursor-not-allowed disabled:opacity-[var(--opacity-disabled)] disabled:active:transform-none",
        loading && "cursor-progress",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-opacity duration-[var(--duration-fast)]",
          loading && "opacity-0",
        )}
      >
        {children}
      </span>
      {loading ? (
        <span
          className="absolute inset-0 grid place-items-center"
          aria-hidden="true"
        >
          <span className="btn-spinner h-[18px] w-[18px] rounded-full border-2 border-current border-t-transparent opacity-80" />
        </span>
      ) : null}
    </button>
  );
}
