// tests/e2e/color-picker-backwards-compatibility.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Color Picker - Backwards Compatibility', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Should handle backwards compatibility with V0 format (no color data)', async ({
    page,
  }) => {
    // V0 format - notes without "cl" (color) field + connection without colors
    const v0Data = {
      data: {
        n: [
          {
            i: '1',
            p: [400, 300],
            c: 'Legacy Note 1',
            // No "cl" field - this is V0 format
          },
          {
            i: '2',
            p: [500, 400],
            c: 'Legacy Note 2',
            // No "cl" field - this is V0 format
          },
        ],
        c: [
          ['1', '2', 1],
          // V0 connections: [fromId, toId, typeNum] - no color data
        ],
      },
    };

    // Mock clipboard and import V0 data
    await page.evaluate(() => {
      let clipboardData = '';
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text) => {
            clipboardData = text;
            return Promise.resolve();
          },
          readText: () => Promise.resolve(clipboardData),
        },
        writable: true,
      });
    });

    await page.evaluate((data) => {
      navigator.clipboard.writeText(JSON.stringify(data));
    }, v0Data);

    // Import V0 data
    await page.click('#kebab-menu-button');
    await page.click('.kebab-menu-item[data-action="paste-clipboard"]');
    await page.waitForTimeout(500);

    // Verify V0 import: 2 notes, 1 connection, default colors
    const notes = page.locator('.note');
    await expect(notes).toHaveCount(2);

    const note1 = page.locator('.note:has-text("Legacy Note 1")');
    const note2 = page.locator('.note:has-text("Legacy Note 2")');

    // All V0 notes should default to yellow
    await expect(note1).toHaveClass(/color-yellow/);
    await expect(note2).toHaveClass(/color-yellow/);

    // Connection should be imported
    await expect(page.locator('g[data-start][data-end]')).toBeVisible();
  });
});
