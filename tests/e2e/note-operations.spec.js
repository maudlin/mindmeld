import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

// Usage in Test
test.describe('MindMeld Operations', () => {
  test('Create, edit, move, and delete a note', async ({ page }) => {
    const canvasPage = new CanvasPage(page);

    await canvasPage.load();
    await canvasPage.createNote();
    await canvasPage.selectNote();

    const initialPosition = await canvasPage.moveNote();
    const newPosition = await canvasPage.note.boundingBox();
    expect(newPosition.x).not.toBe(initialPosition.x);
    expect(newPosition.y).not.toBe(initialPosition.y);

    await canvasPage.editNoteContent('Test Note');

    // Assert the note content
    const noteContent = canvasPage.note.locator('.note-content');
    await expect(noteContent).toHaveText('Test Note');

    await canvasPage.selectNote();
    await canvasPage.deleteNote();

    // Assert the note is deleted
    const noteCount = await page.locator('.note').count();
    expect(noteCount).toBe(0);
  });
});
