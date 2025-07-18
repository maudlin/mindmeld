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
    await this.page.mouse.dblclick(x, y);
    // Wait for note to appear and get the newly created note
    const notes = this.page.locator('.note');
    await notes.first().waitFor({ state: 'visible' });
    const noteCount = await notes.count();
    const newNote = notes.nth(noteCount - 1);
    await expect(newNote).toBeVisible();
    return newNote;
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

    // Get positions for drag operation
    const sourceConnectorBox = await ghostConnector.boundingBox();
    const targetNoteBox = await targetNote.boundingBox();

    // Drag from ghost connector to target note center
    await this.page.mouse.move(
      sourceConnectorBox.x + sourceConnectorBox.width / 2,
      sourceConnectorBox.y + sourceConnectorBox.height / 2,
    );
    await this.page.mouse.down();

    // Move to target note center
    await this.page.mouse.move(
      targetNoteBox.x + targetNoteBox.width / 2,
      targetNoteBox.y + targetNoteBox.height / 2,
    );
    await this.page.mouse.up();

    // Wait for connection to be created
    await this.svgContainer
      .locator('g[data-start][data-end]')
      .first()
      .waitFor({ state: 'visible' });
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

    // Check for connection path within the group
    const connectionPath = connectionGroup.locator('path');
    await expect(connectionPath).toBeVisible();

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

    // Create second note at position (700, 300)
    const note2 = await canvasPage.createNoteAt(700, 300);

    // Verify both notes are created
    await expect(note1).toBeVisible();
    await expect(note2).toBeVisible();

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
