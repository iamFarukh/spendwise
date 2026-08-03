import { documentToCsvString, type ExportDocument } from "@pfos/shared";

import type { ExportRenderer } from "../types";

export function renderExportCsv(document: ExportDocument): string {
  return documentToCsvString(document);
}

export const csvRenderer: ExportRenderer = {
  format: "csv",
  canRender(document) {
    return document.metadata.format === "csv";
  },
  async render(document) {
    return new Blob([renderExportCsv(document)], {
      type: "text/csv;charset=utf-8",
    });
  },
};
