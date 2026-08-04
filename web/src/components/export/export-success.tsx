"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ExportFormat } from "@pfos/shared";

import { downloadBlob, openBlobInNewTab } from "@/lib/export/download";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  xlsx: "Excel",
  csv: "CSV",
  json: "JSON Backup",
};

type ExportSuccessProps = {
  format: ExportFormat;
  filename: string;
  blob: Blob;
  transactionCount: number;
  matchSummary: string;
  generatedAt: Date;
  locale: string;
  onDownloadAgain: () => void;
  onGenerateAnother: () => void;
  onClose: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(date: Date, locale: string): string {
  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function detectFileShareSupported(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const file = new File([blob], filename, { type: blob.type });
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export function ExportSuccess({
  format,
  filename,
  blob,
  transactionCount,
  matchSummary,
  generatedAt,
  locale,
  onDownloadAgain,
  onGenerateAnother,
  onClose,
}: ExportSuccessProps) {
  const [shareSupported, setShareSupported] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void detectFileShareSupported(blob, filename).then((ok) => {
      if (!cancelled) {
        setShareSupported(ok);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [blob, filename]);

  async function handleShare() {
    if (!shareSupported) {
      return;
    }
    setSharing(true);
    try {
      const file = new File([blob], filename, { type: blob.type });
      await navigator.share({ files: [file], title: filename });
    } catch {
      // User cancelled or share failed — no fallback per spec.
    } finally {
      setSharing(false);
    }
  }

  function handleOpen() {
    openBlobInNewTab(blob);
  }

  function handleDownloadAgain() {
    downloadBlob(filename, blob);
    onDownloadAgain();
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-2xl text-mint-700"
          aria-hidden="true"
        >
          ✓
        </span>
        <div>
          <p className="text-lg font-bold text-ink-900">Export ready</p>
          <p className="mt-1 text-[13px] font-semibold text-ink-500">
            {FORMAT_LABELS[format]} · {formatFileSize(blob.size)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-canvas px-4 py-3">
        <p className="truncate text-[14px] font-bold text-ink-900">{filename}</p>
        <p className="mt-1 text-[13px] text-ink-500">
          {transactionCount} transaction{transactionCount === 1 ? "" : "s"} ·{" "}
          {matchSummary}
        </p>
        <p className="mt-1 text-[12px] text-ink-400">
          Generated {formatTimestamp(generatedAt, locale)}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {format === "pdf" ? (
          <Button variant="primary" size="md" onClick={handleOpen} className="sm:flex-1">
            Open
          </Button>
        ) : null}
        <Button
          variant={format === "pdf" ? "soft" : "primary"}
          size="md"
          onClick={handleDownloadAgain}
          className="sm:flex-1"
        >
          Download again
        </Button>
        {shareSupported ? (
          <Button
            variant="ghost"
            size="md"
            loading={sharing}
            onClick={() => void handleShare()}
            className="sm:flex-1"
          >
            Share
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button variant="ghost" size="md" onClick={onGenerateAnother} className="sm:flex-1">
          Generate another export
        </Button>
        <Button variant="ghost" size="md" onClick={onClose} className="sm:flex-1">
          Close
        </Button>
      </div>
    </div>
  );
}
