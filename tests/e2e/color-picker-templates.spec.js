// tests/e2e/color-picker-templates.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Color Picker - Template Switching', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Should preserve colors when switching templates', async ({ page }) => {
    // Create notes with colors on Standard Canvas with proper throttling delays
    const note1 = await canvasPage.createNote(400, 300);
    await canvasPage.selectNote(note1);
    await page.click('.color-swatch[data-color="pink"]');
    await canvasPage.editNoteContent('Pink on standard', note1);

    // Add throttling delay before creating second note
    await page.waitForTimeout(600);

    const note2 = await canvasPage.createNote(600, 300);
    await canvasPage.selectNote(note2);
    await page.click('.color-swatch[data-color="green"]');
    await canvasPage.editNoteContent('Green on standard', note2);

    // Switch to Hero's Journey template
    await canvasPage.switchToTemplate("Hero's Journey");
    await canvasPage.verifyTemplate("Hero's Journey");

    // Colors should be preserved
    const pinkNote = page.locator('.note:has-text("Pink on standard")');
    const greenNote = page.locator('.note:has-text("Green on standard")');

    await expect(pinkNote).toHaveClass(/color-pink/);
    await expect(greenNote).toHaveClass(/color-green/);

    // Switch to another template
    await canvasPage.switchToTemplate('Now/Next/Future');
    await canvasPage.verifyTemplate('Now/Next/Future');

    // Colors should still be preserved
    await expect(pinkNote).toHaveClass(/color-pink/);
    await expect(greenNote).toHaveClass(/color-green/);

    // Color picker should still work
    await canvasPage.selectNote(pinkNote);
    await page.click('.color-swatch[data-color="blue"]');
    await expect(pinkNote).toHaveClass(/color-blue/);
  });
});
