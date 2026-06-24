#!/usr/bin/env node
/**
 * Copies NEXT_PUBLIC_FIREBASE_* from web/.env.local into mobile/.env
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const webEnvPath = resolve(root, 'web/.env.local');
const mobileEnvPath = resolve(__dirname, '../.env');

const map = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'FIREBASE_API_KEY',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'FIREBASE_AUTH_DOMAIN',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'FIREBASE_PROJECT_ID',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'FIREBASE_STORAGE_BUCKET',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'FIREBASE_MESSAGING_SENDER_ID',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'FIREBASE_APP_ID',
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: 'FIREBASE_MEASUREMENT_ID',
};

if (!existsSync(webEnvPath)) {
  console.error('Missing web/.env.local — copy web/.env.example first.');
  process.exit(1);
}

const lines = readFileSync(webEnvPath, 'utf8').split('\n');
const values = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  values[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
}

let existing = {};
if (existsSync(mobileEnvPath)) {
  for (const line of readFileSync(mobileEnvPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    existing[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
}

const out = [
  '# Auto-synced from web/.env.local — edit GOOGLE_WEB_CLIENT_ID manually',
  '',
];

for (const [webKey, mobileKey] of Object.entries(map)) {
  const value = values[webKey] ?? existing[mobileKey] ?? '';
  out.push(`${mobileKey}=${value}`);
}

out.push('');
out.push(`GOOGLE_WEB_CLIENT_ID=${existing.GOOGLE_WEB_CLIENT_ID ?? ''}`);
out.push('');

writeFileSync(mobileEnvPath, out.join('\n'));
console.log(`Wrote ${mobileEnvPath}`);
