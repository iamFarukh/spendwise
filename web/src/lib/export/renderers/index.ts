import type { ExportFormat } from "@pfos/shared";

import type { ExportRenderer } from "../types";
import { csvRenderer } from "./csv";
import { jsonRenderer } from "./json";

export const RENDERER_RECORD: Partial<
  Record<ExportFormat, ExportRenderer>
> = {
  csv: csvRenderer,
  json: jsonRenderer,
};

export function getRenderer(format: ExportFormat): ExportRenderer | undefined {
  return RENDERER_RECORD[format];
}
