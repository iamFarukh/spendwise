import {
  EXPORT_GROUP_LABELS,
  type ExportAccountStatement,
  type ExportDocument,
  type ExportStatementRow,
} from "@pfos/shared";
import type {
  Alignment,
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

const ALIGN_RIGHT: Alignment = "right";

import { pdfBrandTitleContent, pdfLogoContent } from "../pdf/logo";
import { PDF_THEME } from "../pdf/theme";

import type { ExportAssets, ExportRenderer } from "../types";

type PdfMakeInstance = {
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
  addFonts: (fonts: Record<string, Record<string, string>>) => void;
  fonts?: Record<string, unknown>;
  createPdf: (
    doc: TDocumentDefinitions,
  ) => { getBlob: (cb: (blob: Blob) => void) => void };
};

let pdfMakePromise: Promise<PdfMakeInstance> | null = null;

async function loadPdfMake(): Promise<PdfMakeInstance> {
  if (pdfMakePromise) {
    return pdfMakePromise;
  }
  pdfMakePromise = (async () => {
    const pdfMakeModule = await import("pdfmake/build/pdfmake");
    const vfsModule = await import("pdfmake/build/vfs_fonts");
    const pdfMake = (pdfMakeModule.default ??
      pdfMakeModule) as unknown as PdfMakeInstance;
    const vfs = (vfsModule.default ?? vfsModule) as Record<string, string>;
    pdfMake.addVirtualFileSystem(vfs);
    if (!pdfMake.fonts?.Roboto) {
      pdfMake.addFonts({
        Roboto: {
          normal: "Roboto-Regular.ttf",
          bold: "Roboto-Medium.ttf",
          italics: "Roboto-Italic.ttf",
          bolditalics: "Roboto-MediumItalic.ttf",
        },
      });
    }
    return pdfMake;
  })();
  return pdfMakePromise;
}

function formatMoney(
  amount: number,
  currency: string,
  locale: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(locale)}`;
  }
}

function formatSignedMoney(
  amount: number,
  currency: string,
  locale: string,
): string {
  const abs = formatMoney(Math.abs(amount), currency, locale);
  if (amount > 0) {
    return `+${abs}`;
  }
  if (amount < 0) {
    return `−${abs}`;
  }
  return abs;
}

function formatGeneratedDate(iso: string, locale: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatPeriodRange(
  start: string,
  end: string,
  locale: string,
): string {
  try {
    const fmt = new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeZone: "UTC",
    });
    return `${fmt.format(new Date(`${start}T00:00:00.000Z`))} – ${fmt.format(new Date(`${end}T00:00:00.000Z`))}`;
  } catch {
    return `${start} to ${end}`;
  }
}

function isContentPage(pageNumber: number): boolean {
  return pageNumber > 1;
}

function buildStyles(): StyleDictionary {
  return {
    coverBrand: {
      fontSize: 36,
      bold: true,
      color: PDF_THEME.mint,
      alignment: "center",
      margin: [0, 0, 0, 8],
    },
    coverTitle: {
      fontSize: 22,
      bold: true,
      color: PDF_THEME.ink900,
      alignment: "center",
      margin: [0, 0, 0, 24],
    },
    coverLabel: {
      fontSize: 10,
      color: PDF_THEME.ink500,
      alignment: "center",
      margin: [0, 2, 0, 0],
    },
    coverValue: {
      fontSize: 13,
      color: PDF_THEME.ink900,
      alignment: "center",
      margin: [0, 0, 0, 12],
    },
    coverConfidential: {
      fontSize: 9,
      color: PDF_THEME.expenseStrong,
      alignment: "center",
      margin: [0, 32, 0, 0],
    },
    sectionTitle: {
      fontSize: 14,
      bold: true,
      color: PDF_THEME.ink900,
      margin: [0, 16, 0, 10],
    },
    cardLabel: {
      fontSize: 8,
      color: PDF_THEME.ink500,
      margin: [0, 0, 0, 4],
    },
    cardValue: {
      fontSize: 12,
      bold: true,
      color: PDF_THEME.ink900,
    },
    cardValueIncome: { fontSize: 12, bold: true, color: PDF_THEME.income },
    cardValueExpense: { fontSize: 12, bold: true, color: PDF_THEME.expense },
    tableHeader: {
      fontSize: 9,
      bold: true,
      color: PDF_THEME.ink700,
      fillColor: PDF_THEME.lineSoft,
    },
    tableCell: { fontSize: 9, color: PDF_THEME.ink900 },
    tableCellMuted: { fontSize: 8, color: PDF_THEME.ink600 },
    accountTitle: {
      fontSize: 12,
      bold: true,
      color: PDF_THEME.mintDark,
      margin: [0, 12, 0, 6],
    },
    metaLine: { fontSize: 8, color: PDF_THEME.ink600, margin: [0, 2, 0, 0] },
    footerText: { fontSize: 7, color: PDF_THEME.ink500 },
    headerBrand: { fontSize: 11, bold: true, color: PDF_THEME.ink900 },
    headerSub: { fontSize: 7, color: PDF_THEME.ink500 },
    brandTitle: { fontSize: 11, bold: true, color: PDF_THEME.ink900 },
    brandSubtitle: { fontSize: 7, color: PDF_THEME.ink500 },
    logoFallback: {
      fontSize: 14,
      bold: true,
      color: PDF_THEME.mint,
    },
    watermark: {
      fontSize: 72,
      bold: true,
      color: PDF_THEME.watermark,
      opacity: 0.35,
    },
  };
}

function summaryCardsContent(document: ExportDocument): Content {
  const { summary, metadata } = document;
  const { currency, locale } = metadata;
  const fmt = (n: number) => formatMoney(n, currency, locale);

  const cards: { label: string; value: string; style?: string }[] = [
    { label: "Income", value: fmt(summary.income), style: "cardValueIncome" },
    { label: "Expenses", value: fmt(summary.expense), style: "cardValueExpense" },
    { label: "Net", value: fmt(summary.net), style: "cardValue" },
    { label: "Transfers", value: fmt(summary.transfers), style: "cardValue" },
    { label: "Investments", value: fmt(summary.investments), style: "cardValue" },
    { label: "Refunds", value: fmt(summary.refunds), style: "cardValue" },
    { label: "Other activity", value: fmt(summary.other), style: "cardValue" },
    {
      label: "Transactions",
      value: String(summary.transactionCount),
      style: "cardValue",
    },
  ];

  const cell = (card: (typeof cards)[number]) => ({
    stack: [
      { text: card.label, style: "cardLabel" },
      { text: card.value, style: card.style ?? "cardValue" },
    ],
    fillColor: PDF_THEME.paper,
    margin: [8, 10, 8, 10],
  });

  const row1 = cards.slice(0, 4).map(cell);
  const row2 = cards.slice(4, 8).map(cell);

  return {
    stack: [
      { text: "Executive summary", style: "sectionTitle" },
      {
        table: {
          widths: ["*", "*", "*", "*"],
          body: [row1, row2] as Content[][],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => PDF_THEME.line,
          vLineColor: () => PDF_THEME.line,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],
    pageBreak: "before",
  } as Content;
}

function chartsSection(assets?: ExportAssets): Content | null {
  const charts = assets?.charts;
  if (!charts?.incomeExpensePng && !charts?.categoryBreakdownPng) {
    return null;
  }
  const items: Content[] = [{ text: "Visual overview", style: "sectionTitle" }];
  const images: Content[] = [];
  if (charts.incomeExpensePng) {
    images.push({
      stack: [
        { text: "Income vs expense", style: "tableCellMuted", margin: [0, 0, 0, 4] },
        { image: charts.incomeExpensePng, width: 240 },
      ],
    });
  }
  if (charts.categoryBreakdownPng) {
    images.push({
      stack: [
        {
          text: "Category breakdown",
          style: "tableCellMuted",
          margin: [0, 0, 0, 4],
        },
        { image: charts.categoryBreakdownPng, width: 240 },
      ],
    });
  }
  if (images.length === 1) {
    items.push(images[0]!);
  } else {
    items.push({
      columns: images.map((img) => ({ stack: (img as { stack: Content[] }).stack, width: "auto" })),
      columnGap: 16,
    });
  }
  return { stack: items, pageBreak: "before" } as Content;
}

function categorySummarySection(document: ExportDocument): Content | null {
  if (document.categorySummary.length === 0) {
    return null;
  }
  const { currency, locale } = document.metadata;
  const header = [
    { text: "Category", style: "tableHeader" },
    { text: "Amount", style: "tableHeader", alignment: ALIGN_RIGHT },
  ];
  const body = document.categorySummary.map((row) => [
    { text: row.categoryName, style: "tableCell" },
    {
      text: formatMoney(row.amount, currency, locale),
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    },
  ]);
  return {
    stack: [
      { text: "Category summary", style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto"],
          body: [header, ...body],
        },
        layout: "lightHorizontalLines",
      },
    ],
    pageBreak: "before",
  };
}

function accountSummarySection(document: ExportDocument): Content {
  const { currency, locale } = document.metadata;
  const header = [
    { text: "Account", style: "tableHeader" },
    { text: "Opening", style: "tableHeader", alignment: ALIGN_RIGHT },
    { text: "Income", style: "tableHeader", alignment: ALIGN_RIGHT },
    { text: "Expense", style: "tableHeader", alignment: ALIGN_RIGHT },
    { text: "Closing", style: "tableHeader", alignment: ALIGN_RIGHT },
  ];
  const body = document.accounts.map((acct) => [
    { text: acct.accountName, style: "tableCell" },
    {
      text: formatMoney(acct.openingBalance, currency, locale),
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    },
    {
      text: formatMoney(acct.income, currency, locale),
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    },
    {
      text: formatMoney(acct.expense, currency, locale),
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    },
    {
      text: formatMoney(acct.closingBalance, currency, locale),
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    },
  ]);
  return {
    stack: [
      { text: "Account summary", style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto", "auto"],
          body: [header, ...body],
        },
        layout: "lightHorizontalLines",
      },
    ],
    pageBreak: document.categorySummary.length > 0 ? undefined : "before",
  };
}

function statementRowCells(
  row: ExportStatementRow,
  document: ExportDocument,
): Content[] {
  const { currency, locale } = document.metadata;
  const showBalance = document.filters.options.runningBalance;
  const cells: Content[] = [
    { text: `${row.date} ${row.time}`, style: "tableCellMuted" },
    { text: row.displayDescription, style: "tableCell" },
    {
      text: formatSignedMoney(row.signedAmount, currency, locale),
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    },
  ];
  if (showBalance) {
    cells.push({
      text:
        row.runningBalance !== undefined
          ? formatMoney(row.runningBalance, currency, locale)
          : "—",
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    });
  }
  return cells;
}

function accountStatementSection(
  account: ExportAccountStatement,
  document: ExportDocument,
  isFirst: boolean,
): Content {
  const { currency, locale } = document.metadata;
  const showBalance = document.filters.options.runningBalance;
  const widths = showBalance
    ? ["auto", "*", "auto", "auto"]
    : ["auto", "*", "auto"];
  const header: Content[] = [
    { text: "Date", style: "tableHeader" },
    { text: "Description", style: "tableHeader" },
    { text: "Amount", style: "tableHeader", alignment: ALIGN_RIGHT },
  ];
  if (showBalance) {
    header.push({ text: "Balance", style: "tableHeader", alignment: ALIGN_RIGHT });
  }

  const openingRow: Content[] = [
    { text: "—", style: "tableCellMuted" },
    {
      text: "Opening balance",
      style: "tableCell",
      bold: true,
    },
    { text: "", style: "tableCell" },
  ];
  if (showBalance) {
    openingRow.push({
      text: formatMoney(account.openingBalance, currency, locale),
      style: "tableCell",
      bold: true,
      alignment: ALIGN_RIGHT,
    });
  } else {
    openingRow[2] = {
      text: formatMoney(account.openingBalance, currency, locale),
      style: "tableCell",
      bold: true,
      alignment: ALIGN_RIGHT,
    };
  }

  const txRows = account.rows.map((row) => statementRowCells(row, document));

  const closingRow: Content[] = [
    { text: "—", style: "tableCellMuted" },
    { text: "Closing balance", style: "tableCell", bold: true },
    { text: "", style: "tableCell" },
  ];
  if (showBalance) {
    closingRow.push({
      text: formatMoney(account.closingBalance, currency, locale),
      style: "tableCell",
      bold: true,
      alignment: ALIGN_RIGHT,
    });
  } else {
    closingRow[2] = {
      text: formatMoney(account.closingBalance, currency, locale),
      style: "tableCell",
      bold: true,
      alignment: ALIGN_RIGHT,
    };
  }

  return {
    stack: [
      { text: account.accountName, style: "accountTitle" },
      {
        table: {
          headerRows: 1,
          widths,
          body: [header, openingRow, ...txRows, closingRow],
        },
        layout: "lightHorizontalLines",
      },
    ],
    pageBreak: isFirst ? "before" : undefined,
    margin: [0, 0, 0, 8],
  };
}

function perAccountStatements(document: ExportDocument): Content {
  return {
    stack: [
      { text: "Account statements", style: "sectionTitle", pageBreak: "before" },
      ...document.accounts.map((acct, i) =>
        accountStatementSection(acct, document, i === 0),
      ),
    ],
  };
}

function dailySummarySection(document: ExportDocument): Content | null {
  if (document.dailySummary.length === 0) {
    return null;
  }
  const { currency, locale } = document.metadata;
  const header = [
    { text: "Date", style: "tableHeader" },
    { text: "Income", style: "tableHeader", alignment: ALIGN_RIGHT },
    { text: "Expense", style: "tableHeader", alignment: ALIGN_RIGHT },
    { text: "Transactions", style: "tableHeader", alignment: ALIGN_RIGHT },
  ];
  const body = document.dailySummary.map((row) => [
    { text: row.date, style: "tableCell" },
    {
      text: formatMoney(row.income, currency, locale),
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    },
    {
      text: formatMoney(row.expense, currency, locale),
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    },
    { text: String(row.transactions), style: "tableCell", alignment: ALIGN_RIGHT },
  ]);
  return {
    stack: [
      { text: "Daily summary", style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "auto", "auto"],
          body: [header, ...body],
        },
        layout: "lightHorizontalLines",
      },
    ],
    pageBreak: "before",
  };
}

function largestTransactionsSection(document: ExportDocument): Content | null {
  if (document.largestTransactions.length === 0) {
    return null;
  }
  const { currency, locale } = document.metadata;
  const header = [
    { text: "Date", style: "tableHeader" },
    { text: "Description", style: "tableHeader" },
    { text: "Account", style: "tableHeader" },
    { text: "Amount", style: "tableHeader", alignment: ALIGN_RIGHT },
  ];
  const body = document.largestTransactions.map((row) => [
    { text: row.date, style: "tableCell" },
    { text: row.displayDescription, style: "tableCell" },
    { text: row.accountName, style: "tableCellMuted" },
    {
      text: formatSignedMoney(row.signedAmount, currency, locale),
      style: "tableCell",
      alignment: ALIGN_RIGHT,
    },
  ]);
  return {
    stack: [
      { text: "Largest transactions", style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto"],
          body: [header, ...body],
        },
        layout: "lightHorizontalLines",
      },
    ],
    pageBreak: "before",
  };
}

function describeFilterSelection(
  label: string,
  value: string[] | "all",
): string {
  if (value === "all") {
    return `${label}: All`;
  }
  return `${label}: ${value.length} selected`;
}

function appendixSection(document: ExportDocument): Content {
  const { metadata, filters } = document;
  const groupLabels = filters.groups
    .map((g) => EXPORT_GROUP_LABELS[g])
    .join(", ");
  const optionLines: string[] = [];
  if (filters.options.runningBalance) {
    optionLines.push("Running balance");
  }
  if (filters.options.notes) {
    optionLines.push("Notes");
  }
  if (filters.options.merchant) {
    optionLines.push("Merchant");
  }
  if (filters.options.transactionId) {
    optionLines.push("Transaction ID");
  }
  if (filters.options.timestamps) {
    optionLines.push("Timestamps");
  }

  const lines = [
    `Report ID: ${metadata.reportId}`,
    `Export version: ${metadata.version}`,
    `Generation time: ${metadata.generationTimeMs} ms`,
    `Generated at: ${formatGeneratedDate(metadata.generatedAt, metadata.locale, metadata.timezone)}`,
    "",
    "Filters applied",
    formatPeriodRange(filters.range.start, filters.range.end, metadata.locale),
    `Groups: ${groupLabels}`,
    describeFilterSelection("Accounts", filters.accountIds),
    describeFilterSelection("Categories", filters.categoryIds),
    describeFilterSelection("Payment methods", filters.paymentMethods),
    `Verified only: ${filters.verifiedOnly ? "Yes" : "No"}`,
    `Sort: ${filters.sort}${filters.effectiveSort !== filters.sort ? ` (effective: ${filters.effectiveSort})` : ""}`,
    `Additional columns: ${optionLines.length ? optionLines.join(", ") : "None"}`,
    `Source: ${metadata.source}`,
    `Locale / currency: ${metadata.locale} / ${metadata.currency}`,
  ];

  return {
    stack: [
      { text: "Appendix", style: "sectionTitle", pageBreak: "before" },
      ...lines.map((line) =>
        line === ""
          ? ({ text: " ", margin: [0, 4, 0, 0] } as Content)
          : ({ text: line, style: "metaLine" } as Content),
      ),
    ],
  } as Content;
}

function coverPage(document: ExportDocument): Content {
  const { metadata, filters } = document;
  const period = formatPeriodRange(
    filters.range.start,
    filters.range.end,
    metadata.locale,
  );
  const generatedOn = formatGeneratedDate(
    metadata.generatedAt,
    metadata.locale,
    metadata.timezone,
  );

  return {
    stack: [
      { text: "SpendWise", style: "coverBrand" },
      { text: "Personal Finance Statement", style: "coverTitle" },
      { text: "Prepared for", style: "coverLabel" },
      { text: metadata.preparedFor || "—", style: "coverValue" },
      { text: "Statement period", style: "coverLabel" },
      { text: period, style: "coverValue" },
      { text: "Generated on", style: "coverLabel" },
      { text: generatedOn, style: "coverValue" },
      { text: "CONFIDENTIAL", style: "coverConfidential" },
      { text: metadata.reportId, style: "coverLabel", margin: [0, 8, 0, 0] },
    ],
    margin: [48, 120, 48, 48],
  };
}

export function buildPdfDocumentDefinition(
  document: ExportDocument,
  assets?: ExportAssets,
): TDocumentDefinitions {
  const { metadata } = document;
  const generatedLabel = formatGeneratedDate(
    metadata.generatedAt,
    metadata.locale,
    metadata.timezone,
  );

  const content: Content[] = [coverPage(document)];

  content.push(summaryCardsContent(document));

  const charts = chartsSection(assets);
  if (charts) {
    content.push(charts);
  }

  const category = categorySummarySection(document);
  if (category) {
    content.push(category);
  }

  content.push(accountSummarySection(document));
  content.push(perAccountStatements(document));

  const daily = dailySummarySection(document);
  if (daily) {
    content.push(daily);
  }

  const largest = largestTransactionsSection(document);
  if (largest) {
    content.push(largest);
  }

  content.push(appendixSection(document));

  return {
    info: {
      title: "Personal Finance Statement",
      author: "SpendWise",
      subject: `SpendWise Statement ${metadata.reportId}`,
      keywords: metadata.reportId,
      creator: "SpendWise",
      producer: "SpendWise Export Center",
    },
    pageSize: "A4",
    pageMargins: [40, 72, 40, 56],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      color: PDF_THEME.ink900,
    },
    styles: buildStyles(),
    background(currentPage) {
      if (!isContentPage(currentPage)) {
        return undefined;
      }
      return {
        text: "SpendWise",
        style: "watermark",
        alignment: "center",
        margin: [0, 280, 0, 0],
      };
    },
    header(currentPage) {
      if (!isContentPage(currentPage)) {
        return null;
      }
      return {
        margin: [40, 24, 40, 0],
        columns: [
          {
            columns: [pdfLogoContent(assets), pdfBrandTitleContent()],
            width: "*",
          },
          {
            width: "auto",
            stack: [
              { text: metadata.reportId, style: "headerBrand", alignment: ALIGN_RIGHT },
              {
                text: "Confidential",
                style: "headerSub",
                alignment: ALIGN_RIGHT,
              },
            ],
          },
        ],
      };
    },
    footer(currentPage, pageCount) {
      if (!isContentPage(currentPage)) {
        return null;
      }
      return {
        margin: [40, 0, 40, 24],
        columns: [
          {
            width: "*",
            text: `Page ${currentPage} of ${pageCount}`,
            style: "footerText",
          },
          {
            width: "auto",
            text: "Generated by SpendWise • www.spendwise.app",
            style: "footerText",
            alignment: "center",
          },
          {
            width: "*",
            text: `${generatedLabel} • ${metadata.reportId}`,
            style: "footerText",
            alignment: ALIGN_RIGHT,
          },
        ],
      };
    },
    content,
  };
}

export async function renderExportPdf(
  document: ExportDocument,
  assets?: ExportAssets,
): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error("PDF export must run in the browser.");
  }
  const pdfMake = await loadPdfMake();
  const docDefinition = buildPdfDocumentDefinition(document, assets);
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob) => {
        resolve(blob);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export const pdfRenderer: ExportRenderer = {
  format: "pdf" as const,
  canRender(document: ExportDocument) {
    return Boolean(document.metadata?.reportId);
  },
  async render(document: ExportDocument, assets?: ExportAssets) {
    const blob = await renderExportPdf(document, assets);
    return new Blob([blob], { type: "application/pdf" });
  },
};
