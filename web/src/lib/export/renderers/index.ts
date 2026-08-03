import type { ExportFormat } from "@pfos/shared";

import type { ExportRenderer } from "../types";

export const RENDERER_RECORD: Partial<
  Record<ExportFormat, ExportRenderer>
> = {};

export function getRenderer(format: ExportFormat): ExportRenderer | undefined {
  return RENDERER_RECORD[format];
}
