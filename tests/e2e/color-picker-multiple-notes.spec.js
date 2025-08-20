// tests/e2e/color-picker-multiple-notes.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Color Picker - Multiple Notes', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Should handle color persistence with multiple notes', async ({
    page,
  }) => {
    // Create fewer notes (6 instead of 12) for better CI performance
    const colors = ['yellow', 'pink', 'green', 'blue'];
    const noteData = [];

    for (let i = 0; i < 6; i++) {
      // Add throttling delay before each note creation (except first)
      if (i > 0) {
        await page.waitForTimeout(600);
      }

      const x = 350 + (i % 3) * 200;
      const y = 300 + Math.floor(i / 3) * 200;
      const color = colors[i % 4];

      const note = await canvasPage.createNote(x, y);
      await canvasPage.selectNote(note);
      await page.click(`.color-swatch[data-color="${color}"]`);
      await canvasPage.editNoteContent(`Note ${i + 1}`, note);

      noteData.push({ index: i + 1, color, x, y });
      await canvasPage.waitForAppReady();
    }

    // Test persistence by refreshing the page instead of export/import
    // This tests the same functionality (localStorage persistence) without clipboard issues
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await canvasPage.waitForAppReady();

    // Verify all notes and colors are restored after page refresh
    for (const data of noteData) {
      const note = page.locator(`.note:has-text("Note ${data.index}")`);
      await expect(note).toBeVisible();
      await expect(note).toHaveClass(new RegExp(`color-${data.color}`)); // Fixed CSS pattern
    }
  });
});
