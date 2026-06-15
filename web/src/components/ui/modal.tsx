"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Disables backdrop-click and Escape close (e.g. while an action is running). */
  dismissible?: boolean;
  labelledBy?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Accessible, animated modal: backdrop fade + panel pop on enter, reverse on
 * exit (honoring prefers-reduced-motion via globals.css). Traps focus, restores
 * it on close, and closes on Escape / backdrop click when dismissible.
 */
export function Modal({
  open,
  onClose,
  dismissible = true,
  labelledBy,
  children,
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

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

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-ink-900/45 p-4",
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
          "w-full max-w-[480px] rounded-xl border border-line bg-paper p-6 shadow-lg outline-none",
          closing ? "modal-panel-exit" : "modal-panel-enter",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
