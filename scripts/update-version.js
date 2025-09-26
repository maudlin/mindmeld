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

// Ensure meta tags for app version and build date exist or are updated
let updated = html;

// Update or insert app-version meta tag
if (updated.match(/<meta\s+name=["']app-version["'][^>]*>/)) {
  updated = updated.replace(
    /<meta\s+name=["']app-version["'][^>]*>/,
    `<meta name="app-version" content="${pkg.version}" />`,
  );
} else {
  updated = updated.replace(
    /<\/head>/,
    `    <meta name="app-version" content="${pkg.version}" />\n  </head>`,
  );
}

// Update or insert build-date meta tag
if (updated.match(/<meta\s+name=["']build-date["'][^>]*>/)) {
  updated = updated.replace(
    /<meta\s+name=["']build-date["'][^>]*>/,
    `<meta name="build-date" content="${buildDate}" />`,
  );
} else {
  updated = updated.replace(
    /<\/head>/,
    `    <meta name="build-date" content="${buildDate}" />\n  </head>`,
  );
}

// Update cache busting parameters for CSS/JS
updated = updated
  .replace(/(css\/styles\.css\?v=)[^"]+/g, `$1${pkg.version}`)
  .replace(/(js\/app\.js\?v=)[^"]+/g, `$1${pkg.version}`);

// Write updated HTML
fs.writeFileSync(htmlPath, updated);

console.log(`Version updated to: ${versionText} (meta tags written)`);
