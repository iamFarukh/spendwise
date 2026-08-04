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
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

const ALIGN_RIGHT: Alignment = "right";
const ALIGN_CENTER: Alignment = "center";

import { pdfBrandTitleContent, pdfLogoContent } from "../pdf/logo";
import { PDF_THEME } from "../pdf/theme";

import type { ExportAssets, ExportRenderer } from "../types";

type PdfMakeInstance = {
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
  addFonts: (fonts: Record<string, Record<string, string>>) => void;
  fonts?: Record<string, unknown>;
  createPdf: (doc: TDocumentDefinitions) => {
    getBlob: () => Promise<Blob>;
  };
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

function periodDayCount(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00.000Z`);
  const b = Date.parse(`${end}T00:00:00.000Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) {
    return 1;
  }
  return Math.floor((b - a) / 86_400_000) + 1;
}

function isContentPage(pageNumber: number): boolean {
  return pageNumber > 1;
}

function zebraFill(rowIndex: number): string | null {
  // rowIndex 0 = header; data rows start at 1
  return rowIndex > 0 && rowIndex % 2 === 0 ? PDF_THEME.zebra : null;
}

function thinTableLayout(zebra = true) {
  return {
    hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
      i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.35,
    vLineWidth: () => 0,
    hLineColor: () => PDF_THEME.line,
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 7,
    paddingBottom: () => 7,
    fillColor: (rowIndex: number) => (zebra ? zebraFill(rowIndex) : null),
  };
}

/** Bank-statement table: emphasized opening (row 1) and closing (last) rows. */
function statementTableLayout(rowCount: number) {
  return {
    hLineWidth: (i: number, node: { table: { body: unknown[] } }) => {
      if (i === 0 || i === 1 || i === node.table.body.length) {
        return 1;
      }
      if (i === 2 || i === node.table.body.length - 1) {
        return 0.8;
      }
      return 0.35;
    },
    vLineWidth: () => 0,
    hLineColor: () => PDF_THEME.line,
    paddingLeft: () => 10,
    paddingRight: () => 10,
    paddingTop: () => 9,
    paddingBottom: () => 9,
    fillColor: (rowIndex: number) => {
      if (rowIndex === 1) {
        return PDF_THEME.openingRow;
      }
      if (rowIndex === rowCount - 1) {
        return PDF_THEME.closingRow;
      }
      return zebraFill(rowIndex);
    },
  };
}

function progressBarCanvas(sharePercent: number, width = 72): Content {
  const clamped = Math.max(0, Math.min(100, sharePercent));
  const filled = Math.round((clamped / 100) * width);
  return {
    canvas: [
      {
        type: "rect",
        x: 0,
        y: 3,
        w: width,
        h: 7,
        r: 2,
        color: PDF_THEME.lineSoft,
      },
      ...(filled > 0
        ? [
            {
              type: "rect" as const,
              x: 0,
              y: 3,
              w: filled,
              h: 7,
              r: 2,
              color: PDF_THEME.mint,
            },
          ]
        : []),
    ],
    width,
    height: 14,
  } as Content;
}

function iconBadge(code: string, bg: string): Content {
  return {
    table: {
      widths: [24],
      body: [
        [
          {
            text: code,
            alignment: ALIGN_CENTER,
            fontSize: 7,
            bold: true,
            color: PDF_THEME.paper,
            fillColor: bg,
            margin: [0, 4, 0, 3],
          },
        ],
      ],
    },
    layout: "noBorders",
    margin: [0, 0, 0, 5],
  } as Content;
}

function signedAmountColor(amount: number): string {
  if (amount > 0) {
    return PDF_THEME.income;
  }
  if (amount < 0) {
    return PDF_THEME.expense;
  }
  return PDF_THEME.ink900;
}

/** Hide dormant accounts with no activity and zero balances. */
function visibleAccounts(
  accounts: ExportAccountStatement[],
): ExportAccountStatement[] {
  return accounts.filter((acct) => {
    const dormant =
      acct.rows.length === 0 &&
      acct.openingBalance === 0 &&
      acct.closingBalance === 0 &&
      acct.netChange === 0;
    return !dormant;
  });
}

function sectionDivider(title: string, options?: { pageBreak?: "before" }): Content {
  return {
    stack: [
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 2.25,
            lineColor: PDF_THEME.mint,
          },
        ],
        margin: [0, 0, 0, 10],
      },
      { text: title, style: "sectionTitle" },
    ],
    margin: [0, 12, 0, 6],
    pageBreak: options?.pageBreak,
  };
}

