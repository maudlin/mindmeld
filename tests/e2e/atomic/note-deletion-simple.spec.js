import { test, expect } from '@playwright/test';
import { CanvasPage } from '../helpers/CanvasPage.js';

test.describe('Note Deletion - Simple', () => {
  test('Create note, select it, and delete with Delete key @smoke', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    await canvasPage.load(); // Desktop mode

    // Step 1: Create a note
    const note = await canvasPage.createNote(640, 388);

    // Step 2: Select the note
    await canvasPage.selectNote(note);

    // Step 3: Delete with Delete key
    await page.keyboard.press('Delete');

    // Step 4: Verify note is deleted
    const noteCount = await page.locator('.note').count();
    expect(noteCount).toBe(0);
  });
});
