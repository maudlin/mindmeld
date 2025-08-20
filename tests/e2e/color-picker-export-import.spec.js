// tests/e2e/color-picker-export-import.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Color Picker - Export/Import Workflow', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Should maintain colors in export/import workflow', async ({ page }) => {
    // Mock clipboard to avoid browser permission issues
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

    // Create notes with specific colors with proper throttling delays
    const note1 = await canvasPage.createNote(300, 300);
    await canvasPage.selectNote(note1);
    await page.click('.color-swatch[data-color="pink"]');
    await canvasPage.editNoteContent('Exported pink', note1);

    // Add throttling delay before creating second note
    await page.waitForTimeout(600);

    const note2 = await canvasPage.createNote(500, 300);
    await canvasPage.selectNote(note2);
    await page.click('.color-swatch[data-color="blue"]');
    await canvasPage.editNoteContent('Exported blue', note2);

    // Connect the notes to make export more meaningful
    await canvasPage.connectNotes(note1, note2);

    // Export to clipboard
    await page.click('#kebab-menu-button');
    await page.click('.kebab-menu-item[data-action="copy-clipboard"]');

    // Wait for export notification
    await expect(page.locator('.notification-toast')).toBeVisible();
    await page.waitForTimeout(1000);

    // Clear canvas
    await page.click('#kebab-menu-button');
    await page.click('.kebab-menu-item[data-action="clear-canvas"]');
    await page.click('.notification-modal-button-confirm');

    // Wait for canvas to be cleared
    await canvasPage.waitForCanvasEmpty();

    // Import from clipboard
    await page.click('#kebab-menu-button');
    await page.click('.kebab-menu-item[data-action="paste-clipboard"]');

    // Wait for import to complete
    await page.waitForTimeout(1500);

    // Find imported notes by content
    const importedPinkNote = page.locator('.note:has-text("Exported pink")');
    const importedBlueNote = page.locator('.note:has-text("Exported blue")');

    // Verify colors were restored - this is the primary focus of this test
    await expect(importedPinkNote).toBeVisible();
    await expect(importedPinkNote).toHaveClass(/color-pink/);
    await expect(importedBlueNote).toBeVisible();
    await expect(importedBlueNote).toHaveClass(/color-blue/);
  });
});