function buildStyles(): StyleDictionary {
  return {
    coverBrand: {
      fontSize: 42,
      bold: true,
      color: PDF_THEME.mint,
      alignment: "center",
      margin: [0, 12, 0, 4],
    },
    coverEyebrow: {
      fontSize: 10,
      bold: true,
      color: PDF_THEME.ink500,
      alignment: "center",
      characterSpacing: 1.2,
      margin: [0, 20, 0, 6],
    },
    coverTitle: {
      fontSize: 24,
      bold: true,
      color: PDF_THEME.ink900,
      alignment: "center",
      margin: [0, 0, 0, 8],
    },
    coverTagline: {
      fontSize: 11,
      color: PDF_THEME.ink600,
      alignment: "center",
      margin: [48, 0, 48, 28],
    },
    coverLabel: {
      fontSize: 9,
      bold: true,
      color: PDF_THEME.ink500,
      alignment: "center",
      characterSpacing: 0.6,
      margin: [0, 10, 0, 2],
    },
    coverValue: {
      fontSize: 14,
      color: PDF_THEME.ink900,
      alignment: "center",
      margin: [0, 0, 0, 2],
    },
    coverConfidential: {
      fontSize: 9,
      bold: true,
      color: PDF_THEME.expenseStrong,
      alignment: "center",
      characterSpacing: 1.5,
      margin: [0, 36, 0, 0],
    },
    coverReportId: {
      fontSize: 8,
      color: PDF_THEME.ink400,
      alignment: "center",
      margin: [0, 6, 0, 0],
    },
    coverPreparedLabel: {
      fontSize: 9,
      bold: true,
      color: PDF_THEME.ink500,
      alignment: "center",
      characterSpacing: 0.8,
      margin: [0, 8, 0, 4],
    },
    coverPreparedName: {
      fontSize: 18,
      bold: true,
      color: PDF_THEME.ink900,
      alignment: "center",
      margin: [0, 0, 0, 4],
    },
    coverSecurity: {
      fontSize: 8,
      color: PDF_THEME.ink500,
      alignment: "center",
      margin: [40, 28, 40, 0],
    },
    coverFooter: {
      fontSize: 8,
      color: PDF_THEME.ink500,
      alignment: "center",
      margin: [0, 16, 0, 0],
    },
    sectionTitle: {
      fontSize: 14,
      bold: true,
      color: PDF_THEME.ink900,
      margin: [0, 0, 0, 8],
    },
    insightLabel: {
      fontSize: 7.5,
      bold: true,
      color: PDF_THEME.ink500,
      characterSpacing: 0.4,
      margin: [0, 0, 0, 4],
    },
    insightValue: {
      fontSize: 12,
      bold: true,
      color: PDF_THEME.ink900,
      margin: [0, 0, 0, 3],
    },
    insightSub: {
      fontSize: 7.5,
      color: PDF_THEME.ink600,
    },
    cardIcon: {
      fontSize: 11,
      bold: true,
      color: PDF_THEME.mintDark,
      margin: [0, 0, 0, 4],
    },
    cardLabel: {
      fontSize: 8,
      bold: true,
      color: PDF_THEME.ink500,
      characterSpacing: 0.4,
      margin: [0, 0, 0, 4],
    },
    cardValue: {
      fontSize: 13,
      bold: true,
      color: PDF_THEME.ink900,
      margin: [0, 0, 0, 3],
    },
    cardValueIncome: {
      fontSize: 13,
      bold: true,
      color: PDF_THEME.income,
      margin: [0, 0, 0, 3],
    },
    cardValueExpense: {
      fontSize: 13,
      bold: true,
      color: PDF_THEME.expense,
      margin: [0, 0, 0, 3],
    },
    cardSubtitle: {
      fontSize: 7.5,
      color: PDF_THEME.ink500,
    },
    tableHeader: {
      fontSize: 8,
      bold: true,
      color: PDF_THEME.ink700,
      fillColor: PDF_THEME.mintLight,
    },
    tableCell: { fontSize: 8.5, color: PDF_THEME.ink900 },
    tableCellMuted: { fontSize: 8, color: PDF_THEME.ink600 },
    tableCellBold: { fontSize: 9, bold: true, color: PDF_THEME.ink900 },
    amountEmphasized: {
      fontSize: 9.5,
      bold: true,
      color: PDF_THEME.ink900,
    },
    emptyNote: {
      fontSize: 9,
      italics: true,
      color: PDF_THEME.ink500,
      margin: [0, 4, 0, 8],
    },
    accountTitle: {
      fontSize: 14,
      bold: true,
      color: PDF_THEME.mintDark,
      margin: [0, 18, 0, 4],
    },
    accountMeta: {
      fontSize: 8.5,
      color: PDF_THEME.ink500,
      margin: [0, 0, 0, 8],
    },
    chartCaption: {
      fontSize: 9,
      bold: true,
      color: PDF_THEME.ink700,
      margin: [0, 0, 0, 4],
    },
    chartTotalLabel: {
      fontSize: 8,
      color: PDF_THEME.ink500,
      margin: [0, 6, 0, 0],
    },
    chartTotalValue: {
      fontSize: 12,
      bold: true,
      color: PDF_THEME.ink900,
    },
    appendixHeading: {
      fontSize: 10,
      bold: true,
      color: PDF_THEME.mintDark,
      margin: [0, 10, 0, 4],
    },
    metaLine: { fontSize: 8.5, color: PDF_THEME.ink600, margin: [0, 2, 0, 0] },
    footerText: { fontSize: 8, color: PDF_THEME.ink500 },
    headerBrand: { fontSize: 11, bold: true, color: PDF_THEME.ink900 },
    headerSub: { fontSize: 8, color: PDF_THEME.ink500 },
    brandTitle: { fontSize: 13, bold: true, color: PDF_THEME.ink900 },
    brandSubtitle: { fontSize: 8, color: PDF_THEME.ink500 },
    logoFallback: {
      fontSize: 18,
      bold: true,
      color: PDF_THEME.mint,
    },
    logoFallbackLg: {
      fontSize: 32,
      bold: true,
      color: PDF_THEME.mint,
    },
    watermark: {
      fontSize: 34,
      bold: true,
      color: PDF_THEME.watermark,
      opacity: 0.06,
    },
  };
}

