import type { ExportDocument, ExportFormat } from "@pfos/shared";

export type ExportPhase =
  | "PREPARING"
  | "FILTERING"
  | "BALANCES"
  | "DOCUMENT"
  | "CHARTS"
  | "RENDERING"
  | "DOWNLOADING"
  | "DONE"
  | "ERROR";

export type ExportAssets = {
  logoPng?: string; // data URL
  charts?: {
    incomeExpensePng: string;
    categoryBreakdownPng: string;
  };
};

export interface ExportRenderer {
  readonly format: ExportFormat;
  canRender(document: ExportDocument): boolean;
  render(document: ExportDocument, assets?: ExportAssets): Promise<Blob>;
}
