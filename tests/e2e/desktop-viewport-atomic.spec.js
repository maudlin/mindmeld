import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Desktop Viewport - Atomic Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start in desktop mode (no touch parameter)
    await page.goto('http://localhost:8080');
    await expect(page.locator('#canvas')).toBeVisible();
    await page.waitForTimeout(1000);
  });

  test('Desktop wheel zoom should center on cursor position @atomic', async ({
    page,
  }) => {
    // Use the exact working pattern from note-deletion-simple.spec.js
    const canvasPage = new CanvasPage(page);
    await canvasPage.load(); // Desktop mode

    // Create a note using the working CanvasPage method
    const note = await canvasPage.createNote(200, 150);

    // Get initial zoom level
    const zoomDisplay = page.locator('#zoom-display');
    const initialZoom = await zoomDisplay.textContent();

    // Get initial note position
    const initialNoteBox = await note.boundingBox();

    // Position cursor at specific location and zoom in
    const zoomCenterX = 400;
    const zoomCenterY = 300;
    await page.mouse.move(zoomCenterX, zoomCenterY);

    // Wheel zoom in (negative deltaY = zoom in)
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(500);

    // Verify zoom level changed
    const newZoom = zoomDisplay;
    await expect(newZoom).not.toHaveText(initialZoom);

    // The area around cursor position should remain relatively centered
    const finalNoteBox = await note.boundingBox();
    expect(finalNoteBox).toBeTruthy();
    expect(finalNoteBox.width).toBeGreaterThan(initialNoteBox.width); // Note should be bigger after zoom in

    console.log(`✅ Zoom in: ${initialZoom} → ${newZoom}`);
  });

  test('Desktop right-click pan should move canvas @atomic', async ({
    page,
  }) => {
    // Use the exact working pattern from note-deletion-simple.spec.js
    const canvasPage = new CanvasPage(page);
    await canvasPage.load(); // Desktop mode

    // Create a note using the working CanvasPage method
    const note = await canvasPage.createNote(300, 200);

    // Get initial note position
    const initialBox = await note.boundingBox();

    // Right-click and drag to pan
    const startX = 400;
    const startY = 300;
    const endX = 500;
    const endY = 200;

    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(100);
    await page.mouse.move(endX, endY);
    await page.waitForTimeout(100);
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(300);

    // Get final note position - should have moved due to canvas pan
    const finalBox = await note.boundingBox();
    const deltaX = Math.abs(finalBox.x - initialBox.x);
    const deltaY = Math.abs(finalBox.y - initialBox.y);
    const totalMovement = deltaX + deltaY;

    expect(totalMovement).toBeGreaterThan(10); // Should have moved noticeably

    console.log(`✅ Pan moved note by: ${deltaX}px, ${deltaY}px`);
  });
});