function moneyCell(
  amount: number,
  currency: string,
  locale: string,
  style = "tableCell",
): TableCell {
  return {
    text: formatMoney(amount, currency, locale),
    style,
    alignment: ALIGN_RIGHT,
  };
}

type InsightCard = {
  label: string;
  value: string;
  subtitle: string;
  valueColor?: string;
};

function buildInsightCards(document: ExportDocument): InsightCard[] {
  const { summary, categorySummary, filters, largestTransactions, metadata, accounts } =
    document;
  const { currency, locale } = metadata;
  const days = periodDayCount(filters.range.start, filters.range.end);
  const cards: InsightCard[] = [];

  const largestExpense = largestTransactions.find(
    (row) => row.typeGroup === "EXPENSES",
  );
  if (largestExpense) {
    cards.push({
      label: "LARGEST EXPENSE",
      value: formatMoney(
        Math.abs(largestExpense.signedAmount),
        currency,
        locale,
      ),
      subtitle: largestExpense.displayDescription || "Expense",
      valueColor: PDF_THEME.expense,
    });
  }

  if (categorySummary[0]) {
    const top = categorySummary[0];
    cards.push({
      label: "TOP CATEGORY",
      value: top.categoryName,
      subtitle: `${Math.round(top.share)}% · ${formatMoney(top.amount, currency, locale)}`,
    });
  }

  if (summary.expense > 0 && days > 0) {
    cards.push({
      label: "DAILY AVERAGE",
      value: formatMoney(summary.expense / days, currency, locale),
      subtitle: `Across ${days} days`,
    });
  }

  const mostActive = [...accounts].sort(
    (a, b) => b.rows.length - a.rows.length,
  )[0];
  if (mostActive && mostActive.rows.length > 0) {
    cards.push({
      label: "MOST ACTIVE ACCOUNT",
      value: mostActive.accountName,
      subtitle: `${mostActive.rows.length} lines · net ${formatSignedMoney(mostActive.netChange, currency, locale)}`,
    });
  }

  cards.push({
    label: "NET CASH FLOW",
    value: formatSignedMoney(summary.net, currency, locale),
    subtitle:
      summary.net < 0
        ? "Negative for this period"
        : summary.net > 0
          ? "Positive for this period"
          : "Break-even for this period",
    valueColor: signedAmountColor(summary.net),
  });

  if (summary.income === 0 && summary.other > 0) {
    const topOther = summary.otherBreakdown[0]?.label ?? "Other Activity";
    cards.push({
      label: "INCOME NOTE",
      value: formatMoney(0, currency, locale),
      subtitle: `Positive ledger entries are in Other (${topOther}), not Income`,
    });
  }

  return cards.slice(0, 4);
}

