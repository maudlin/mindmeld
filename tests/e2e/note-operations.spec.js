import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('MindMeld Operations', () => {
  test('Create, edit, move, and delete a note @smoke @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    await canvasPage.load(); // Now defaults to desktop mode
    const note = await canvasPage.createNote(640, 388); // Use shared method with throttling
    await canvasPage.selectNote(note);

    const initialPosition = await canvasPage.moveNote(note);
    const newPosition = await note.boundingBox();
    expect(newPosition.x).not.toBe(initialPosition.x);
    expect(newPosition.y).not.toBe(initialPosition.y);

    await canvasPage.editNoteContent('Test Note', note);

    // Assert the note content - handle both textarea (edit mode) and div (view mode)
    const noteContent = note.locator('.note-content');
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      await expect(noteContent).toHaveValue('Test Note');
    } else {
      await expect(noteContent).toHaveText('Test Note');
    }

    await canvasPage.selectNote(note);
    await canvasPage.deleteNote();

    // Assert the note is deleted
    const noteCount = await page.locator('.note').count();
    expect(noteCount).toBe(0);
  });
});
