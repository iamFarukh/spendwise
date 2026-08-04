import {
  buildExportDocument,
  type Account,
  type Category,
  type ExportDocument,
  type ExportFormat,
  type ExportRequest,
  type Transaction,
} from "@pfos/shared";

import { trackExportCompleted } from "./analytics";
import { renderExportChartPngs } from "./charts";
import { downloadBlob } from "./download";
import { getRenderer } from "./renderers";
import type { ExportAssets, ExportPhase } from "./types";

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  pdf: "pdf",
  xlsx: "xlsx",
  csv: "csv",
  json: "json",
};

async function yieldPhase(
  onPhase: (phase: ExportPhase) => void,
  phase: ExportPhase,
): Promise<void> {
  onPhase(phase);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function exportFilename(stem: string, format: ExportFormat): string {
  return `${stem}.${FORMAT_EXTENSIONS[format]}`;
}

export async function runExport(args: {
  request: ExportRequest;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onPhase: (phase: ExportPhase) => void;
}): Promise<{ document: ExportDocument; blob: Blob; filename: string }> {
  const { request, transactions, accounts, categories, onPhase } = args;
  const startedAt = performance.now();

  try {
    await yieldPhase(onPhase, "PREPARING");
    await yieldPhase(onPhase, "DOCUMENT");

    const document = buildExportDocument({
      request,
      transactions,
      accounts,
      categories,
    });

    let assets: ExportAssets | undefined;
    if (request.format === "pdf") {
      await yieldPhase(onPhase, "CHARTS");
      const charts = await renderExportChartPngs(document.visualizations, {
        currency: document.metadata.currency,
        locale: document.metadata.locale,
      });
      assets = { charts };
    }

    await yieldPhase(onPhase, "RENDERING");
    const renderer = getRenderer(request.format);
    if (!renderer?.canRender(document)) {
      throw new Error(`Unsupported export format: ${request.format}`);
    }

    const preRenderMs = Math.round(performance.now() - startedAt);
    const documentForRender: ExportDocument = {
      ...document,
      metadata: {
        ...document.metadata,
        generationTimeMs: preRenderMs,
      },
    };

    const blob = await renderer.render(documentForRender, assets);

    const filename = exportFilename(
      document.metadata.filenameStem,
      request.format,
    );

    await yieldPhase(onPhase, "DOWNLOADING");
    downloadBlob(filename, blob);

    const durationMs = Math.round(performance.now() - startedAt);
    const documentWithTiming: ExportDocument = {
      ...document,
      metadata: {
        ...document.metadata,
        generationTimeMs: durationMs,
      },
    };

    await trackExportCompleted({
      format: request.format,
      transactionCount: document.summary.transactionCount,
      accountCount: document.accounts.length,
      durationMs,
      fileSizeBytes: blob.size,
      source: request.source,
    });

    await yieldPhase(onPhase, "DONE");

    return { document: documentWithTiming, blob, filename };
  } catch (error) {
    onPhase("ERROR");
    throw error;
  }
}
