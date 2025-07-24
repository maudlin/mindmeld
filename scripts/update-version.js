#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
);

// Get current date in ISO format
const buildDate = new Date().toISOString().split('T')[0];

// Create version text with date
const versionText = `v${pkg.version} (${buildDate})`;

// Read HTML file
const htmlPath = path.join(__dirname, '../src/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Update version display and cache busting parameters
const updated = html
  .replace(/v[0-9.]+(?:\s*\([^)]*\))?/g, versionText)
  .replace(/(css\/styles\.css\?v=)[^"]+/g, `$1${pkg.version}`)
  .replace(/(js\/app\.js\?v=)[^"]+/g, `$1${pkg.version}`);

// Write updated HTML
fs.writeFileSync(htmlPath, updated);

console.log(`Version updated to: ${versionText}`);
