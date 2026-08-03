export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Opens a blob (typically PDF) in a new tab; revokes the object URL when the tab closes. */
export function openBlobInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  if (!tab) {
    URL.revokeObjectURL(url);
    return;
  }

  const timer = window.setInterval(() => {
    if (tab.closed) {
      window.clearInterval(timer);
      URL.revokeObjectURL(url);
    }
  }, 1000);
}
