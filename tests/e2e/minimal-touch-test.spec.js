import { test, expect } from '@playwright/test';

test.describe('Minimal Touch Test - From Scratch', () => {
  test('Touch tap should select note (minimal approach)', async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    // Use mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Load app with touch mode parameter (known working approach)
    await page.goto('http://localhost:8080/?mode=touch');

    // Wait for app to be ready
    await expect(page.locator('#canvas')).toBeVisible();
    await page.waitForTimeout(1000);

    // Create note with double-tap (simplest working pattern)
    await page.touchscreen.tap(300, 200);
    await page.waitForTimeout(100);
    await page.touchscreen.tap(300, 200);
    await page.waitForTimeout(500);

    // Type some text
    await page.keyboard.type('Touch Test');
    // Exit edit mode by tapping on canvas (proper touch behavior)
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(300);

    // Verify note exists
    const note = page.locator('.note').first();
    await expect(note).toBeVisible();

    // Single tap to select
    const noteBox = await note.boundingBox();
    await page.touchscreen.tap(noteBox.x + 50, noteBox.y + 20);
    await page.waitForTimeout(200);

    // Check if note has selected class
    const noteClasses = await note.getAttribute('class');
    console.log('Note classes after tap:', noteClasses);

    // Pass/fail based on selection
    const isSelected = noteClasses?.includes('selected');
    console.log('Touch selection result:', isSelected ? 'SUCCESS' : 'FAILED');

    expect(isSelected).toBe(true);
  });
});
