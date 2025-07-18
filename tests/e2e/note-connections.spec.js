import { test, expect } from '@playwright/test';

class CanvasPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.svgContainer = page.locator('#svg-container');
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

  async hoverNote(note) {
    await note.hover();
    // Wait for ghost connectors to appear
    const ghostConnector = note.locator('.ghost-connector').first();
    await ghostConnector.waitFor({ state: 'visible' });
  }

  async connectNotes(sourceNote, targetNote) {
    // Hover over source note to reveal ghost connectors
    await this.hoverNote(sourceNote);

    // Get the ghost connector (using right connector as it's commonly used)
    const ghostConnector = sourceNote.locator('.ghost-connector.right');
    await expect(ghostConnector).toBeVisible();

    // Use dragTo method instead of manual mouse movements
    await ghostConnector.dragTo(targetNote);

    // Small delay to allow connection creation
    await this.page.waitForTimeout(100);
  }

  async verifyConnection(sourceNote, targetNote) {
    // Get note IDs
    const sourceId = await sourceNote.getAttribute('id');
    const targetId = await targetNote.getAttribute('id');

    // Check for connection group in SVG container
    const connectionGroup = this.svgContainer.locator(
      `g[data-start="${sourceId}"][data-end="${targetId}"]`,
    );
    await expect(connectionGroup).toBeVisible();

    // Check for connection path within the group (exists but may be hidden)
    const connectionPath = connectionGroup.locator('path');
    await expect(connectionPath).toBeAttached(); // Just check it exists, not necessarily visible

    return { sourceId, targetId, connectionGroup };
  }
}

test.describe('MindMeld Note Connections', () => {
  test('Create two notes and connect them', async ({ page }) => {
    const canvasPage = new CanvasPage(page);

    // Load the application
    await canvasPage.load();

    // Create first note at position (400, 300)
    const note1 = await canvasPage.createNoteAt(400, 300);

    // Wait for throttle to clear (500ms + buffer due to throttled double-click handler)
    await page.waitForTimeout(600);

    // Create second note at position (700, 300)
    const note2 = await canvasPage.createNoteAt(700, 300);

    // Verify both notes are created
    await expect(note1).toBeVisible();
    await expect(note2).toBeVisible();

    // Verify we have 2 notes
    const totalNotes = await page.locator('.note').count();
    expect(totalNotes).toBe(2);

    // Connect the notes
    await canvasPage.connectNotes(note1, note2);

    // Verify connection was created
    const connection = await canvasPage.verifyConnection(note1, note2);

    // Additional verification - check connection attributes
    expect(connection.sourceId).toBeTruthy();
    expect(connection.targetId).toBeTruthy();
    expect(connection.sourceId).not.toBe(connection.targetId);
  });
});
