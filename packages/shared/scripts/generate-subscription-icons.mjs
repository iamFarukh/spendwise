#!/usr/bin/env node
/**
 * Bundles brand SVG path data for subscription icons.
 *
 * 1. Tries the installed `simple-icons` npm package.
 * 2. Falls back to `@iconify-json/simple-icons` for trademarked brands removed
 *    from the npm distribution.
 *
 * Run: node scripts/generate-subscription-icons.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const simpleIcons = require("simple-icons");
const iconify = require("@iconify-json/simple-icons");

import { readFileSync } from "node:fs";

const OUT = join(__dirname, "../src/subscriptions/icons/custom-brands.generated.ts");

function loadRegistrySlugs() {
  const source = readFileSync(
    join(__dirname, "../src/subscriptions/icons/registry.ts"),
    "utf8",
  );
  const values = [...source.matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]);
  return [...new Set(values)];
}

const UNIQUE_SLUGS = loadRegistrySlugs();

function slugToSimpleIconsKey(slug) {
  return (
    "si" +
    slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("")
  );
}

function extractPathFromIconifyBody(body) {
  const match = body.match(/d="([^"]+)"/);
  return match?.[1] ?? null;
}

function lookupSimpleIcons(slug) {
  const key = slugToSimpleIconsKey(slug);
  const icon = simpleIcons[key];
  if (!icon?.path) {
    return null;
  }
  return {
    slug,
    title: icon.title,
    hex: `#${icon.hex}`,
    path: icon.path,
    source: "simple-icons",
  };
}

function lookupIconify(slug) {
  const icon = iconify.icons.icons[slug];
  if (!icon?.body) {
    return null;
  }
  const path = extractPathFromIconifyBody(icon.body);
  if (!path) {
    return null;
  }
  return {
    slug,
    title: slug,
    hex: "#64748B",
    path,
    source: "iconify-simple-icons",
  };
}

const BRAND_HEX_OVERRIDES = {
  microsoft: "#F25022",
  adobe: "#FF0000",
  linkedin: "#0A66C2",
  hulu: "#1CE783",
  disneyplus: "#113CCF",
  hotstar: "#1F80E0",
  sonyliv: "#1A1B4B",
  zee5: "#6A1B9A",
  cursor: "#000000",
  midjourney: "#000000",
  runway: "#000000",
  lovable: "#FF5A5F",
  bolt: "#FFA500",
  characterai: "#5D3FD3",
  blackbox: "#000000",
  jiosaavn: "#2BC5B4",
  gaana: "#E72C30",
  capcut: "#000000",
  masterclass: "#000000",
  brilliant: "#FCC419",
  cultfit: "#FF3274",
  healthifyme: "#1EBEA5",
  myfitnesspal: "#0066EE",
  fittr: "#00B386",
  moneycontrol: "#1A6B4C",
  tickertape: "#5367FF",
  smallcase: "#1F2937",
  etmoney: "#00B386",
  indmoney: "#00C853",
  truecaller: "#0087FF",
  linode: "#00A95C",
  pcloud: "#00A4E4",
  monday: "#FF3D57",
  peacock: "#000000",
  discoveryplus: "#2175D9",
  sling: "#000000",
  economist: "#E3120B",
  bloomberg: "#000000",
  reuters: "#FF8000",
  wsj: "#000000",
  washingtonpost: "#000000",
  financialtimes: "#990F3D",
  theathletic: "#000000",
  ynab: "#1E9FD8",
  oura: "#000000",
  whoop: "#000000",
  groww: "#00D09C",
  babbel: "#FF6700",
  bumble: "#FFC629",
  calm: "#3F6FED",
  costco: "#005DAA",
  bear: "#E0392B",
  things: "#1A6DF0",
  jasper: "#FF7A59",
  otter: "#00B2A9",
  jiocinema: "#E5006E",
  kindle: "#FF9900",
  amazonwebservices: "#FF9900",
  microsoftteams: "#6264A7",
  microsoftonedrive: "#0364B8",
  newyorktimes: "#000000",
  theguardian: "#052962",
  theathletic: "#000000",
  render: "#000000",
  roamresearch: "#000000",
  superhuman: "#000000",
  fantastical: "#FF3B30",
  setapp: "#FF4F64",
  seekingalpha: "#FB761E",
  empower: "#2B6BB2",
  zerodha: "#387ED1",
  hinge: "#000000",
  blinkit: "#F8CB46",
  myntra: "#FF3F6C",
  storytel: "#FF5A36",
  onlyfans: "#00AFF0",
  ea: "#FF4747",
  fubo: "#EC0E2D",
  dazn: "#F8F806",
  espn: "#D50A0A",
  sync: "#1A6DF0",
  mubi: "#000000",
};

const bundled = {};
const missing = [];

for (const slug of UNIQUE_SLUGS.sort()) {
  const fromSimple = lookupSimpleIcons(slug);
  if (fromSimple) {
    bundled[slug] = fromSimple;
    continue;
  }
  const fromIconify = lookupIconify(slug);
  if (fromIconify) {
    bundled[slug] = {
      ...fromIconify,
      hex: BRAND_HEX_OVERRIDES[slug] ?? fromIconify.hex,
    };
    continue;
  }
  missing.push(slug);
}

const header = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Run \`node scripts/generate-subscription-icons.mjs\` to refresh.
 */
import type { SubscriptionBrandIcon } from "./resolve";

export const SUBSCRIPTION_CUSTOM_BRAND_ICONS: Record<string, SubscriptionBrandIcon> = `;

const body = JSON.stringify(bundled, null, 2)
  .replace(/"source": "simple-icons"/g, '"source": "simple-icons" as const')
  .replace(
    /"source": "iconify-simple-icons"/g,
    '"source": "iconify-simple-icons" as const',
  );

writeFileSync(OUT, `${header}${body};\n`);

console.log(`Wrote ${Object.keys(bundled).length} brand icons → ${OUT}`);
if (missing.length) {
  console.log(`Missing (${missing.length}, will use category fallback):`);
  console.log(missing.join(", "));
}
