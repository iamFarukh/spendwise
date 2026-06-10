import { cn } from "@/lib/cn";

type TagVariant = "income" | "expense" | "invest" | "transfer" | "pending";

const variantClasses: Record<TagVariant, string> = {
  income: "bg-income-bg text-income",
  expense: "bg-expense-bg text-expense",
  invest: "bg-invest-bg text-invest",
  transfer: "bg-transfer-bg text-transfer",
  pending: "bg-pending-bg text-pending",
};

type TagProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: TagVariant;
  dot?: boolean;
};

export function Tag({
  className,
  variant = "income",
  dot = false,
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11.5px] font-bold",
        variantClasses[variant],
        dot &&
          "before:inline-block before:h-[7px] before:w-[7px] before:rounded-full before:bg-current before:content-['']",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
