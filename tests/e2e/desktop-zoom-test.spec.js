import { test, expect } from '@playwright/test';

test.describe('Desktop Zoom Functionality', () => {
  test('Desktop wheel zoom should work', async ({ page }) => {
    await page.goto('http://localhost:8080'); // No touch mode
    await expect(page.locator('#canvas')).toBeVisible();

    const canvas = page.locator('#canvas');
    const zoomDisplay = page.locator('#zoom-display');

    // Get initial zoom level
    const initialZoom = await zoomDisplay.textContent();
    console.log(`Desktop initial zoom: ${initialZoom}`);

    // Test mouse wheel zoom
    await canvas.hover({ position: { x: 400, y: 300 } });
    await page.mouse.wheel(0, -120); // Scroll up to zoom in
    await expect(zoomDisplay).not.toHaveText(initialZoom);

    const newZoom = zoomDisplay;
    console.log(`Desktop after wheel zoom: ${newZoom}`);

    // Zoom level should have changed
    await expect(newZoom).not.toHaveText(initialZoom);

    console.log('✅ Desktop wheel zoom working');
  });
});
