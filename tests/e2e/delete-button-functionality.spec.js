/**
 * E2E Tests for Delete Button Functionality
 *
 * Tests both note delete buttons and connection delete buttons
 * to ensure they work correctly and consistently.
 */

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Delete Button Functionality', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test.describe('Note Delete Button', () => {
    test('shows delete button when note is selected', async ({ page }) => {
      // Create a note
      const note = await canvasPage.createNote();
      await page.waitForTimeout(100);

      // Initially, delete button should not be visible
      const deleteButton = page.locator('.note .shared-delete-button--note');
      await expect(deleteButton).toHaveCount(1);
      await expect(deleteButton).toBeHidden();

      // Click to select the note
      await note.click();
      await page.waitForTimeout(100);

      // Delete button should now be visible
      await expect(deleteButton).toBeVisible();
      await expect(deleteButton).toHaveCSS('display', 'flex');
    });

    test('hides delete button when note is deselected', async ({ page }) => {
      // Create and select a note
      const note = await canvasPage.createNote();
      await note.click();
      await page.waitForTimeout(100);

      const deleteButton = page.locator('.note .shared-delete-button--note');
      await expect(deleteButton).toBeVisible();

      // Click on empty area of canvas to deselect
      await page.locator('#canvas').click({ force: true });
      await page.waitForTimeout(100);

      // Delete button should now be hidden (check CSS display property)
      await expect(deleteButton).toHaveCSS('display', 'none');
    });

    test('deletes note when delete button is clicked', async ({ page }) => {
      // Create a note
      const note = await canvasPage.createNote();
      await note.click();
      await page.waitForTimeout(100);

      // Verify note exists
      await expect(note).toBeVisible();

      // Click delete button
      const deleteButton = page.locator('.note .shared-delete-button--note');
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await page.waitForTimeout(200);

      // Note should be removed from DOM
      await expect(note).not.toBeAttached();

      // Verify no notes remain
      const notes = page.locator('.note');
      await expect(notes).toHaveCount(0);
    });

    test('has correct styling and appearance', async ({ page }) => {
      // Create and select a note
      const note = await canvasPage.createNote();
      await note.click();
      await page.waitForTimeout(100);

      const deleteButton = page.locator('.note .shared-delete-button--note');

      // Check basic styling
      await expect(deleteButton).toHaveCSS('position', 'absolute');
      await expect(deleteButton).toHaveCSS('width', '18px');
      await expect(deleteButton).toHaveCSS('height', '18px');
      await expect(deleteButton).toHaveCSS('border-radius', '50%');

      // Check background color (semi-transparent red)
      const backgroundColor = await deleteButton.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      expect(backgroundColor).toMatch(/rgba\(255,\s*58,\s*48/);

      // Check SVG cross is present
      const svg = deleteButton.locator('svg');
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute('viewBox', '0 0 20 20');

      const lines = svg.locator('line');
      await expect(lines).toHaveCount(2);
    });

    test('is accessible via keyboard', async ({ page }) => {
      // Create and select a note
      const note = await canvasPage.createNote();
      await note.click();
      await page.waitForTimeout(100);

      const deleteButton = page.locator('.note .shared-delete-button--note');

      // Focus the delete button
      await deleteButton.focus();

      // Should have focus outline
      await expect(deleteButton).toBeFocused();

      // Press Enter to delete
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);

      // Note should be deleted
      await expect(note).not.toBeAttached();
    });

    test('shows hover state on desktop', async ({ page }) => {
      // Create and select a note
      const note = await canvasPage.createNote();
      await note.click();
      await page.waitForTimeout(100);

      const deleteButton = page.locator('.note .shared-delete-button--note');

      // Get initial background color
      const initialColor = await deleteButton.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );

      // Hover over button
      await deleteButton.hover();
      await page.waitForTimeout(100);

      // Background should change on hover (more opaque)
      const hoverColor = await deleteButton.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );

      expect(hoverColor).not.toBe(initialColor);
      expect(hoverColor).toMatch(/rgba\(255,\s*59,\s*48/);
    });
  });

  test.describe('Connection Delete Button', () => {
    test('shows delete button in connection context menu', async ({ page }) => {
      // Create two notes
      const note1 = await canvasPage.createNote();
      await page.waitForTimeout(800);
      const note2 = await canvasPage.createNote();
      await page.waitForTimeout(800);

      // Create connection between notes
      await canvasPage.createConnection(note1, note2);
      await page.waitForTimeout(500);

      // Find and hover over the connection line
      const connection = page.locator('line.connection-line').first();
      await expect(connection).toBeVisible();
      await connection.hover();
      await page.waitForTimeout(300);

      // Context menu should appear with delete button
      const contextMenu = page.locator('.context-menu');
      await expect(contextMenu).toBeVisible();

      const deleteButton = contextMenu.locator(
        '.shared-delete-button--connection[data-type="delete"]',
      );
      await expect(deleteButton).toBeVisible();
    });

    test('deletes connection when delete button is clicked', async ({
      page,
    }) => {
      // Create two notes and connection
      const note1 = await canvasPage.createNote();
      await page.waitForTimeout(800);
      const note2 = await canvasPage.createNote();
      await page.waitForTimeout(800);

      await canvasPage.createConnection(note1, note2);
      await page.waitForTimeout(500);

      // Verify connection exists
      const connection = page.locator('line.connection-line').first();
      await expect(connection).toBeVisible();

      // Hover over connection and click delete
      await connection.hover();
      await page.waitForTimeout(300);

      const deleteButton = page.locator(
        '.context-menu .shared-delete-button--connection[data-type="delete"]',
      );
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      await page.waitForTimeout(300);

      // Connection should be removed
      await expect(connection).not.toBeAttached();
    });

    test('has correct styling matching note delete button', async ({
      page,
    }) => {
      // Create two notes and connection
      const note1 = await canvasPage.createNote();
      await page.waitForTimeout(800);
      const note2 = await canvasPage.createNote();
      await page.waitForTimeout(800);

      await canvasPage.createConnection(note1, note2);
      await page.waitForTimeout(500);

      // Show context menu
      const connection = page.locator('line.connection-line').first();
      await connection.hover();
      await page.waitForTimeout(300);

      const deleteButton = page.locator(
        '.context-menu .shared-delete-button--connection[data-type="delete"]',
      );

      // Check circle background
      const circle = deleteButton.locator('.shared-delete-button-background');
      const circleColor = await circle.evaluate(
        (el) => getComputedStyle(el).fill,
      );
      expect(circleColor).toMatch(/rgba\(255,\s*58,\s*48/);

      // Check cross lines
      const crossLines = deleteButton.locator('svg line');
      await expect(crossLines).toHaveCount(2);

      const lineColor = await crossLines
        .first()
        .evaluate((el) => getComputedStyle(el).stroke);
      expect(lineColor).toMatch(/(rgb\(255,\s*255,\s*255\)|white)/);
    });
  });

  test.describe('Cross-Component Consistency', () => {
    test('both delete buttons use same visual design', async ({ page }) => {
      // Create note and connection
      const note1 = await canvasPage.createNote();
      await note1.click();
      await page.waitForTimeout(800);

      const note2 = await canvasPage.createNote();
      await page.waitForTimeout(800);

      await canvasPage.createConnection(note1, note2);
      await page.waitForTimeout(500);

      // Get note delete button
      const noteDeleteButton = page.locator(
        '.note .shared-delete-button--note',
      );
      await expect(noteDeleteButton).toBeVisible();

      // Get connection delete button
      const connection = page.locator('line.connection-line').first();
      await connection.hover();
      await page.waitForTimeout(300);

      const connDeleteButton = page.locator(
        '.context-menu .shared-delete-button--connection[data-type="delete"]',
      );
      await expect(connDeleteButton).toBeVisible();

      // Both should have similar cross icon structure
      const noteSvg = noteDeleteButton.locator('svg');
      const connSvg = connDeleteButton.locator('svg');

      await expect(noteSvg).toHaveAttribute('viewBox', '0 0 20 20');
      await expect(connSvg).toHaveAttribute('viewBox', '0 0 20 20');

      // Both should have 2 cross lines
      await expect(noteSvg.locator('line')).toHaveCount(2);
      await expect(connSvg.locator('line')).toHaveCount(2);
    });

    test('both delete buttons work independently', async ({ page }) => {
      // Create note and connection
      const note1 = await canvasPage.createNote();
      await note1.click();
      await page.waitForTimeout(800);

      const note2 = await canvasPage.createNote();
      await page.waitForTimeout(800);

      await canvasPage.createConnection(note1, note2);
      await page.waitForTimeout(500);

      // Delete connection first
      const connection = page.locator('line.connection-line').first();
      await connection.hover();
      await page.waitForTimeout(300);

      const connDeleteButton = page.locator(
        '.context-menu .shared-delete-button--connection[data-type="delete"]',
      );
      await connDeleteButton.click();
      await page.waitForTimeout(300);

      // Connection should be gone, notes should remain
      await expect(connection).not.toBeAttached();
      await expect(note1).toBeVisible();
      await expect(note2).toBeVisible();

      // Now delete a note
      await note1.click();
      const noteDeleteButton = page.locator(
        '.note.selected .shared-delete-button--note',
      );
      await noteDeleteButton.click();
      await page.waitForTimeout(300);

      // First note should be gone, second should remain
      await expect(note1).not.toBeAttached();
      await expect(note2).toBeVisible();
    });
  });
});
