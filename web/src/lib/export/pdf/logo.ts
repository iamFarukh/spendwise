import type { Content } from "pdfmake/interfaces";

import { PDF_THEME } from "./theme";

import type { ExportAssets } from "../types";

/** Mint “SW” mark as PNG data URL (no external asset required). */
function spendWiseMarkPngDataUrl(): string {
  if (typeof document === "undefined") {
    return "";
  }
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }
  const r = 14;
  ctx.fillStyle = PDF_THEME.mint;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();
  ctx.fillStyle = PDF_THEME.paper;
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SW", size / 2, size / 2 + 1);
  return canvas.toDataURL("image/png");
}

let cachedMark: string | null = null;

function getMarkDataUrl(): string {
  if (!cachedMark) {
    cachedMark = spendWiseMarkPngDataUrl();
  }
  return cachedMark;
}

/** Header logo: PNG from assets, generated mark, or text fallback. */
export function pdfLogoContent(assets?: ExportAssets): Content {
  const png = assets?.logoPng ?? getMarkDataUrl();
  if (png) {
    return {
      image: png,
      width: 28,
      height: 28,
      margin: [0, 0, 8, 0],
    };
  }
  return {
    text: "SW",
    style: "logoFallback",
    margin: [0, 0, 8, 0],
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
