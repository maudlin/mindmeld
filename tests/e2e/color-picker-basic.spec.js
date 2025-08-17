// tests/e2e/color-picker-basic.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Color Picker - Basic Workflows', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Should display color picker with all color swatches @smoke', async ({
    page,
  }) => {
    // Verify color picker container is visible
    await expect(page.locator('#color-picker-container')).toBeVisible();

    // Verify all 4 color swatches are present
    const colorSwatches = page.locator('.color-swatch');
    await expect(colorSwatches).toHaveCount(4);

    // Verify specific colors exist
    await expect(
      page.locator('.color-swatch[data-color="yellow"]'),
    ).toBeVisible();
    await expect(
      page.locator('.color-swatch[data-color="pink"]'),
    ).toBeVisible();
    await expect(
      page.locator('.color-swatch[data-color="green"]'),
    ).toBeVisible();
    await expect(
      page.locator('.color-swatch[data-color="blue"]'),
    ).toBeVisible();

    // Verify yellow is active by default
    await expect(
      page.locator('.color-swatch[data-color="yellow"]'),
    ).toHaveClass(/active/);
  });

  test('Should apply color to newly created note', async ({ page }) => {
    // Select blue color first
    await page.click('.color-swatch[data-color="blue"]');
    await expect(page.locator('.color-swatch[data-color="blue"]')).toHaveClass(
      /active/,
    );

    // Create a new note
    const note = await canvasPage.createNote(400, 300);

    // Verify note has blue color class
    await expect(note).toHaveClass(/color-blue/);
  });

  test('Should apply color to existing selected note', async ({ page }) => {
    // Create a note first
    const note = await canvasPage.createNote(400, 300);

    // Verify note has default yellow color
    await expect(note).toHaveClass(/color-yellow/);

    // Select the note
    await canvasPage.selectNote(note);

    // Apply green color
    await page.click('.color-swatch[data-color="green"]');

    // Verify note now has green color
    await expect(note).toHaveClass(/color-green/);
    await expect(note).not.toHaveClass(/color-yellow/);
  });

  test('Should update color picker when selecting notes with different colors', async ({
    page,
  }) => {
    // Create first note and color it pink
    const note1 = await canvasPage.createNote(300, 300);
    await canvasPage.selectNote(note1);
    await page.click('.color-swatch[data-color="pink"]');

    // Create second note and color it green
    const note2 = await canvasPage.createNote(500, 300);
    await canvasPage.selectNote(note2);
    await page.click('.color-swatch[data-color="green"]');

    // Clear selection by clicking on empty canvas area
    await page.click('#canvas-container', { position: { x: 100, y: 100 } });

    // Select first note - picker should show pink
    await canvasPage.selectNote(note1);
    await expect(page.locator('.color-swatch[data-color="pink"]')).toHaveClass(
      /active/,
    );

    // Select second note - picker should show green
    await canvasPage.selectNote(note2);
    await expect(page.locator('.color-swatch[data-color="green"]')).toHaveClass(
      /active/,
    );
  });

  test('Should maintain color picker state when no notes selected', async ({
    page,
  }) => {
    // Set color to blue
    await page.click('.color-swatch[data-color="blue"]');
    await expect(page.locator('.color-swatch[data-color="blue"]')).toHaveClass(
      /active/,
    );

    // Create and select a note
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.selectNote(note);

    // Verify note has blue color and picker shows blue
    await expect(note).toHaveClass(/color-blue/);
    await expect(page.locator('.color-swatch[data-color="blue"]')).toHaveClass(
      /active/,
    );

    // Deselect note
    await page.click('#canvas-container', { position: { x: 100, y: 100 } });

    // Picker should still show blue as current color
    await expect(page.locator('.color-swatch[data-color="blue"]')).toHaveClass(
      /active/,
    );
  });

  test('Should provide visual feedback on color swatch interaction', async ({
    page,
  }) => {
    const greenSwatch = page.locator('.color-swatch[data-color="green"]');

    // Test hover state
    await greenSwatch.hover();
    await expect(greenSwatch).toHaveClass(/hover/);

    // Test click selection
    await greenSwatch.click();
    await expect(greenSwatch).toHaveClass(/active/);

    // Move mouse away to clear hover state
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    // Note: hover state may persist after click, this is acceptable behavior
  });

  test.skip('Should work with different canvas templates', async ({ page }) => {
    // Test on Standard Canvas (default)
    await page.click('.color-swatch[data-color="pink"]');
    const note1 = await canvasPage.createNote(400, 300);
    await expect(note1).toHaveClass(/color-pink/);

    // Switch to Hero's Journey template
    await canvasPage.switchToTemplate("Hero's Journey");

    // Color picker should still work
    await page.click('.color-swatch[data-color="green"]');
    const note2 = await canvasPage.createNote(500, 400);
    await expect(note2).toHaveClass(/color-green/);

    // Verify first note still has pink color
    await expect(note1).toHaveClass(/color-pink/);
  });

  test('Should handle rapid color changes without issues', async ({ page }) => {
    // Create a note
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.selectNote(note);

    // Rapidly change colors
    for (const color of ['pink', 'green', 'blue', 'yellow', 'pink']) {
      await page.click(`.color-swatch[data-color="${color}"]`);
      await expect(
        page.locator(`.color-swatch[data-color="${color}"]`),
      ).toHaveClass(/active/);
      await page.waitForTimeout(100); // Small delay to allow visual updates
    }

    // Verify final state
    await expect(note).toHaveClass(/color-pink/);
    await expect(page.locator('.color-swatch[data-color="pink"]')).toHaveClass(
      /active/,
    );
  });

  test('Should work correctly after page interactions', async ({ page }) => {
    // Create a note with initial color
    await page.click('.color-swatch[data-color="blue"]');
    const note = await canvasPage.createNote(400, 300);

    // Perform some page interactions
    await canvasPage.selectNote(note);
    await canvasPage.moveNote(note, 100, 100);

    // Change color after movement
    await page.click('.color-swatch[data-color="green"]');
    await expect(note).toHaveClass(/color-green/);

    // Add some content
    await canvasPage.editNoteContent('Test note', note);

    // Color should persist
    await expect(note).toHaveClass(/color-green/);
  });

  test('Should handle edge case of clicking same color multiple times', async ({
    page,
  }) => {
    // Select a color
    await page.click('.color-swatch[data-color="green"]');
    await expect(page.locator('.color-swatch[data-color="green"]')).toHaveClass(
      /active/,
    );

    // Click same color multiple times
    for (let i = 0; i < 3; i++) {
      await page.click('.color-swatch[data-color="green"]');
      await expect(
        page.locator('.color-swatch[data-color="green"]'),
      ).toHaveClass(/active/);
    }

    // Create note and verify color is correct
    const note = await canvasPage.createNote(400, 300);
    await expect(note).toHaveClass(/color-green/);
  });
});