function insightCardsContent(document: ExportDocument): Content | null {
  const cards = buildInsightCards(document);
  if (cards.length === 0) {
    return null;
  }

  const cell = (card: InsightCard | null) => {
    if (!card) {
      return { text: "", margin: [0, 0, 0, 0] };
    }
    return {
      stack: [
        { text: card.label, style: "insightLabel" },
        {
          text: card.value,
          style: "insightValue",
          color: card.valueColor ?? PDF_THEME.ink900,
        },
        { text: card.subtitle, style: "insightSub" },
      ],
      fillColor: PDF_THEME.mintLight,
      margin: [10, 10, 10, 10],
    };
  };

  const slots: Array<InsightCard | null> = [...cards.slice(0, 4)];
  while (slots.length < 4) {
    slots.push(null);
  }

  return {
    stack: [
      {
        text: "Executive insights",
        style: "appendixHeading",
        margin: [0, 12, 0, 6],
      },
      {
        table: {
          widths: ["*", "*"],
          body: [
            [cell(slots[0]!), cell(slots[1]!)],
            [cell(slots[2]!), cell(slots[3]!)],
          ] as Content[][],
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => PDF_THEME.line,
          vLineColor: () => PDF_THEME.line,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],
  };
}

function summaryCardsContent(document: ExportDocument): Content {
  const { summary, metadata } = document;
  const { currency, locale } = metadata;
  const fmt = (n: number) => formatMoney(n, currency, locale);
  const days = periodDayCount(
    document.filters.range.start,
    document.filters.range.end,
  );

  type Card = {
    badge: string;
    badgeBg: string;
    label: string;
    value: string;
    subtitle: string;
    valueStyle: string;
    fill: string;
  };

  const cards: Card[] = [
    {
      badge: "INC",
      badgeBg: PDF_THEME.income,
      label: "INCOME",
      value: fmt(summary.income),
      subtitle: "Verified inflows",
      valueStyle: "cardValueIncome",
      fill: PDF_THEME.incomeBg,
    },
    {
      badge: "EXP",
      badgeBg: PDF_THEME.expense,
      label: "EXPENSES",
      value: fmt(summary.expense),
      subtitle:
        days > 0
          ? `Avg ${fmt(summary.expense / days)} / day`
          : "Period spending",
      valueStyle: "cardValueExpense",
      fill: PDF_THEME.expenseBg,
    },
    {
      badge: "NET",
      badgeBg: PDF_THEME.mintDark,
      label: "NET",
      value: formatSignedMoney(summary.net, currency, locale),
      subtitle: "Income − expenses",
      valueStyle: "cardValue",
      fill: PDF_THEME.mintLight,
    },
    {
      badge: "XFR",
      badgeBg: PDF_THEME.ink600,
      label: "TRANSFERS",
      value: fmt(summary.transfers),
      subtitle: "Between accounts",
      valueStyle: "cardValue",
      fill: PDF_THEME.paper,
    },
    {
      badge: "INV",
      badgeBg: PDF_THEME.mint,
      label: "INVESTMENTS",
      value: fmt(summary.investments),
      subtitle: "Capital deployed",
      valueStyle: "cardValue",
      fill: PDF_THEME.paper,
    },
    {
      badge: "REF",
      badgeBg: PDF_THEME.income,
      label: "REFUNDS",
      value: fmt(summary.refunds),
      subtitle: "Returned amounts",
      valueStyle: "cardValue",
      fill: PDF_THEME.paper,
    },
    {
      badge: "OTH",
      badgeBg: PDF_THEME.ink500,
      label: "OTHER",
      value: fmt(summary.other),
      subtitle:
        summary.otherBreakdown[0]?.label
          ? `Incl. ${summary.otherBreakdown[0].label}`
          : "Adjustments & opening",
      valueStyle: "cardValue",
      fill: PDF_THEME.paper,
    },
    {
      badge: "TXN",
      badgeBg: PDF_THEME.ink700,
      label: "TRANSACTIONS",
      value: String(summary.transactionCount),
      subtitle: "Unique entries",
      valueStyle: "cardValue",
      fill: PDF_THEME.paper,
    },
  ];

  const cell = (card: Card) => ({
    stack: [
      iconBadge(card.badge, card.badgeBg),
      { text: card.label, style: "cardLabel" },
      { text: card.value, style: card.valueStyle },
      { text: card.subtitle, style: "cardSubtitle" },
    ],
    fillColor: card.fill,
    margin: [10, 10, 10, 10],
  });

  const row1 = cards.slice(0, 4).map(cell);
  const row2 = cards.slice(4, 8).map(cell);

  const stack: Content[] = [
    sectionDivider("Executive summary", { pageBreak: "before" }),
    {
      table: {
        widths: ["*", "*", "*", "*"],
        body: [row1, row2] as Content[][],
      },
      layout: {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => PDF_THEME.line,
        vLineColor: () => PDF_THEME.line,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    },
  ];

  const insights = insightCardsContent(document);
  if (insights) {
    stack.push(insights);
  }

  if (summary.otherBreakdown.length > 0 && summary.other > 0) {
    stack.push({
      text: "Other activity breakdown",
      style: "appendixHeading",
      margin: [0, 12, 0, 4],
    });
    stack.push({
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto"],
        body: [
          [
            { text: "Type", style: "tableHeader" },
            { text: "Amount", style: "tableHeader", alignment: ALIGN_RIGHT },
            { text: "Count", style: "tableHeader", alignment: ALIGN_RIGHT },
          ],
          ...summary.otherBreakdown.map((row) => [
            { text: row.label, style: "tableCell" },
            moneyCell(row.amount, currency, locale),
            {
              text: String(row.transactionCount),
              style: "tableCell",
              alignment: ALIGN_RIGHT,
            },
          ]),
        ],
      },
      layout: thinTableLayout(),
    } as Content);
  }

  return { stack };
}

function chartsSection(
  document: ExportDocument,
  assets?: ExportAssets,
): Content | null {
  const charts = assets?.charts;
  if (!charts?.incomeExpensePng && !charts?.categoryBreakdownPng) {
    return null;
  }

  const { currency, locale } = document.metadata;
  const { summary } = document;
  const chartWidth = 248;

  const items: Content[] = [sectionDivider("Visual overview")];
  const columns: Content[] = [];

  if (charts.incomeExpensePng) {
    columns.push({
      width: "*",
      stack: [
        { text: "Income vs expense", style: "chartCaption" },
        { image: charts.incomeExpensePng, width: chartWidth },
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: "Income", style: "chartTotalLabel" },
                {
                  text: formatMoney(summary.income, currency, locale),
                  style: "chartTotalValue",
                  color: PDF_THEME.income,
                },
              ],
            },
            {
              width: "*",
              stack: [
                { text: "Expense", style: "chartTotalLabel" },
                {
                  text: formatMoney(summary.expense, currency, locale),
                  style: "chartTotalValue",
                  color: PDF_THEME.expense,
                },
              ],
            },
          ],
        },
      ],
    } as Content);
  }

  if (charts.categoryBreakdownPng) {
    const topCategory = document.categorySummary[0];
    const categoryCount = document.categorySummary.length;
    columns.push({
      width: "*",
      stack: [
        { text: "Category breakdown", style: "chartCaption" },
        { image: charts.categoryBreakdownPng, width: chartWidth },
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: "Total spent", style: "chartTotalLabel" },
                {
                  text: formatMoney(summary.expense, currency, locale),
                  style: "chartTotalValue",
                },
              ],
            },
            {
              width: "*",
              stack: [
                { text: "Categories", style: "chartTotalLabel" },
                {
                  text: String(categoryCount),
                  style: "chartTotalValue",
                },
              ],
            },
          ],
        },
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: "Largest", style: "chartTotalLabel" },
                {
                  text: topCategory
                    ? `${topCategory.categoryName} (${Math.round(topCategory.share)}%)`
                    : "—",
                  style: "chartTotalValue",
                  fontSize: 10,
                },
              ],
            },
          ],
        },
      ],
    } as Content);
  }

  items.push({
    columns,
    columnGap: 16,
    margin: [0, 0, 0, 4],
  });

  return { stack: items };
}

