#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CHANGELOG_LIMIT = 5;
const OUTPUT_FILE = path.join(__dirname, '../src/changelog.html');

// Extract user-facing content from PR descriptions
function extractUserFacingContent(prBody, prTitle) {
  const lines = prBody.split('\n');
  const items = [];

  // Look for Summary section (most PRs have this)
  let inSummary = false;
  for (const line of lines) {
    if (line.startsWith('## Summary')) {
      inSummary = true;
      continue;
    }
    if (line.startsWith('##') && !line.startsWith('## Summary')) {
      inSummary = false;
    }

    if (inSummary && line.trim() && line.match(/^[•\-*]/)) {
      const cleanLine = line.replace(/^[•\-*]\s*/, '').trim();
      if (cleanLine.length > 10) {
        items.push(cleanLine);
      }
    }
  }

  // Fallback: use title if no summary items found
  if (items.length === 0) {
    items.push(prTitle);
  }

  return items;
}

// Simple categorization based on keywords
function categorizeItem(content) {
  const lower = content.toLowerCase();

  if (lower.includes('security') || lower.includes('vulnerability')) {
    return 'security';
  }
  if (
    lower.includes('fix') ||
    lower.includes('bug') ||
    lower.includes('error')
  ) {
    return 'fixes';
  }
  if (
    lower.includes('add') ||
    lower.includes('new') ||
    lower.includes('feature')
  ) {
    return 'features';
  }
  if (
    lower.includes('improve') ||
    lower.includes('enhance') ||
    lower.includes('better')
  ) {
    return 'improvements';
  }

  return 'changes';
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function generateChangelog() {
  console.log('🔄 Generating changelog from recent PRs...');
  console.log('ℹ️  This script runs automatically via GitHub Actions after PR merges');

  try {
    // Get current version from package.json
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
    );
    const currentVersion = pkg.version;

    // Fetch recent merged PRs
    const prData = execSync(
      `gh pr list --state merged --limit ${CHANGELOG_LIMIT} --json number,title,body,mergedAt`,
      { encoding: 'utf8' },
    );

    const prs = JSON.parse(prData);

    // Group changes by category
    const changelog = {
      features: [],
      improvements: [],
      fixes: [],
      security: [],
      changes: [],
    };

    // Process each PR
    for (const pr of prs) {
      const items = extractUserFacingContent(pr.body, pr.title);
      const date = formatDate(pr.mergedAt);

      for (const item of items) {
        const category = categorizeItem(item);
        changelog[category].push({
          content: item,
          prNumber: pr.number,
          date: date,
          title: pr.title,
        });
      }
    }

    // Generate HTML using same pattern as about.html
    const html = generateHTML(changelog, currentVersion);

    // Write changelog file
    fs.writeFileSync(OUTPUT_FILE, html);

    console.log(`✅ Changelog generated: ${OUTPUT_FILE}`);
    const totalItems = Object.values(changelog).flat().length;
    console.log(`📊 ${totalItems} changelog entries from ${prs.length} PRs`);

    return changelog;
  } catch (error) {
    console.error('❌ Error generating changelog:', error.message);
    process.exit(1);
  }
}

function generateHTML(changelog, version) {
  const categories = {
    features: '✨ New Features',
    improvements: '⚡ Improvements',
    fixes: '🐛 Bug Fixes',
    security: '🔒 Security Updates',
    changes: '📝 Other Changes',
  };

  const generateSection = (items, categoryName) => {
    if (items.length === 0) return '';

    return `
      <section>
        <h2>${categories[categoryName]}</h2>
        <ul>
          ${items
            .map(
              (item) => `
            <li>
              ${item.content}
              <small style="color: #666; margin-left: 1rem">
                (<a href="https://github.com/maudlin/mindmeld/pull/${item.prNumber}" target="_blank">#${item.prNumber}</a>, ${item.date})
              </small>
            </li>
          `,
            )
            .join('')}
        </ul>
      </section>`;
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>What's New - MindMeld</title>
    <link rel="stylesheet" href="css/styles.css?v=${version}" />
    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap"
      rel="stylesheet"
    />
    <link
      rel="icon"
      type="image/png"
      href="img/icon16.png"
      media="(prefers-color-scheme: light)"
    />
    <link
      rel="icon"
      type="image/png"
      href="img/icon16.png"
      media="(prefers-color-scheme: dark)"
    />
  </head>
  <body class="override-overflow">
    <nav id="navbar">
      <div id="logo">
        <img src="img/icon64.png" alt="MindMeld Logo" id="logo-icon" />
        mindmeld
      </div>
      <ul id="menu">
        <li class="menu-item">
          <a class="menu-link" href="index.html">Home</a>
        </li>
        <li class="menu-item">
          <a class="menu-link" href="about.html">About</a>
        </li>
      </ul>
    </nav>
    <div class="about-container">
      <h1>🚀 What's New in MindMeld</h1>
      
      <section>
        <p>
          Recent updates and improvements to make your mind mapping experience
          better.
        </p>
        <p><strong>Current Version:</strong> v${version}</p>
      </section>
      
      ${Object.entries(changelog)
        .map(([category, items]) => generateSection(items, category))
        .filter((section) => section.length > 0)
        .join('')}
      
      <section>
        <h2>📝 How This Changelog Works</h2>
        <p>
          This changelog is automatically generated from our recent development
          work. Each time we merge improvements, bug fixes, or new features,
          they appear here so you can see what's changed.
        </p>
        <p>
          For detailed technical information, you can view the full changes on
          our
          <a
            href="https://github.com/maudlin/mindmeld/pulls?q=is%3Apr+is%3Amerged"
            target="_blank"
            >GitHub repository</a
          >.
        </p>
      </section>

      <a href="index.html" class="text-blue-400 hover:underline">
        Back to Main Application
      </a>
    </div>
  </body>
</html>`;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateChangelog();
}

export { generateChangelog };
