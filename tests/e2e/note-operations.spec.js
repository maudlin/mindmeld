import { test, expect } from '@playwright/test';

class CanvasPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.note = page.locator('.note').first();
  }

  async load() {
    await this.page.goto('http://localhost:8080');
    await expect(this.canvas).toBeVisible();
  }

  async createNote() {
    await this.page.mouse.dblclick(640, 388);
    await expect(this.note).toBeVisible();
  }

  async selectNote() {
    await this.note.click({ position: { x: 3, y: 3 } });
    await expect(this.note).toHaveClass(/selected/);
  }

  async moveNote() {
    const initialPosition = await this.note.boundingBox();
    await this.page.mouse.move(initialPosition.x + 5, initialPosition.y + 5);
    await this.page.mouse.down();
    await this.page.mouse.move(
      initialPosition.x + 105,
      initialPosition.y + 105,
    );
    await this.page.mouse.up();
    return initialPosition;
  }

  async editNoteContent(text) {
    const noteContent = this.note.locator('.note-content');
    await noteContent.click();
    await this.page.keyboard.type(text);
    await expect(noteContent).toHaveText(text);
  }

  async deleteNote() {
    await this.page.keyboard.press('Delete');
    const noteCount = await this.page.locator('.note').count();
    expect(noteCount).toBe(0);
  }
}

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
