import type { Content } from "pdfmake/interfaces";

import { PDF_THEME } from "./theme";

import type { ExportAssets } from "../types";

/** Mint “SW” mark as PNG data URL (no external asset required). */
function spendWiseMarkPngDataUrl(size = 96): string {
  if (typeof document === "undefined") {
    return "";
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }
  const r = Math.round(size * 0.22);
  ctx.fillStyle = PDF_THEME.mint;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();
  ctx.fillStyle = PDF_THEME.paper;
  ctx.font = `bold ${Math.round(size * 0.42)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SW", size / 2, size / 2 + 1);
  return canvas.toDataURL("image/png");
}

const markCache = new Map<number, string>();

function getMarkDataUrl(size: number): string {
  const cached = markCache.get(size);
  if (cached) {
    return cached;
  }
  const generated = spendWiseMarkPngDataUrl(size);
  markCache.set(size, generated);
  return generated;
}

export type PdfLogoSize = "sm" | "md" | "lg" | "xl";

const LOGO_PX: Record<PdfLogoSize, number> = {
  sm: 38,
  md: 48,
  lg: 72,
  xl: 88,
};

const LOGO_SRC: Record<PdfLogoSize, number> = {
  sm: 76,
  md: 96,
  lg: 144,
  xl: 176,
};

/** Header / cover logo: PNG from assets, generated mark, or text fallback. */
export function pdfLogoContent(
  assets?: ExportAssets,
  size: PdfLogoSize = "sm",
): Content {
  const px = LOGO_PX[size];
  const png = assets?.logoPng ?? getMarkDataUrl(LOGO_SRC[size]);
  if (png) {
    return {
      image: png,
      width: px,
      height: px,
      margin: [0, 0, 10, 0],
    };
  }
  return {
    text: "SW",
    style: size === "xl" || size === "lg" ? "logoFallbackLg" : "logoFallback",
    margin: [0, 0, 10, 0],
  };
}

export function pdfBrandTitleContent(): Content {
  return {
    stack: [
      { text: "SpendWise", style: "brandTitle" },
      { text: "Personal Finance", style: "brandSubtitle" },
    ],
  };
}
