import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ className, label, hint, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-[7px] block text-[13px] font-bold text-ink-700">
        {label}
      </span>
      <div
        className={cn(
          "flex h-[46px] items-center gap-2 rounded-md border border-line bg-canvas px-3.5 transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-within:border-mint-400 focus-within:shadow-[0_0_0_3px_var(--mint-100)]",
          className,
        )}
      >
        <input
          id={inputId}
          className="w-full border-none bg-transparent font-semibold text-[15px] text-ink-900 outline-none shadow-none focus:shadow-none focus-visible:shadow-none placeholder:font-medium placeholder:text-ink-500"
          {...props}
        />
      </div>
      {hint ? (
        <p className="mt-2 text-[13px] text-ink-500">{hint}</p>
      ) : null}
    </label>
  );
}
