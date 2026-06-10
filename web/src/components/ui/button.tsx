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
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "motion-press inline-flex items-center justify-center gap-2 font-bold",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-out)]",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:transform-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
