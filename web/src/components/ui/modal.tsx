"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

const PANEL_SIZE_CLASS = {
  md: "max-w-[480px]",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Disables backdrop-click and Escape close (e.g. while an action is running). */
  dismissible?: boolean;
  labelledBy?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Panel width. Use this instead of passing `max-w-*` via `className` —
   * `cn` does not dedupe Tailwind utilities, so a className max-width would
   * fight the default `max-w-[480px]`.
   */
  size?: keyof typeof PANEL_SIZE_CLASS;
};

/**
 * Accessible, animated modal: backdrop fade + panel pop on enter, reverse on
 * exit (honoring prefers-reduced-motion via globals.css). Traps focus, restores
 * it on close, and closes on Escape / backdrop click when dismissible.
 * Portaled to `document.body` so parent stacking contexts cannot bury it.
 */
export function Modal({
  open,
  onClose,
  dismissible = true,
  labelledBy,
  children,
  className,
  size = "md",
}: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  // Keep the panel mounted through the exit animation.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, mounted]);

  // Focus management + Escape + scroll lock.
  useEffect(() => {
    if (!open) {
      return;
    }
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissible) {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!mounted || !portalReady) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-ink-900/45 p-4 sm:p-6",
        closing ? "modal-backdrop-exit" : "modal-backdrop-enter",
      )}
      onClick={() => {
        if (dismissible) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          "w-full rounded-xl border border-line bg-paper p-6 shadow-lg outline-none",
          PANEL_SIZE_CLASS[size],
          closing ? "modal-panel-exit" : "modal-panel-enter",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
