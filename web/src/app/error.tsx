"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Route-segment error boundary. Catches render/data errors anywhere inside the
 * app shell so a single thrown error no longer white-screens the whole product.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for diagnostics; wire to a logger/Sentry later.
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-6">
      <div className="page-enter w-full max-w-md text-center">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-expense-bg"
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 8v5m0 3.5h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0Z"
              stroke="var(--expense)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-ink-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {error.message ||
            "An unexpected error interrupted this page. Your data is safe."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button
            variant="ghost"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
