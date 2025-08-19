import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Delete Button Interactions', () => {
  test('Should delete note via left-click on delete button @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load the page and create a note
    await canvasPage.load();
    await canvasPage.createNote();

    // Verify note exists
    const note = page.locator('.note').first();
    await expect(note).toBeVisible();

    // Select the note to show the delete button
    await note.click({ position: { x: 3, y: 3 } });
    await expect(note).toHaveClass(/selected/);

    // Wait for delete button to appear
    const deleteButton = note.locator('.shared-delete-button--note');
    await expect(deleteButton).toBeVisible();

    // Click the delete button with left click
    await deleteButton.click({ button: 'left' });

    // Verify note is deleted
    await expect(note).toBeHidden();
    const noteCount = await page.locator('.note').count();
    expect(noteCount).toBe(0);
  });

  test('Should delete connection via left-click on delete button @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load the page and create two notes using helper methods
    await canvasPage.load();

    // Create first note using helper
    const firstNote = await canvasPage.createNote(500, 300);
    await page.waitForTimeout(800); // Throttle between note creations

    // Create second note using helper
    const secondNote = await canvasPage.createNote(700, 400);
    await page.waitForTimeout(800);

    // Verify both notes exist
    await expect(firstNote).toBeVisible();
    await expect(secondNote).toBeVisible();

    // Connect the notes using proper helper method
    await canvasPage.connectNotes(firstNote, secondNote);

    // Verify connection was created and get its details
    const connection = await canvasPage.verifyConnection(firstNote, secondNote);

    // Get the connection group element
    const connectionGroup = page.locator(
      `g[data-start="${connection.sourceId}"][data-end="${connection.targetId}"]`,
    );
    await expect(connectionGroup).toBeVisible();

    // Hover over the connection hotspot to show context menu
    const connectionHotspot = connectionGroup.locator('.connector-hotspot');
    await connectionHotspot.hover();

    // Wait for context menu to appear
    const contextMenu = connectionGroup.locator('.context-menu');
    await expect(contextMenu).toBeVisible();

    // Click the delete button in the context menu
    const connectionDeleteButton = contextMenu.locator(
      '.shared-delete-button--connection',
    );
    await expect(connectionDeleteButton).toBeVisible();
    await connectionDeleteButton.click({ button: 'left' });

    // Verify connection is deleted
    await expect(connectionGroup).toBeHidden();
    const connectionCount = await page.locator('.connection-group').count();
    expect(connectionCount).toBe(0);
  });

  test('Should handle delete button visibility states correctly', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load the page and create a note
    await canvasPage.load();
    await canvasPage.createNote();

    const note = page.locator('.note').first();
    const deleteButton = note.locator('.shared-delete-button--note');

    // Delete button should not be visible when note is not selected
    await expect(deleteButton).toBeHidden();

    // Select the note
    await note.click({ position: { x: 3, y: 3 } });
    await expect(note).toHaveClass(/selected/);

    // Delete button should be visible when note is selected
    await expect(deleteButton).toBeVisible();

    // Click elsewhere to deselect
    await page.mouse.click(500, 500); // Click on empty canvas
    await expect(note).not.toHaveClass(/selected/);

    // Delete button should be hidden when note is deselected
    await expect(deleteButton).toBeHidden();
  });
});
