import { cn } from "@/lib/cn";

type IconChipProps = {
  children: React.ReactNode;
  className?: string;
  bg: string;
  color: string;
  size?: "md" | "lg";
};

export function IconChip({
  children,
  className,
  bg,
  color,
  size = "md",
}: IconChipProps) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-[52px] w-[52px] rounded-[15px]",
        className,
      )}
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}
