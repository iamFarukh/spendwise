import type { ExportDocument } from "@pfos/shared";

import type { ExportRenderer } from "../types";

export const jsonRenderer: ExportRenderer = {
  format: "json",
  canRender(document) {
    return document.metadata.format === "json";
  },
  async render(document) {
    return new Blob([JSON.stringify(document, null, 2)], {
      type: "application/json",
    });
  },
};
