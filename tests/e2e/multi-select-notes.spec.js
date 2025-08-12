import { test, expect } from '@playwright/test';
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

test.describe('MindMeld Multi-Select Notes', () => {
  test('Create multiple notes and select them with selection box', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load the application
    await canvasPage.load();

    // Create notes using standard test coordinates
    const note1 = await canvasPage.createNoteViaJavaScript(500, 300);
    await page.waitForTimeout(800);
    const note2 = await canvasPage.createNoteViaJavaScript(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );
    await page.waitForTimeout(800);
    const note3 = await canvasPage.createNoteViaJavaScript(600, 500);

    // Verify all three notes are created
    await expect(note1).toBeVisible();
    await expect(note2).toBeVisible();
    await expect(note3).toBeVisible();

    // Verify we have 3 notes total
    const totalNotes = await page.locator('.note').count();
    expect(totalNotes).toBe(3);

    // Create selection box around first two notes (horizontal selection)
    // Use coordinates that encompass the first two notes but not the third
    // Make the box larger to ensure it fully contains the notes
    await canvasPage.createSelectionBox(400, 200, 800, 350);

    // Verify exactly 2 notes are selected
    await canvasPage.verifyNotesSelected(2);

    // Verify the third note is NOT selected
    await expect(note3).not.toHaveClass(/selected/);

    // Verify the first two notes ARE selected
    await expect(note1).toHaveClass(/selected/);
    await expect(note2).toHaveClass(/selected/);
  });

  test('Move selected notes as a group maintaining relative positions', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load the application
    await canvasPage.load();

    // Create notes in a pattern using standard coordinates
    const note1 = await canvasPage.createNoteViaJavaScript(300, 300);
    await page.waitForTimeout(800);
    const note2 = await canvasPage.createNoteViaJavaScript(500, 300);
    await page.waitForTimeout(800);
    const note3 = await canvasPage.createNoteViaJavaScript(400, 450);
    await page.waitForTimeout(800);
    const note4 = await canvasPage.createNoteViaJavaScript(600, 450);

    // Get initial positions
    const initial1 = await note1.boundingBox();
    const initial2 = await note2.boundingBox();
    const initial3 = await note3.boundingBox();
    const initial4 = await note4.boundingBox();

    // Select all notes with a large selection box
    await canvasPage.createSelectionBox(200, 200, 700, 550);

    // Verify all 4 notes are selected
    await canvasPage.verifyNotesSelected(4);

    // Move the selected notes by dragging one of them
    const moveX = 100;
    const moveY = 50;
    await canvasPage.moveSelectedNotes(moveX, moveY);

    // Verify all notes moved by the same amount (maintaining relative positions)
    const final1 = await note1.boundingBox();
    const final2 = await note2.boundingBox();
    const final3 = await note3.boundingBox();
    const final4 = await note4.boundingBox();

    // Check that each note moved by approximately the same delta
    expect(Math.abs(final1.x - initial1.x - moveX)).toBeLessThan(5);
    expect(Math.abs(final1.y - initial1.y - moveY)).toBeLessThan(5);

    expect(Math.abs(final2.x - initial2.x - moveX)).toBeLessThan(5);
    expect(Math.abs(final2.y - initial2.y - moveY)).toBeLessThan(5);

    expect(Math.abs(final3.x - initial3.x - moveX)).toBeLessThan(5);
    expect(Math.abs(final3.y - initial3.y - moveY)).toBeLessThan(5);

    expect(Math.abs(final4.x - initial4.x - moveX)).toBeLessThan(5);
    expect(Math.abs(final4.y - initial4.y - moveY)).toBeLessThan(5);

    // Verify relative positions are maintained
    const deltaX12 = final2.x - final1.x;
    const deltaY12 = final2.y - final1.y;
    const originalDeltaX12 = initial2.x - initial1.x;
    const originalDeltaY12 = initial2.y - initial1.y;

    expect(Math.abs(deltaX12 - originalDeltaX12)).toBeLessThan(5);
    expect(Math.abs(deltaY12 - originalDeltaY12)).toBeLessThan(5);
  });

  test('Partial selection - select only notes within selection box', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load the application
    await canvasPage.load();

    // Create notes in different areas using helper method
    const note1 = await canvasPage.createNoteViaJavaScript(200, 200); // Top-left
    await page.waitForTimeout(800);
    const note2 = await canvasPage.createNoteViaJavaScript(400, 200); // Top-right
    await page.waitForTimeout(800);
    const note3 = await canvasPage.createNoteViaJavaScript(200, 400); // Bottom-left
    await page.waitForTimeout(800);
    const note4 = await canvasPage.createNoteViaJavaScript(400, 400); // Bottom-right

    // Create selection box that only covers top two notes
    await canvasPage.createSelectionBox(100, 100, 500, 300);

    // Verify only the top two notes are selected
    await canvasPage.verifyNotesSelected(2);
    await expect(note1).toHaveClass(/selected/);
    await expect(note2).toHaveClass(/selected/);
    await expect(note3).not.toHaveClass(/selected/);
    await expect(note4).not.toHaveClass(/selected/);

    // Create a different selection box for bottom notes
    await canvasPage.createSelectionBox(100, 350, 500, 500);

    // Verify now only the bottom two notes are selected
    await canvasPage.verifyNotesSelected(2);
    await expect(note1).not.toHaveClass(/selected/);
    await expect(note2).not.toHaveClass(/selected/);
    await expect(note3).toHaveClass(/selected/);
    await expect(note4).toHaveClass(/selected/);
  });
});
