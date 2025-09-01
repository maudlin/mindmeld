/**
 * E2E Integration Tests - Cross-Platform Workflows
 *
 * Tests that core workflows work across different input modes.
 * Ensures desktop and touch interactions both achieve the same user goals.
 *
 * Target: 4 tests covering input mode compatibility
 */

import { test, expect } from '@playwright/test';
import { CanvasPage } from '../helpers/CanvasPage.js';

test.describe('Cross-Platform Workflows @integration', () => {
  test.describe('Desktop Mode Workflows', () => {
    let canvasPage;

    test.beforeEach(async ({ page }) => {
      canvasPage = new CanvasPage(page);
      await canvasPage.load('desktop'); // Explicit desktop mode
    });

    test('Desktop: Basic note creation works', async () => {
      // User Journey: Desktop mouse interaction creates and edits notes

      // 1. Create note and add content
      const note = await canvasPage.createNote(400, 300);
      await canvasPage.editNoteContent('Desktop workflow test', note);

      // 2. Verify content using proper method
      const noteContent = note.locator('.note-content');
      const isTextarea = await noteContent.evaluate(
        (el) => el.tagName === 'TEXTAREA',
      );

      if (isTextarea) {
        await expect(noteContent).toHaveValue('Desktop workflow test');
      } else {
        await expect(noteContent).toHaveText('Desktop workflow test');
      }
    });

    test('Desktop: Color picker integration works', async () => {
      // User Journey: Create note → Apply color → Verify visual change

      // 1. Create note with content
      const note = await canvasPage.createNote(400, 300);
      await canvasPage.editNoteContent('Color test note', note);

      // 2. Select note and apply color
      await canvasPage.selectNote(note);
      await canvasPage.selectColor('blue');

      // 3. Verify color is applied
      await canvasPage.verifyNoteColor(note, 'blue');

      // 4. Verify content is preserved using proper method
      const noteContent = note.locator('.note-content');
      const isTextarea = await noteContent.evaluate(
        (el) => el.tagName === 'TEXTAREA',
      );

      if (isTextarea) {
        await expect(noteContent).toHaveValue('Color test note');
      } else {
        await expect(noteContent).toHaveText('Color test note');
      }
    });
  });

  test.describe('Touch Mode Workflows', () => {
    let canvasPage;

    test.beforeEach(async ({ page }) => {
      // Configure for touch
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
      canvasPage = new CanvasPage(page);
      await canvasPage.load('touch'); // Explicit touch mode
    });

    test('Touch: Mode loads and initializes correctly', async () => {
      // User Journey: Touch mode loads and basic UI is functional

      // 1. Verify touch mode loaded
      await canvasPage.waitForAppReady();

      // 2. Verify color picker is accessible
      await canvasPage.verifyColorPickerVisible();

      // 3. Verify color selection works
      await canvasPage.selectColor('blue');
      const activeColor = await canvasPage.getActiveColor();
      expect(activeColor).toBe('blue');

      // 4. Verify note creation works (simplified)
      const note = await canvasPage.createNote(300, 250);
      await expect(note).toBeVisible();
      await canvasPage.verifyNoteColor(note, 'blue');
    });
  });
});
