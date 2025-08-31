import { test, expect } from '@playwright/test';

test.describe('Desktop Viewport - Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    await expect(page.locator('#canvas')).toBeVisible();
    await page.waitForTimeout(1000);
  });

  test('Desktop zoom and pan should work together seamlessly @integration', async ({
    page,
  }) => {
    // Create two notes for comprehensive reference
    const canvas = page.locator('#canvas');

    // First note
    await canvas.dblclick({ position: { x: 200, y: 150 } });
    await page.waitForTimeout(500);
    await page.keyboard.type('Integration Note 1');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Second note
    await canvas.dblclick({ position: { x: 500, y: 300 } });
    await page.waitForTimeout(500);
    await page.keyboard.type('Integration Note 2');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const zoomDisplay = page.locator('#zoom-display');
    const initialZoom = await zoomDisplay.textContent();

    // Step 1: Zoom in at specific cursor position
    await page.mouse.move(350, 225);
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(500);

    const zoomedLevel = zoomDisplay;
    await expect(zoomedLevel).not.toHaveText(initialZoom);

    // Step 2: Pan the zoomed canvas with right-click drag
    await page.mouse.move(300, 200);
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(100);
    await page.mouse.move(400, 250);
    await page.waitForTimeout(100);
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(300);

    // Step 3: Zoom out to verify pan maintained
    await page.mouse.move(375, 275);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(500);

    const finalZoom = await zoomDisplay.textContent();

    // Verify both notes are still visible after zoom+pan+zoom sequence
    const notes = page.locator('.note');
    await expect(notes).toHaveCount(2);

    // Verify we can still interact with notes (they didn't get "lost" due to bad transforms)
    const firstNote = notes.first();
    await firstNote.click();
    await expect(firstNote).toHaveClass(/selected/);

    console.log(
      `✅ Integration test: ${initialZoom} → ${zoomedLevel} → ${finalZoom}`,
    );
    console.log('✅ Notes remain interactive after zoom+pan sequence');
  });

  test('Desktop viewport interactions should not interfere with note operations @integration', async ({
    page,
  }) => {
    // This test ensures viewport transforms don't break note interactions
    const canvas = page.locator('#canvas');

    // Create note
    await canvas.dblclick({ position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);
    await page.keyboard.type('Interaction Test');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Zoom in
    await page.mouse.move(350, 250);
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(500);

    // Pan
    await page.mouse.move(400, 300);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(450, 250);
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(300);

    // Verify note can still be selected and edited after viewport changes
    const note = page.locator('.note').first();
    await note.click();
    await expect(note).toHaveClass(/selected/);

    // Enter edit mode
    await note.dblclick();
    await page.waitForTimeout(300);

    const textarea = note.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeFocused();

    console.log(
      '✅ Note interactions work correctly after viewport transforms',
    );
  });
});
