import { test, expect } from '@playwright/test';
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

test.describe('MindMeld Note Connections', () => {
  test('Create two notes and connect them @smoke @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load the application
    await canvasPage.load();

    // Create first note
    const note1 = await canvasPage.createNote(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );

    // Wait for throttle and create second note
    await page.waitForTimeout(800);
    const note2 = await canvasPage.createNote(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );

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

  // TODO: Add connection deletion test
  // This should test: create connection → hover → context menu → delete → verify deletion
  // Connection deletion UI needs to be investigated for proper selectors and visibility
});
