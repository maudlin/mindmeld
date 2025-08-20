import { test, expect } from '@playwright/test';
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

test.describe('Touch Connection Context Menu', () => {
  test('should show context menu when tapping on connection line in touch mode', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load in touch mode to ensure TouchAdapter is active
    await canvasPage.load('touch');

    // Create two notes and connect them
    const note1 = await canvasPage.createNoteWithThrottleWait(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    const note2 = await canvasPage.createNoteWithThrottleWait(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );

    // Create connection between notes
    await canvasPage.connectNotes(note1, note2);

    // Verify connection exists
    const connection = page.locator('g[data-start][data-end]');
    await expect(connection).toBeAttached();

    // Find connection hotspot or path element
    const connectionHotspot = connection.locator('.connector-hotspot');
    const connectionPath = connection.locator('path');

    // Try tapping on hotspot first (if it exists)
    const hotspotCount = await connectionHotspot.count();
    if (hotspotCount > 0) {
      await connectionHotspot.first().tap();
    } else {
      // Fallback to tapping on path
      await connectionPath.first().tap();
    }

    // Verify context menu appears
    const contextMenu = page.locator('.context-menu');
    await expect(contextMenu).toBeVisible({ timeout: 2000 });

    // Verify context menu contains expected items
    const deleteButton = contextMenu.locator('.menu-item[data-type="delete"]');
    const cycleButton = contextMenu.locator('.menu-item[data-type="cycle"]');

    await expect(deleteButton).toBeVisible();
    await expect(cycleButton).toBeVisible();
  });

  test('should show context menu on hover in desktop mode', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Load in desktop mode
    await canvasPage.load();

    // Create two notes and connect them
    const note1 = await canvasPage.createNoteWithThrottleWait(
      TestCoordinates.note1.x,
      TestCoordinates.note1.y,
    );
    const note2 = await canvasPage.createNoteWithThrottleWait(
      TestCoordinates.note2.x,
      TestCoordinates.note2.y,
    );

    // Create connection between notes
    await canvasPage.connectNotes(note1, note2);

    // Verify connection exists
    const connection = page.locator('g[data-start][data-end]');
    await expect(connection).toBeAttached();

    // Hover over connection hotspot (desktop behavior)
    const connectionHotspot = connection.locator('.connector-hotspot');
    const connectionPath = connection.locator('path');

    // Try hovering on hotspot first (if it exists)
    const hotspotCount = await connectionHotspot.count();
    if (hotspotCount > 0) {
      await connectionHotspot.first().hover();
    } else {
      // Fallback to hovering on path
      await connectionPath.first().hover();
    }

    // Verify context menu appears on hover in desktop mode
    const contextMenu = page.locator('.context-menu');
    await expect(contextMenu).toBeVisible({ timeout: 2000 });
  });
});