function categorySummarySection(document: ExportDocument): Content | null {
  if (document.categorySummary.length === 0) {
    return null;
  }
  const { currency, locale } = document.metadata;
  return {
    stack: [
      sectionDivider("Category summary"),
      {
        table: {
          headerRows: 1,
          widths: ["*", 80, "auto", "auto", "auto"],
          body: [
            [
              { text: "Category", style: "tableHeader" },
              { text: "Share", style: "tableHeader" },
              { text: "%", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Amount", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Txns", style: "tableHeader", alignment: ALIGN_RIGHT },
            ],
            ...document.categorySummary.map((row) => [
              { text: row.categoryName, style: "tableCell" },
              progressBarCanvas(row.share),
              {
                text: `${Math.round(row.share)}%`,
                style: "tableCell",
                alignment: ALIGN_RIGHT,
              },
              moneyCell(row.amount, currency, locale),
              {
                text: String(row.transactionCount),
                style: "tableCell",
                alignment: ALIGN_RIGHT,
              },
            ]),
          ],
        },
        layout: thinTableLayout(),
      },
    ],
  } as Content;
}

function accountSummarySection(document: ExportDocument): Content {
  const { currency, locale } = document.metadata;
  const accounts = visibleAccounts(document.accounts);
  return {
    stack: [
      sectionDivider("Account summary"),
      {
        table: {
          headerRows: 1,
          widths: [
            "*",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
          ],
          body: [
            [
              { text: "Account", style: "tableHeader" },
              { text: "Opening", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Income", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Expense", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "In", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Out", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Invest", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Refund", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Net", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Closing", style: "tableHeader", alignment: ALIGN_RIGHT },
            ],
            ...accounts.map((acct) => [
              { text: acct.accountName, style: "tableCell" },
              moneyCell(acct.openingBalance, currency, locale),
              moneyCell(acct.income, currency, locale),
              moneyCell(acct.expense, currency, locale),
              moneyCell(acct.transferIn, currency, locale),
              moneyCell(acct.transferOut, currency, locale),
              moneyCell(acct.investments, currency, locale),
              moneyCell(acct.refunds, currency, locale),
              {
                text: formatSignedMoney(acct.netChange, currency, locale),
                style: "tableCell",
                alignment: ALIGN_RIGHT,
                color: signedAmountColor(acct.netChange),
                bold: true,
              },
              moneyCell(acct.closingBalance, currency, locale, "tableCellBold"),
            ]),
          ],
        },
        layout: thinTableLayout(),
        fontSize: 7.5,
      },
    ],
  } as Content;
}

function statementRowCells(
  row: ExportStatementRow,
  document: ExportDocument,
): Content[] {
  const { currency, locale } = document.metadata;
  const showBalance = document.filters.options.runningBalance;
  const cells: Content[] = [
    { text: `${row.date} ${row.time}`.trim(), style: "tableCellMuted" },
    {
      text: EXPORT_GROUP_LABELS[row.typeGroup],
      style: "tableCellMuted",
    },
    { text: row.displayDescription, style: "tableCell" },
    {
      text: formatSignedMoney(row.signedAmount, currency, locale),
      style: "amountEmphasized",
      alignment: ALIGN_RIGHT,
      color: signedAmountColor(row.signedAmount),
    },
  ];
  if (showBalance) {
    cells.push({
      text:
        row.runningBalance !== undefined
          ? formatMoney(row.runningBalance, currency, locale)
          : "—",
      style: "tableCellBold",
      alignment: ALIGN_RIGHT,
    });
  }
  return cells;
}

function accountStatementSection(
  account: ExportAccountStatement,
  document: ExportDocument,
): Content {
  const { currency, locale } = document.metadata;
  const showBalance = document.filters.options.runningBalance;
  const widths = showBalance
    ? ["auto", "auto", "*", "auto", "auto"]
    : ["auto", "auto", "*", "auto"];
  const header: Content[] = [
    { text: "Date", style: "tableHeader" },
    { text: "Type", style: "tableHeader" },
    { text: "Description", style: "tableHeader" },
    { text: "Amount", style: "tableHeader", alignment: ALIGN_RIGHT },
  ];
  if (showBalance) {
    header.push({
      text: "Balance",
      style: "tableHeader",
      alignment: ALIGN_RIGHT,
    });
  }

  const openingRow: Content[] = [
    { text: "—", style: "tableCellMuted" },
    { text: "", style: "tableCell" },
    { text: "Opening balance", style: "tableCellBold" },
    { text: "", style: "tableCell" },
  ];
  if (showBalance) {
    openingRow.push({
      text: formatMoney(account.openingBalance, currency, locale),
      style: "tableCellBold",
      alignment: ALIGN_RIGHT,
    });
  } else {
    openingRow[3] = {
      text: formatMoney(account.openingBalance, currency, locale),
      style: "tableCellBold",
      alignment: ALIGN_RIGHT,
    };
  }

  const closingRow: Content[] = [
    { text: "—", style: "tableCellMuted" },
    { text: "", style: "tableCell" },
    { text: "Closing balance", style: "tableCellBold" },
    { text: "", style: "tableCell" },
  ];
  if (showBalance) {
    closingRow.push({
      text: formatMoney(account.closingBalance, currency, locale),
      style: "tableCellBold",
      alignment: ALIGN_RIGHT,
    });
  } else {
    closingRow[3] = {
      text: formatMoney(account.closingBalance, currency, locale),
      style: "tableCellBold",
      alignment: ALIGN_RIGHT,
    };
  }

  const emptyRow: TableCell[] = [
    { text: "—", style: "tableCellMuted" },
    { text: "", style: "tableCell" },
    {
      text: "No transactions during selected period.",
      style: "emptyNote",
      colSpan: showBalance ? 3 : 2,
    },
    { text: "" },
  ];
  if (showBalance) {
    emptyRow.push({ text: "" });
  }

  const body: TableCell[][] =
    account.rows.length === 0
      ? [header as TableCell[], openingRow as TableCell[], emptyRow, closingRow as TableCell[]]
      : [
          header as TableCell[],
          openingRow as TableCell[],
          ...account.rows.map(
            (row) => statementRowCells(row, document) as TableCell[],
          ),
          closingRow as TableCell[],
        ];

  return {
    stack: [
      { text: account.accountName, style: "accountTitle" },
      {
        text: `Net change ${formatSignedMoney(account.netChange, currency, locale)} · ${account.rows.length} line${account.rows.length === 1 ? "" : "s"} · Closing ${formatMoney(account.closingBalance, currency, locale)}`,
        style: "accountMeta",
        color: signedAmountColor(account.netChange),
      },
      {
        table: {
          headerRows: 1,
          widths,
          body,
        },
        layout: statementTableLayout(body.length),
      },
    ],
    margin: [0, 0, 0, 10],
  } as Content;
}

function perAccountStatements(document: ExportDocument): Content {
  const accounts = visibleAccounts(document.accounts);
  return {
    stack: [
      sectionDivider("Account statements", { pageBreak: "before" }),
      ...accounts.map((acct) => accountStatementSection(acct, document)),
    ],
  };
}

function dailySummarySection(document: ExportDocument): Content | null {
  if (document.dailySummary.length === 0) {
    return null;
  }
  const { currency, locale } = document.metadata;
  return {
    stack: [
      sectionDivider("Daily summary"),
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto", "auto"],
          body: [
            [
              { text: "Date", style: "tableHeader" },
              { text: "Income", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Expense", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Net", style: "tableHeader", alignment: ALIGN_RIGHT },
              { text: "Txns", style: "tableHeader", alignment: ALIGN_RIGHT },
            ],
            ...document.dailySummary.map((row) => [
              { text: row.date, style: "tableCell" },
              moneyCell(row.income, currency, locale),
              moneyCell(row.expense, currency, locale),
              {
                text: formatSignedMoney(row.net, currency, locale),
                style: "amountEmphasized",
                alignment: ALIGN_RIGHT,
                color: signedAmountColor(row.net),
              },
              {
                text: String(row.transactions),
                style: "tableCell",
                alignment: ALIGN_RIGHT,
              },
            ]),
          ],
        },
        layout: thinTableLayout(),
      },
    ],
  } as Content;
}

