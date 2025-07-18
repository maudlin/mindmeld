import { test, expect } from '@playwright/test';

class CanvasPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.selectionBox = page.locator('#selection-box');
  }

  async load() {
    await this.page.goto('http://localhost:8080');
    await expect(this.canvas).toBeVisible();
  }

  async createNoteAt(x, y) {
    const noteCountBefore = await this.page.locator('.note').count();

    await this.page.mouse.dblclick(x, y);
    await this.page.waitForTimeout(100); // Small delay for note creation

    // Wait for new note to be created
    await this.page.waitForFunction(
      (count) => document.querySelectorAll('.note').length > count,
      noteCountBefore,
      { timeout: 2000 },
    );

    // Get the newly created note (at the count index)
    const note = this.page.locator('.note').nth(noteCountBefore);
    await expect(note).toBeVisible();
    return note;
  }

  async createSelectionBox(startX, startY, endX, endY) {
    // Clear any existing selections first
    await this.page.mouse.click(100, 100); // Click on empty area
    await this.page.waitForTimeout(100);

    // Start dragging from empty canvas area using absolute coordinates
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down({ button: 'left' });

    // Drag to create selection box
    await this.page.mouse.move(endX, endY, { steps: 10 });

    // Release mouse to complete selection
    await this.page.mouse.up({ button: 'left' });

    // Wait for selection to be processed
    await this.page.waitForTimeout(300);
  }

  async getSelectedNotes() {
    return this.page.locator('.note.selected');
  }

  async moveSelectedNotes(deltaX, deltaY) {
    // Get first selected note to drag
    const selectedNotes = await this.getSelectedNotes();
    const selectedNote = selectedNotes.first();
    await expect(selectedNote).toBeVisible();

    // Get initial position
    const initialBox = await selectedNote.boundingBox();

    // Drag the note (this will move all selected notes)
    await selectedNote.hover();
    await this.page.mouse.move(
      initialBox.x + initialBox.width / 2,
      initialBox.y + initialBox.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      initialBox.x + initialBox.width / 2 + deltaX,
      initialBox.y + initialBox.height / 2 + deltaY,
    );
    await this.page.mouse.up();

    // Wait for movement to complete
    await this.page.waitForTimeout(100);
  }

  async verifyNotesSelected(expectedCount) {
    const selectedNotes = await this.getSelectedNotes();
    const count = await selectedNotes.count();
    expect(count).toBe(expectedCount);
    return selectedNotes;
  }

  async verifyNotePositions(notes, expectedPositions) {
    const noteCount = await notes.count();
    expect(noteCount).toBe(expectedPositions.length);

    for (let i = 0; i < noteCount; i++) {
      const note = notes.nth(i);
      const box = await note.boundingBox();
      const expected = expectedPositions[i];

      // Allow for small positioning differences (within 5px tolerance)
      expect(Math.abs(box.x - expected.x)).toBeLessThan(5);
      expect(Math.abs(box.y - expected.y)).toBeLessThan(5);
    }
  }
}

test.describe('MindMeld Multi-Select Notes', () => {
  test('Create multiple notes and select them with selection box', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load the application
    await canvasPage.load();

    // Create notes using coordinates similar to the working test
    // Create first note at position (500, 300)
    const note1 = await canvasPage.createNoteAt(500, 300);

    // Wait for throttle to clear (500ms + buffer due to throttled double-click handler)
    await page.waitForTimeout(600);

    // Create second note at position (700, 300)
    const note2 = await canvasPage.createNoteAt(700, 300);

    // Wait for throttle to clear
    await page.waitForTimeout(600);

    // Create third note at position (600, 500)
    const note3 = await canvasPage.createNoteAt(600, 500);

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

    // Create notes in a pattern
    const note1 = await canvasPage.createNoteAt(300, 300);
    await page.waitForTimeout(600);

    const note2 = await canvasPage.createNoteAt(500, 300);
    await page.waitForTimeout(600);

    const note3 = await canvasPage.createNoteAt(400, 450);
    await page.waitForTimeout(600);

    const note4 = await canvasPage.createNoteAt(600, 450);

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

    // Create notes in different areas
    const note1 = await canvasPage.createNoteAt(200, 200); // Top-left
    await page.waitForTimeout(600);

    const note2 = await canvasPage.createNoteAt(400, 200); // Top-right
    await page.waitForTimeout(600);

    const note3 = await canvasPage.createNoteAt(200, 400); // Bottom-left
    await page.waitForTimeout(600);

    const note4 = await canvasPage.createNoteAt(400, 400); // Bottom-right

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
