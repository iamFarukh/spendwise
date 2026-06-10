import { cn } from "@/lib/cn";

type SettingsRowProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  last?: boolean;
};

export function SettingsRow({
  title,
  description,
  children,
  last = false,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5",
        !last && "border-b border-line-soft",
        last && "pb-0",
      )}
    >
      <div className="min-w-0">
        <b className="block text-[15px] font-bold text-ink-900">{title}</b>
        <small className="mt-0.5 block text-xs font-semibold text-ink-500">
          {description}
        </small>
      </div>
      <div className="shrink-0 self-start sm:self-center">{children}</div>
    </div>
  );
}