function largestTransactionsSection(document: ExportDocument): Content | null {
  if (document.largestTransactions.length === 0) {
    return null;
  }
  const { currency, locale } = document.metadata;
  return {
    stack: [
      sectionDivider("Largest transactions"),
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "*", "auto", "auto"],
          body: [
            [
              { text: "Date", style: "tableHeader" },
              { text: "Type", style: "tableHeader" },
              { text: "Description", style: "tableHeader" },
              { text: "Account", style: "tableHeader" },
              { text: "Amount", style: "tableHeader", alignment: ALIGN_RIGHT },
            ],
            ...document.largestTransactions.map((row) => [
              { text: row.date, style: "tableCell" },
              {
                text: EXPORT_GROUP_LABELS[row.typeGroup],
                style: "tableCellMuted",
              },
              { text: row.displayDescription, style: "tableCell" },
              { text: row.accountName, style: "tableCellMuted" },
              {
                text: formatSignedMoney(row.signedAmount, currency, locale),
                style: "amountEmphasized",
                alignment: ALIGN_RIGHT,
                color: signedAmountColor(row.signedAmount),
              },
            ]),
          ],
        },
        layout: thinTableLayout(),
      },
    ],
  } as Content;
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

  const days = periodDayCount(filters.range.start, filters.range.end);

  return {
    stack: [
      sectionDivider("Appendix", { pageBreak: "before" }),
      { text: "Report identity", style: "appendixHeading" },
      { text: `Report ID: ${metadata.reportId}`, style: "metaLine" },
      { text: `Export version: ${metadata.version}`, style: "metaLine" },
      {
        text: `Generated: ${formatGeneratedDate(metadata.generatedAt, metadata.locale, metadata.timezone)}`,
        style: "metaLine",
      },
      {
        text: `Build time: ${metadata.generationTimeMs} ms`,
        style: "metaLine",
      },
      { text: `Source: ${metadata.source}`, style: "metaLine" },

      { text: "Statement scope", style: "appendixHeading" },
      {
        text: formatPeriodRange(
          filters.range.start,
          filters.range.end,
          metadata.locale,
        ),
        style: "metaLine",
      },
      { text: `Duration: ${days} days`, style: "metaLine" },
      { text: `Groups: ${groupLabels}`, style: "metaLine" },
      {
        text: describeFilterSelection("Accounts", filters.accountIds),
        style: "metaLine",
      },
      {
        text: describeFilterSelection("Categories", filters.categoryIds),
        style: "metaLine",
      },
      {
        text: describeFilterSelection("Payment methods", filters.paymentMethods),
        style: "metaLine",
      },
      {
        text: `Verified only: ${filters.verifiedOnly ? "Yes" : "No"}`,
        style: "metaLine",
      },
      {
        text: `Sort: ${filters.sort}${filters.effectiveSort !== filters.sort ? ` (effective: ${filters.effectiveSort})` : ""}`,
        style: "metaLine",
      },
      {
        text: `Additional columns: ${optionLines.length ? optionLines.join(", ") : "None"}`,
        style: "metaLine",
      },

      { text: "Locale", style: "appendixHeading" },
      {
        text: `${metadata.locale} · ${metadata.currency} · ${metadata.timezone}`,
        style: "metaLine",
      },
    ],
  };
}

