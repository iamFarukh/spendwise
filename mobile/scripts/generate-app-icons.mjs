#!/usr/bin/env node
/**
 * Generates iOS AppIcon, Android mipmaps, and splash bitmaps from the brand icon.
 * Requires macOS `sips` (ships with macOS).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(root, '..');

const source = path.join(repoRoot, 'web/public/brand/spendwise-icon.png');
const brandDir = path.join(root, 'assets/brand');
const iosIconDir = path.join(
  root,
  'ios/SpendWiseMobile/Images.xcassets/AppIcon.appiconset',
);
const iosLaunchDir = path.join(
  root,
  'ios/SpendWiseMobile/Images.xcassets/LaunchLogo.imageset',
);
const androidRes = path.join(root, 'android/app/src/main/res');

if (!fs.existsSync(source)) {
  console.error(`Source icon not found: ${source}`);
  process.exit(1);
}

fs.mkdirSync(brandDir, { recursive: true });
fs.copyFileSync(source, path.join(brandDir, 'app-icon.png'));

function resize(input, output, size) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  execSync(
    `sips -z ${size} ${size} "${input}" --out "${output}" >/dev/null`,
    { stdio: 'inherit' },
  );
}

function padResize(input, output, size, padRatio = 0.18) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const tmp = `${output}.tmp.png`;
  resize(input, tmp, inner);
  execSync(
    `sips --padToHeightWidth ${size} ${size} --padColor F2F7F4 "${tmp}" --out "${output}" >/dev/null`,
    { stdio: 'inherit' },
  );
  fs.unlinkSync(tmp);
}

console.log('Generating iOS app icons…');
const iosIcons = [
  ['Icon-App-20x20@2x.png', 40],
  ['Icon-App-20x20@3x.png', 60],
  ['Icon-App-29x29@2x.png', 58],
  ['Icon-App-29x29@3x.png', 87],
  ['Icon-App-40x40@2x.png', 80],
  ['Icon-App-40x40@3x.png', 120],
  ['Icon-App-60x60@2x.png', 120],
  ['Icon-App-60x60@3x.png', 180],
  ['Icon-App-1024x1024@1x.png', 1024],
];

for (const [name, px] of iosIcons) {
  resize(source, path.join(iosIconDir, name), px);
}

fs.writeFileSync(
  path.join(iosIconDir, 'Contents.json'),
  `${JSON.stringify(
    {
      images: [
        {
          size: '20x20',
          idiom: 'iphone',
          filename: 'Icon-App-20x20@2x.png',
          scale: '2x',
        },
        {
          size: '20x20',
          idiom: 'iphone',
          filename: 'Icon-App-20x20@3x.png',
          scale: '3x',
        },
        {
          size: '29x29',
          idiom: 'iphone',
          filename: 'Icon-App-29x29@2x.png',
          scale: '2x',
        },
        {
          size: '29x29',
          idiom: 'iphone',
          filename: 'Icon-App-29x29@3x.png',
          scale: '3x',
        },
        {
          size: '40x40',
          idiom: 'iphone',
          filename: 'Icon-App-40x40@2x.png',
          scale: '2x',
        },
        {
          size: '40x40',
          idiom: 'iphone',
          filename: 'Icon-App-40x40@3x.png',
          scale: '3x',
        },
        {
          size: '60x60',
          idiom: 'iphone',
          filename: 'Icon-App-60x60@2x.png',
          scale: '2x',
        },
        {
          size: '60x60',
          idiom: 'iphone',
          filename: 'Icon-App-60x60@3x.png',
          scale: '3x',
        },
        {
          size: '1024x1024',
          idiom: 'ios-marketing',
          filename: 'Icon-App-1024x1024@1x.png',
          scale: '1x',
        },
      ],
      info: { version: 1, author: 'xcode' },
    },
    null,
    2,
  )}\n`,
);

console.log('Generating iOS launch logo…');
for (const [name, px] of [
  ['launch-logo.png', 120],
  ['launch-logo@2x.png', 240],
  ['launch-logo@3x.png', 360],
]) {
  padResize(source, path.join(iosLaunchDir, name), px, 0.12);
}

fs.writeFileSync(
  path.join(iosLaunchDir, 'Contents.json'),
  `${JSON.stringify(
    {
      images: [
        {
          idiom: 'universal',
          filename: 'launch-logo.png',
          scale: '1x',
        },
        {
          idiom: 'universal',
          filename: 'launch-logo@2x.png',
          scale: '2x',
        },
        {
          idiom: 'universal',
          filename: 'launch-logo@3x.png',
          scale: '3x',
        },
      ],
      info: { version: 1, author: 'xcode' },
    },
    null,
    2,
  )}\n`,
);

console.log('Generating Android launcher icons…');
const androidDensities = [
  ['mipmap-mdpi', 48, 108],
  ['mipmap-hdpi', 72, 162],
  ['mipmap-xhdpi', 96, 216],
  ['mipmap-xxhdpi', 144, 324],
  ['mipmap-xxxhdpi', 192, 432],
];

for (const [folder, launcherPx, foregroundPx] of androidDensities) {
  const dir = path.join(androidRes, folder);
  resize(source, path.join(dir, 'ic_launcher.png'), launcherPx);
  resize(source, path.join(dir, 'ic_launcher_round.png'), launcherPx);
  padResize(
    source,
    path.join(dir, 'ic_launcher_foreground.png'),
    foregroundPx,
    0.16,
  );
}

console.log('Generating Android splash bitmap…');
const splashDir = path.join(androidRes, 'drawable-nodpi');
padResize(source, path.join(splashDir, 'splash_logo.png'), 192, 0.1);

console.log('Done — app icons and splash assets generated.');
