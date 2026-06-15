"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  exiting?: boolean;
};

type ToastContextValue = {
  /** Show a toast. Returns its id. */
  notify: (message: string, variant?: ToastVariant) => string;
  success: (message: string) => string;
  error: (message: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;
const EXIT_MS = 200;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `toast-${counter}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      // Animate out, then remove.
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, exiting: true } : toast,
        ),
      );
      const timer = setTimeout(() => remove(id), EXIT_MS);
      timers.current.set(`${id}-exit`, timer);
    },
    [remove],
  );

  const notify = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId();
      setToasts((current) => [...current, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (message: string) => notify(message, "success"),
      error: (message: string) => notify(message, "error"),
      dismiss,
    }),
    [notify, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-toast)] flex flex-col items-center gap-2 p-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-lg border bg-paper px-4 py-3 shadow-md",
        toast.exiting ? "toast-exit" : "toast-enter",
        toast.variant === "success" && "border-mint-200",
        toast.variant === "error" && "border-expense/30",
        toast.variant === "info" && "border-line",
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {toast.variant === "success" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="var(--income-bg)" />
            <path
              d="m8 12.5 2.5 2.5L16 9"
              stroke="var(--income)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : toast.variant === "error" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="var(--expense-bg)" />
            <path
              d="M12 7.5v5m0 3h.01"
              stroke="var(--expense)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="var(--mint-100)" />
            <path
              d="M12 11v5m0-8.5h.01"
              stroke="var(--mint-700)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      <p className="flex-1 text-[13.5px] font-semibold text-ink-800">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="motion-press -m-1 shrink-0 rounded p-1 text-ink-400 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="m6 6 12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