function coverPage(document: ExportDocument, assets?: ExportAssets): Content {
  const { metadata, filters, summary } = document;
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
  const days = periodDayCount(filters.range.start, filters.range.end);
  const netFlowLabel =
    summary.net < 0 ? "Negative net cash flow" : summary.net > 0 ? "Positive net cash flow" : "Break-even period";

  return {
    stack: [
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            stack: [pdfLogoContent(assets, "xl")],
            alignment: ALIGN_CENTER,
          },
          { width: "*", text: "" },
        ],
        margin: [0, 28, 0, 0],
      },
      { text: "SpendWise", style: "coverBrand" },
      { text: "PERSONAL FINANCE STATEMENT", style: "coverEyebrow" },
      { text: "Financial Activity Report", style: "coverTitle" },
      {
        text: "A complete summary of your income, spending, transfers, and account balances for the selected period.",
        style: "coverTagline",
      },
      {
        canvas: [
          {
            type: "line",
            x1: 140,
            y1: 0,
            x2: 375,
            y2: 0,
            lineWidth: 2,
            lineColor: PDF_THEME.mint,
          },
        ],
        margin: [0, 4, 0, 18],
      },
      { text: "PREPARED EXCLUSIVELY FOR", style: "coverPreparedLabel" },
      {
        text: metadata.preparedFor || "—",
        style: "coverPreparedName",
      },
      { text: "STATEMENT PERIOD", style: "coverLabel" },
      { text: period, style: "coverValue" },
      {
        text: `${days}-day statement · ${summary.transactionCount} transactions · ${netFlowLabel}`,
        style: "coverTagline",
        margin: [24, 6, 24, 10],
      },
      { text: "GENERATED ON", style: "coverLabel" },
      { text: generatedOn, style: "coverValue" },
      { text: "CONFIDENTIAL", style: "coverConfidential" },
      { text: metadata.reportId, style: "coverReportId" },
      {
        text: "Generated securely by SpendWise. This report is read-only and intended for the recipient named above.",
        style: "coverSecurity",
      },
      {
        text: "www.spendwise.app",
        style: "coverFooter",
      },
    ],
    margin: [40, 16, 40, 32],
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

  const content: Content[] = [coverPage(document, assets)];

  content.push(summaryCardsContent(document));

  const charts = chartsSection(document, assets);
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
    pageMargins: [40, 68, 40, 58],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      color: PDF_THEME.ink900,
    },
    styles: buildStyles(),
    background(currentPage) {
      if (currentPage === 1) {
        return {
          canvas: [
            {
              type: "rect",
              x: 0,
              y: 0,
              w: 595.28,
              h: 210,
              color: PDF_THEME.mintLight,
            },
            {
              type: "rect",
              x: 0,
              y: 210,
              w: 595.28,
              h: 6,
              color: PDF_THEME.mintMuted,
            },
          ],
        };
      }
      if (!isContentPage(currentPage)) {
        return undefined;
      }
      return {
        text: "SpendWise",
        style: "watermark",
        absolutePosition: { x: 120, y: 380 },
      };
    },
    header(currentPage) {
      if (!isContentPage(currentPage)) {
        return null;
      }
      return {
        margin: [40, 16, 40, 0],
        columns: [
          {
            columns: [pdfLogoContent(assets, "sm"), pdfBrandTitleContent()],
            width: "*",
          },
          {
            width: "auto",
            stack: [
              {
                text: metadata.reportId,
                style: "headerSub",
                alignment: ALIGN_RIGHT,
              },
            ],
            margin: [0, 8, 0, 0],
          },
        ],
      };
    },
    footer(currentPage, pageCount) {
      if (!isContentPage(currentPage)) {
        return null;
      }
      return {
        margin: [40, 6, 40, 18],
        stack: [
          {
            canvas: [
              {
                type: "line",
                x1: 0,
                y1: 0,
                x2: 515,
                y2: 0,
                lineWidth: 0.8,
                lineColor: PDF_THEME.line,
              },
            ],
            margin: [0, 0, 0, 10],
          },
          {
            columns: [
              {
                width: "*",
                stack: [
                  { text: "Generated by SpendWise", style: "footerText" },
                  {
                    text: generatedLabel,
                    style: "footerText",
                    margin: [0, 2, 0, 0],
                  },
                ],
              },
              {
                width: "auto",
                text: "www.spendwise.app",
                style: "footerText",
                alignment: ALIGN_CENTER,
                margin: [16, 4, 16, 0],
              },
              {
                width: "*",
                text: `Page ${currentPage} / ${pageCount}`,
                style: "footerText",
                alignment: ALIGN_RIGHT,
                margin: [0, 4, 0, 0],
              },
            ],
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
  // pdfmake 0.3+: getBlob() returns a Promise (no callback).
  const blob = await pdfMake.createPdf(docDefinition).getBlob();
  return blob;
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
