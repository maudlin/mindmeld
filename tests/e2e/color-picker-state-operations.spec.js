// tests/e2e/color-picker-state-operations.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

test.describe('Color Picker - State Operations', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Should persist colors across page refresh @smoke', async ({ page }) => {
    // Create notes with different colors
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    await canvasPage.selectNote(note1);
    await page.click('.color-swatch[data-color="pink"]');
    await canvasPage.editNoteContent('Pink note', note1);

    // Add throttling delay before creating second note
    await page.waitForTimeout(600);

    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );
    await canvasPage.selectNote(note2);
    await page.click('.color-swatch[data-color="blue"]');
    await canvasPage.editNoteContent('Blue note', note2);

    // Clear selection before setting global color by creating a temporary note
    const tempNote = await canvasPage.createNote(500, 500);
    await tempNote.press('Delete'); // Delete the temporary note
    await page.waitForTimeout(100); // Small wait for cleanup

    // Set current color to green
    await page.click('.color-swatch[data-color="green"]');

    // Verify colors before refresh
    await expect(note1).toHaveClass(/color-pink/);
    await expect(note2).toHaveClass(/color-blue/);
    await expect(page.locator('.color-swatch[data-color="green"]')).toHaveClass(
      /active/,
    );

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await canvasPage.waitForAppReady();

    // Find notes by their content after refresh
    const pinkNote = page.locator('.note:has-text("Pink note")');
    const blueNote = page.locator('.note:has-text("Blue note")');

    // Verify colors persisted
    await expect(pinkNote).toHaveClass(/color-pink/);
    await expect(blueNote).toHaveClass(/color-blue/);

    // Verify current color state persisted
    await expect(page.locator('.color-swatch[data-color="green"]')).toHaveClass(
      /active/,
    );
  });

  test('Should preserve current color state after operations', async ({
    page,
  }) => {
    // Set initial color
    await page.click('.color-swatch[data-color="blue"]');

    // Create and edit a note
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.editNoteContent('Test note', note);

    // Move the note
    await canvasPage.selectNote(note);
    await canvasPage.moveNote(note, 100, 100);

    // Current color should still be blue
    await expect(page.locator('.color-swatch[data-color="blue"]')).toHaveClass(
      /active/,
    );

    // Create another note - should be blue
    await page.waitForTimeout(600); // Throttling delay
    const note2 = await canvasPage.createNote(600, 300);
    await expect(note2).toHaveClass(/color-blue/);
  });
});
