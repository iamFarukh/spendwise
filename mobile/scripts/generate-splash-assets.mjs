#!/usr/bin/env node
/**
 * Renders premium native splash frames (gradient, glow orbs, logo card, wordmark).
 * Run via: npm run generate:splash --workspace=@pfos/mobile
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(root, '..');

const sourceIcon = path.join(repoRoot, 'web/public/brand/spendwise-icon.png');
const androidSplashDir = path.join(root, 'android/app/src/main/res/drawable-nodpi');
const iosSplashDir = path.join(
  root,
  'ios/SpendWiseMobile/Images.xcassets/LaunchBackground.imageset',
);
const iosIconDir = path.join(
  root,
  'ios/SpendWiseMobile/Images.xcassets/LaunchIcon.imageset',
);

const BRAND = {
  canvas: '#F2F7F4',
  canvas2: '#E9F1ED',
  mint50: '#ECFDF6',
  mint200: '#A6F0D1',
  mint300: '#6FE5B6',
  mintBright: '#25E6A6',
  ink900: '#0E2A22',
  ink500: '#6B847B',
  paper: '#FFFFFF',
};

if (!fs.existsSync(sourceIcon)) {
  console.error(`Source icon not found: ${sourceIcon}`);
  process.exit(1);
}

function splashSvg(width, height) {
  const cx = width / 2;
  const cardY = height * 0.42;
  const cardSize = Math.round(width * 0.31);
  const iconSize = Math.round(cardSize * 0.62);
  const glowSize = Math.round(cardSize * 1.15);
  const wordmarkSize = Math.round(width * 0.086);
  const taglineSize = Math.round(width * 0.038);

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BRAND.mint50}"/>
      <stop offset="48%" stop-color="${BRAND.canvas}"/>
      <stop offset="100%" stop-color="${BRAND.canvas2}"/>
    </linearGradient>
    <radialGradient id="orbTop" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${BRAND.mintBright}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${BRAND.mintBright}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orbBottom" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${BRAND.mint300}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${BRAND.mint300}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cardGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${BRAND.mint200}" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="${BRAND.mint200}" stop-opacity="0"/>
    </radialGradient>
    <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0E2A22" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <circle cx="${width * 0.88}" cy="${height * 0.12}" r="${width * 0.34}" fill="url(#orbTop)"/>
  <circle cx="${width * 0.08}" cy="${height * 0.78}" r="${width * 0.28}" fill="url(#orbBottom)"/>

  <circle cx="${cx}" cy="${cardY}" r="${glowSize / 2}" fill="url(#cardGlow)"/>

  <g filter="url(#cardShadow)">
    <rect
      x="${cx - cardSize / 2}"
      y="${cardY - cardSize / 2}"
      width="${cardSize}"
      height="${cardSize}"
      rx="${Math.round(cardSize * 0.22)}"
      fill="${BRAND.paper}"
      stroke="rgba(255,255,255,0.9)"
      stroke-width="2"
    />
  </g>

  <image
    href="SOURCE_ICON"
    x="${cx - iconSize / 2}"
    y="${cardY - iconSize / 2}"
    width="${iconSize}"
    height="${iconSize}"
    preserveAspectRatio="xMidYMid meet"
  />

  <text
    x="${cx}"
    y="${cardY + cardSize / 2 + wordmarkSize * 1.15}"
    text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif"
    font-size="${wordmarkSize}"
    font-weight="700"
    letter-spacing="-1.5"
    fill="${BRAND.ink900}">SpendWise</text>

  <text
    x="${cx}"
    y="${cardY + cardSize / 2 + wordmarkSize * 1.15 + taglineSize * 1.85}"
    text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
    font-size="${taglineSize}"
    font-weight="600"
    fill="${BRAND.ink500}">Your ledger of truth</text>
</svg>`);
}

async function renderSplash(outputPath, width, height) {
  const iconDataUrl = `data:image/png;base64,${fs.readFileSync(sourceIcon).toString('base64')}`;
  const svg = splashSvg(width, height)
    .toString('utf8')
    .replace('href="SOURCE_ICON"', `href="${iconDataUrl}"`);

  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outputPath);
}

async function renderIconOnly(outputPath, size) {
  await sharp(sourceIcon)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPath);
}

console.log('Rendering premium splash frames…');
fs.mkdirSync(androidSplashDir, { recursive: true });
fs.mkdirSync(iosSplashDir, { recursive: true });
fs.mkdirSync(iosIconDir, { recursive: true });

await renderSplash(path.join(androidSplashDir, 'splash_screen.png'), 1290, 2796);
await renderSplash(path.join(iosSplashDir, 'launch-background@3x.png'), 1290, 2796);
await renderSplash(path.join(iosSplashDir, 'launch-background@2x.png'), 860, 1864);
await renderSplash(path.join(iosSplashDir, 'launch-background.png'), 430, 932);

for (const [name, px] of [
  ['launch-icon.png', 80],
  ['launch-icon@2x.png', 160],
  ['launch-icon@3x.png', 240],
]) {
  await renderIconOnly(path.join(iosIconDir, name), px);
}

fs.writeFileSync(
  path.join(iosSplashDir, 'Contents.json'),
  `${JSON.stringify(
    {
      images: [
        { idiom: 'universal', filename: 'launch-background.png', scale: '1x' },
        { idiom: 'universal', filename: 'launch-background@2x.png', scale: '2x' },
        { idiom: 'universal', filename: 'launch-background@3x.png', scale: '3x' },
      ],
      info: { version: 1, author: 'xcode' },
    },
    null,
    2,
  )}\n`,
);

fs.writeFileSync(
  path.join(iosIconDir, 'Contents.json'),
  `${JSON.stringify(
    {
      images: [
        { idiom: 'universal', filename: 'launch-icon.png', scale: '1x' },
        { idiom: 'universal', filename: 'launch-icon@2x.png', scale: '2x' },
        { idiom: 'universal', filename: 'launch-icon@3x.png', scale: '3x' },
      ],
      info: { version: 1, author: 'xcode' },
    },
    null,
    2,
  )}\n`,
);

console.log('Done — splash frames written for iOS and Android.');
