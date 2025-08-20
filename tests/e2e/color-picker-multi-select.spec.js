// tests/e2e/color-picker-multi-select.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

test.describe('Color Picker - Multi-Select Operations', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Should apply color to multiple selected notes @smoke', async ({
    page,
  }) => {
    // Create multiple notes
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    await page.waitForTimeout(200);
    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );
    await page.waitForTimeout(200);
    const note3 = await canvasPage.createNote(
      TestCoordinates.note3.x,
      TestCoordinates.note3.y,
    );

    // Select all notes using selection box
    await canvasPage.createSelectionBox(
      TestCoordinates.selectionBoxes.fullArea.startX,
      TestCoordinates.selectionBoxes.fullArea.startY,
      TestCoordinates.selectionBoxes.fullArea.endX,
      TestCoordinates.selectionBoxes.fullArea.endY,
    );

    // Verify all notes are selected
    await canvasPage.verifyNotesSelected(3);

    // Apply green color
    await page.click('.color-swatch[data-color="green"]');

    // Verify all notes have green color
    await expect(note1).toHaveClass(/color-green/);
    await expect(note2).toHaveClass(/color-green/);
    await expect(note3).toHaveClass(/color-green/);

    // Verify color picker shows green as active
    await expect(page.locator('.color-swatch[data-color="green"]')).toHaveClass(
      /active/,
    );
  });

  test('Should handle mixed-color multi-selection correctly', async ({
    page,
  }) => {
    // Create notes with different colors
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    await canvasPage.selectNote(note1);
    await page.click('.color-swatch[data-color="pink"]');

    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );
    await canvasPage.selectNote(note2);
    await page.click('.color-swatch[data-color="blue"]');

    const note3 = await canvasPage.createNote(
      TestCoordinates.note3.x,
      TestCoordinates.note3.y,
    );
    await canvasPage.selectNote(note3);
    await page.click('.color-swatch[data-color="green"]');

    // Verify initial colors
    await expect(note1).toHaveClass(/color-pink/);
    await expect(note2).toHaveClass(/color-blue/);
    await expect(note3).toHaveClass(/color-green/);

    // Select all notes
    await canvasPage.createSelectionBox(
      TestCoordinates.selectionBoxes.fullArea.startX,
      TestCoordinates.selectionBoxes.fullArea.startY,
      TestCoordinates.selectionBoxes.fullArea.endX,
      TestCoordinates.selectionBoxes.fullArea.endY,
    );

    // Color picker should show current global color (green from last selection)
    await expect(page.locator('.color-swatch[data-color="green"]')).toHaveClass(
      /active/,
    );

    // Apply yellow to all selected notes
    await page.click('.color-swatch[data-color="yellow"]');

    // All notes should now be yellow
    await expect(note1).toHaveClass(/color-yellow/);
    await expect(note2).toHaveClass(/color-yellow/);
    await expect(note3).toHaveClass(/color-yellow/);

    // Remove old color classes
    await expect(note1).not.toHaveClass(/color-pink/);
    await expect(note2).not.toHaveClass(/color-blue/);
    await expect(note3).not.toHaveClass(/color-green/);
  });

  test('Should handle partial selection of notes', async ({ page }) => {
    // Create multiple notes
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    await page.waitForTimeout(200);
    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );
    await page.waitForTimeout(200);
    const note3 = await canvasPage.createNote(
      TestCoordinates.note3.x,
      TestCoordinates.note3.y,
    );
    await page.waitForTimeout(200);
    const note4 = await canvasPage.createNote(
      TestCoordinates.note4.x,
      TestCoordinates.note4.y,
    );

    // Select only top two notes
    await canvasPage.createSelectionBox(
      TestCoordinates.selectionBoxes.topHalf.startX,
      TestCoordinates.selectionBoxes.topHalf.startY,
      TestCoordinates.selectionBoxes.topHalf.endX,
      TestCoordinates.selectionBoxes.topHalf.endY,
    );

    // Verify only 2 notes are selected
    await canvasPage.verifyNotesSelected(2);

    // Apply blue color
    await page.click('.color-swatch[data-color="blue"]');

    // Only selected notes should be blue
    await expect(note1).toHaveClass(/color-blue/);
    await expect(note2).toHaveClass(/color-blue/);

    // Unselected notes should remain yellow (default)
    await expect(note3).toHaveClass(/color-yellow/);
    await expect(note4).toHaveClass(/color-yellow/);
  });

  test('Should work with Shift+click to select multiple notes', async ({
    page,
  }) => {
    // Create notes
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );
    const note3 = await canvasPage.createNote(
      TestCoordinates.note3.x,
      TestCoordinates.note3.y,
    );

    // Select first note by clicking on the note border (not content)
    await note1.click({ position: { x: 3, y: 3 } });

    // Shift+click on second note border to add to selection
    await note2.click({
      modifiers: ['Shift'],
      position: { x: 3, y: 3 },
    });

    // Verify both notes are selected
    await expect(note1).toHaveClass(/selected/);
    await expect(note2).toHaveClass(/selected/);
    await expect(note3).not.toHaveClass(/selected/);

    // Apply pink color
    await page.click('.color-swatch[data-color="pink"]');

    // Both selected notes should be pink
    await expect(note1).toHaveClass(/color-pink/);
    await expect(note2).toHaveClass(/color-pink/);

    // Unselected note should remain yellow
    await expect(note3).toHaveClass(/color-yellow/);
  });

  test('Should maintain color state when adding/removing from selection', async ({
    page,
  }) => {
    // Create notes with different colors
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    await canvasPage.selectNote(note1);
    await page.click('.color-swatch[data-color="pink"]');

    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );
    await canvasPage.selectNote(note2);
    await page.click('.color-swatch[data-color="blue"]');

    // Select both notes using Shift+click on note borders
    await note1.click({ position: { x: 3, y: 3 } });
    await note2.click({
      modifiers: ['Shift'],
      position: { x: 3, y: 3 },
    });

    // Color picker should show current global color (blue from last action)
    await expect(page.locator('.color-swatch[data-color="blue"]')).toHaveClass(
      /active/,
    );

    // Remove note2 from selection (Shift+click again to toggle)
    await note2.click({
      modifiers: ['Shift'],
      position: { x: 3, y: 3 },
    });

    // Now only note1 is selected, picker should show its color (pink)
    await expect(note1).toHaveClass(/selected/);
    await expect(note2).not.toHaveClass(/selected/);
    await expect(page.locator('.color-swatch[data-color="pink"]')).toHaveClass(
      /active/,
    );
  });

  test('Should handle bulk color changes efficiently', async ({ page }) => {
    // Create many notes (test performance)
    const notes = [];
    const positions = [
      { x: 300, y: 250 },
      { x: 400, y: 250 },
      { x: 500, y: 250 },
      { x: 300, y: 350 },
      { x: 400, y: 350 },
      { x: 500, y: 350 },
      { x: 300, y: 450 },
      { x: 400, y: 450 },
      { x: 500, y: 450 },
    ];

    for (const pos of positions) {
      const note = await canvasPage.createNote(pos.x, pos.y);
      notes.push(note);
      await page.waitForTimeout(100); // Small delay between notes
    }

    // Select all notes
    await canvasPage.createSelectionBox(250, 200, 550, 500);

    // Verify all 9 notes are selected
    await canvasPage.verifyNotesSelected(9);

    // Apply color change
    const startTime = Date.now();
    await page.click('.color-swatch[data-color="green"]');
    const endTime = Date.now();

    // Verify operation completed quickly (under 2 seconds)
    expect(endTime - startTime).toBeLessThan(2000);

    // Verify all notes have the new color
    for (const note of notes) {
      await expect(note).toHaveClass(/color-green/);
    }
  });

  test('Should work correctly after moving selected notes', async ({
    page,
  }) => {
    // Create and select multiple notes
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    await page.waitForTimeout(200);
    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );

    // Select both notes
    await canvasPage.createSelectionBox(
      TestCoordinates.selectionBoxes.topHalf.startX,
      TestCoordinates.selectionBoxes.topHalf.startY,
      TestCoordinates.selectionBoxes.topHalf.endX,
      TestCoordinates.selectionBoxes.topHalf.endY,
    );

    // Move the selected notes
    await canvasPage.moveSelectedNotes(50, 50);

    // Apply color after movement
    await page.click('.color-swatch[data-color="green"]');

    // Both notes should have green color despite being moved
    await expect(note1).toHaveClass(/color-green/);
    await expect(note2).toHaveClass(/color-green/);
  });

  test('Should preserve individual note colors when not in multi-select', async ({
    page,
  }) => {
    // Create notes with different colors
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    await canvasPage.selectNote(note1);
    await page.click('.color-swatch[data-color="pink"]');

    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );
    await canvasPage.selectNote(note2);
    await page.click('.color-swatch[data-color="blue"]');

    // Clear selection using mouse.click (more reliable than page.click)
    await page.mouse.click(100, 100);

    // Select individual notes and verify their colors are preserved
    await canvasPage.selectNote(note1);
    await expect(page.locator('.color-swatch[data-color="pink"]')).toHaveClass(
      /active/,
    );

    await canvasPage.selectNote(note2);
    await expect(page.locator('.color-swatch[data-color="blue"]')).toHaveClass(
      /active/,
    );

    // Colors should still be correct
    await expect(note1).toHaveClass(/color-pink/);
    await expect(note2).toHaveClass(/color-blue/);
  });

  test('Should handle empty selection correctly', async ({ page }) => {
    // Create notes with colors
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    await canvasPage.selectNote(note1);
    await page.click('.color-swatch[data-color="green"]');

    // Clear selection using mouse.click (more reliable than page.click)
    await page.mouse.click(100, 100);

    // No notes should be selected
    await expect(page.locator('.note.selected')).toHaveCount(0);

    // Color picker should still show current global color
    await expect(page.locator('.color-swatch[data-color="green"]')).toHaveClass(
      /active/,
    );

    // Clicking color should update global state without affecting existing notes
    await page.click('.color-swatch[data-color="blue"]');
    await expect(page.locator('.color-swatch[data-color="blue"]')).toHaveClass(
      /active/,
    );

    // Existing note should keep its original color
    await expect(note1).toHaveClass(/color-green/);

    // New notes should use the new color
    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );
    await expect(note2).toHaveClass(/color-blue/);
  });
});
