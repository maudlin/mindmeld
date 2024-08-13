// tests/simplified-create-note.spec.js
import { test, expect } from '@playwright/test';

test.describe('Simplified Note Creation', () => {
  test('Create a single note', async ({ page }) => {
    console.log('Starting test: Create a single note');

    await page.goto('http://localhost:8080');
    console.log('Navigated to application');

    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
    console.log('Canvas is visible');

    const initialCount = await page.locator('.note').count();
    console.log(`Initial note count: ${initialCount}`);

    const canvasBounds = await canvas.boundingBox();
    console.log(`Canvas bounds: ${JSON.stringify(canvasBounds)}`);

    const clickX = canvasBounds.x + canvasBounds.width / 2;
    const clickY = canvasBounds.y + canvasBounds.height / 2;
    console.log(`Clicking at: (${clickX}, ${clickY})`);

    await page.mouse.dblclick(clickX, clickY);
    console.log('Double-clicked on canvas');

    await page.waitForTimeout(1000);
    console.log('Waited for 1 second');

    const afterClickCount = await page.locator('.note').count();
    console.log(`Note count after click: ${afterClickCount}`);

    const note = page.locator('.note');
    const noteCount = await note.count();
    console.log(`Final note count: ${noteCount}`);

    if (noteCount > 0) {
      const isVisible = await note.first().isVisible();
      console.log(`Is note visible: ${isVisible}`);

      const noteContent = await note.first().textContent();
      console.log(`Note content: ${noteContent}`);

      const noteBounds = await note.first().boundingBox();
      console.log(`Note bounds: ${JSON.stringify(noteBounds)}`);
    }

    expect(noteCount).toBeGreaterThan(0);
    console.log('Test completed');
  });
});
