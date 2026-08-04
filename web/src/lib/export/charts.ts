import type { ExportDocument } from "@pfos/shared";

import { formatCompactMoney, formatMoney } from "@/lib/format/currency";

import type { ExportAssets } from "./types";

const MAX_LOGICAL_WIDTH = 560;
const MAX_BITMAP_WIDTH = 1200;
const MAX_DPR = 2;

/** Stable palette keyed by normalized category name (Food always same color). */
const CATEGORY_NAMED_COLORS: Record<string, string> = {
  food: "#e89a5e",
  groceries: "#d9843f",
  dining: "#c96b2e",
  transport: "#5b86e5",
  travel: "#3f6fd0",
  fuel: "#4a7ad8",
  cash: "#6b9e78",
  shopping: "#c77d9e",
  entertainment: "#8a7fe0",
  health: "#e26a57",
  utilities: "#4a9b8c",
  rent: "#7a6f5d",
  housing: "#8b7e6a",
  education: "#5b86e5",
  personal: "#9ab0a8",
  other: "#9ab0a8",
  uncategorized: "#b0c0b8",
};

const CATEGORY_FALLBACK_COLORS = [
  "#E89A5E",
  "#5b86e5",
  "#8a7fe0",
  "#6B9E78",
  "#C77D9E",
  "#4a9b8c",
  "#d9843f",
  "#7a6f5d",
] as const;

function hashLabel(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function colorForCategory(label: string): string {
  const key = label.trim().toLowerCase();
  if (CATEGORY_NAMED_COLORS[key]) {
    return CATEGORY_NAMED_COLORS[key];
  }
  for (const [name, color] of Object.entries(CATEGORY_NAMED_COLORS)) {
    if (key.includes(name)) {
      return color;
    }
  }
  return CATEGORY_FALLBACK_COLORS[
    hashLabel(key) % CATEGORY_FALLBACK_COLORS.length
  ];
}

type ChartColors = {
  income: string;
  expense: string;
  paper: string;
  ink900: string;
  ink600: string;
  ink400: string;
  line: string;
  lineSoft: string;
};

function formatExportMoney(
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
    return formatMoney(amount, currency, { maximumFractionDigits: 0 });
  }
}

function assertClient(): void {
  if (typeof document === "undefined") {
    throw new Error(
      "renderExportChartPngs must run in the browser (document is undefined).",
    );
  }
}

