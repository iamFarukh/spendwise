import type { ExportFormat } from "@pfos/shared";

import type { ExportRenderer } from "../types";
import { csvRenderer } from "./csv";
import { excelRenderer } from "./excel";
import { jsonRenderer } from "./json";
import { pdfRenderer } from "./pdf";

export const RENDERER_RECORD: Partial<
  Record<ExportFormat, ExportRenderer>
> = {
  csv: csvRenderer,
  json: jsonRenderer,
  xlsx: excelRenderer,
  pdf: pdfRenderer,
};

export function getRenderer(format: ExportFormat): ExportRenderer | undefined {
  return RENDERER_RECORD[format];
}
