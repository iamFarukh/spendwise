"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red). */
  destructive?: boolean;
  onCancel: () => void;
  /** May be async; the confirm button shows a spinner until it resolves. */
  onConfirm: () => void | Promise<void>;
};

/**
 * Styled, animated replacement for window.confirm — focus-trapped, keyboard
 * operable, and on-brand. Handles async confirm with an inline busy state.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      dismissible={!busy}
      labelledBy={titleId}
    >
      <h2 id={titleId} className="font-display text-xl font-bold text-ink-900">
        {title}
      </h2>
      {description ? (
        <div className="mt-3 text-sm leading-relaxed text-ink-600">
          {description}
        </div>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          loading={busy}
          className={
            destructive
              ? "border-expense/30 bg-expense-bg text-expense hover:bg-expense/15"
              : undefined
          }
          onClick={() => void handleConfirm()}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