function resolveCssColor(cssVar: string | null, fallback: string): string {
  if (!cssVar) {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  return raw || fallback;
}

function resolveChartColors(): ChartColors {
  return {
    income: resolveCssColor("--income", "#12b886"),
    expense: resolveCssColor("--expense", "#e26a57"),
    paper: resolveCssColor("--paper", "#ffffff"),
    ink900: resolveCssColor("--ink-900", "#0e2a22"),
    ink600: resolveCssColor("--ink-600", "#4a645b"),
    ink400: resolveCssColor("--ink-400", "#9ab0a8"),
    line: resolveCssColor("--line", "#e2ece7"),
    lineSoft: resolveCssColor("--line-soft", "#eef4f1"),
  };
}

function createHiDpiCanvas(
  logicalWidth: number,
  logicalHeight: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const width = Math.min(logicalWidth, MAX_BITMAP_WIDTH);
  const height = Math.round((logicalHeight * width) / logicalWidth);
  const scale = width / logicalWidth;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * scale;
  const bitmapWidth = Math.min(Math.round(width * dpr), MAX_BITMAP_WIDTH);
  const bitmapHeight = Math.round(height * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = bitmapWidth;
  canvas.height = bitmapHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D canvas context for export charts.");
  }

  ctx.scale(bitmapWidth / width, bitmapHeight / height);
  return { canvas, ctx };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawIncomeExpenseChart(
  visualizations: ExportDocument["visualizations"],
  opts: { currency: string; locale: string },
  colors: ChartColors,
): string {
  const width = MAX_LOGICAL_WIDTH;
  const height = 320;
  const { canvas, ctx } = createHiDpiCanvas(width, height);

  ctx.fillStyle = colors.paper;
  roundRectPath(ctx, 0, 0, width, height, 12);
  ctx.fill();
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  roundRectPath(ctx, 0.5, 0.5, width - 1, height - 1, 12);
  ctx.stroke();

  ctx.fillStyle = colors.ink900;
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("Income vs expense", 24, 36);

  const incomeTotal = visualizations.incomeExpense.income.reduce(
    (sum, n) => sum + n,
    0,
  );
  const expenseTotal = visualizations.incomeExpense.expense.reduce(
    (sum, n) => sum + n,
    0,
  );
  const maxValue = Math.max(incomeTotal, expenseTotal, 1);

  const chartTop = 56;
  const chartBottom = height - 72;
  const chartHeight = chartBottom - chartTop;
  const barWidth = 72;
  const gap = 48;
  const centerX = width / 2;
  const leftX = centerX - gap / 2 - barWidth;
  const rightX = centerX + gap / 2;

  const drawBar = (
    x: number,
    value: number,
    color: string,
    label: string,
  ) => {
    const barHeight = (value / maxValue) * chartHeight;
    const y = chartBottom - barHeight;
    ctx.fillStyle = color;
    roundRectPath(ctx, x, y, barWidth, barHeight, 8);
    ctx.fill();

    ctx.fillStyle = colors.ink600;
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + barWidth / 2, chartBottom + 22);

    ctx.fillStyle = colors.ink900;
    ctx.font = "bold 12px system-ui, sans-serif";
    const valueLabel = formatExportMoney(value, opts.currency, opts.locale);
    ctx.fillText(valueLabel, x + barWidth / 2, y - 8);
  };

  drawBar(leftX, incomeTotal, colors.income, "Income");
  drawBar(rightX, expenseTotal, colors.expense, "Expense");

  ctx.textAlign = "left";
  ctx.fillStyle = colors.ink400;
  ctx.font = "600 11px system-ui, sans-serif";
  const periodLabel = visualizations.incomeExpense.labels[0] ?? "Period";
  ctx.fillText(periodLabel, 24, height - 24);

  return canvas.toDataURL("image/png");
}

type CategorySlice = {
  label: string;
  amount: number;
  color: string;
  percent: number;
};

function buildCategorySlices(
  breakdown: ExportDocument["visualizations"]["categoryBreakdown"],
): CategorySlice[] {
  const positive = [...breakdown]
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = positive.reduce((sum, row) => sum + row.amount, 0);
  if (total <= 0) {
    return [];
  }

  const top = positive.slice(0, 4);
  const otherAmount = positive
    .slice(4)
    .reduce((sum, row) => sum + row.amount, 0);

  const slices: CategorySlice[] = top.map((row) => ({
    label: row.label,
    amount: row.amount,
    color: colorForCategory(row.label),
    percent: (row.amount / total) * 100,
  }));

  if (otherAmount > 0) {
    slices.push({
      label: "Other",
      amount: otherAmount,
      color: colorForCategory("Other"),
      percent: (otherAmount / total) * 100,
    });
  }

  return slices;
}

function drawCategoryBreakdownChart(
  visualizations: ExportDocument["visualizations"],
  opts: { currency: string; locale: string },
  colors: ChartColors,
): string {
  const width = MAX_LOGICAL_WIDTH;
  const height = 360;
  const { canvas, ctx } = createHiDpiCanvas(width, height);

  ctx.fillStyle = colors.paper;
  roundRectPath(ctx, 0, 0, width, height, 12);
  ctx.fill();
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  roundRectPath(ctx, 0.5, 0.5, width - 1, height - 1, 12);
  ctx.stroke();

  ctx.fillStyle = colors.ink900;
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("By category", 24, 36);

  const slices = buildCategorySlices(visualizations.categoryBreakdown);

  if (slices.length === 0) {
    ctx.fillStyle = colors.ink600;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "No categorized spending in this range.",
      width / 2,
      height / 2,
    );
    ctx.textAlign = "left";
    return canvas.toDataURL("image/png");
  }

  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const cx = width * 0.32;
  const cy = 168;
  const radius = 70;
  const strokeWidth = 26;

  ctx.strokeStyle = colors.lineSoft;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  let startAngle = -Math.PI / 2;
  for (const slice of slices) {
    const sweep = (slice.percent / 100) * Math.PI * 2;
    ctx.strokeStyle = slice.color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + sweep);
    ctx.stroke();
    startAngle += sweep;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = colors.ink900;
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(formatCompactMoney(total, opts.currency), cx, cy - 4);
  ctx.fillStyle = colors.ink400;
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.fillText("SPENT", cx, cy + 16);
  ctx.textAlign = "left";

  const legendX = width * 0.58;
  let legendY = 88;
  const legendGap = 28;

  for (const slice of slices) {
    ctx.fillStyle = slice.color;
    ctx.beginPath();
    ctx.arc(legendX, legendY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.ink600;
    ctx.font = "600 13px system-ui, sans-serif";
    const maxLabelWidth = width - legendX - 56;
    let label = slice.label;
    while (ctx.measureText(label).width > maxLabelWidth && label.length > 1) {
      label = `${label.slice(0, -2)}…`;
    }
    ctx.fillText(label, legendX + 14, legendY + 5);

    ctx.fillStyle = colors.ink900;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      `${Math.round(slice.percent)}%`,
      width - 24,
      legendY + 5,
    );
    ctx.textAlign = "left";
    legendY += legendGap;
  }

  return canvas.toDataURL("image/png");
}

export async function renderExportChartPngs(
  visualizations: ExportDocument["visualizations"],
  opts: { currency: string; locale: string },
): Promise<NonNullable<ExportAssets["charts"]>> {
  assertClient();
  const colors = resolveChartColors();

  const incomeExpensePng = drawIncomeExpenseChart(visualizations, opts, colors);
  const categoryBreakdownPng = drawCategoryBreakdownChart(
    visualizations,
    opts,
    colors,
  );

  return { incomeExpensePng, categoryBreakdownPng };
}
