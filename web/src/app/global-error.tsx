"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown in the root layout itself. Must render
 * its own <html>/<body>; app providers and fonts are unavailable here, so this
 * stays deliberately minimal and self-styled.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f2f7f4",
          color: "#0e2a22",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            SpendWise hit an unexpected error
          </h1>
          <p style={{ fontSize: 14, color: "#6b847b", margin: "0 0 20px" }}>
            Reloading usually fixes this. Your data is safe.
          </p>
          <button
            onClick={() => reset()}
            style={{
              height: 42,
              padding: "0 18px",
              borderRadius: 12,
              border: "none",
              background: "#12b886",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
