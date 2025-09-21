// tests/e2e/yjs-integration.spec.js
// Integration test for YjsProvider with feature flags enabled

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('YjsProvider Integration with Feature Flags', () => {
  test('should load app successfully with YjsProvider enabled', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    // Navigate to the app
    await page.goto('http://localhost:8080');

    // Wait for app to load
    await page.waitForLoadState('domcontentloaded');

    // Check that the app loaded successfully (canvas should be visible)
    await expect(canvasPage.canvas).toBeVisible();

    // Create a note to test basic functionality using proper helper with center position
    await canvasPage.createNote(640, 400);

    // Check that note was created successfully
    const noteCount = await canvasPage.notes.count();
    expect(noteCount).toBe(1);

    console.log(
      '✅ YjsProvider integration test passed - app works with compatibility layer',
    );
  });

  test('should handle YjsProvider in offline mode', async ({ page }) => {
    const canvasPage = new CanvasPage(page);

    // Monitor console logs for YjsProvider messages
    const logs = [];
    page.on('console', (msg) => {
      if (msg.text().includes('YjsProvider')) {
        logs.push(msg.text());
      }
    });

    await page.goto('http://localhost:8080');
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit for any provider initialization
    await page.waitForTimeout(1000);

    // Test basic functionality using proper helper with center position
    await canvasPage.createNote(640, 400);

    // Test export functionality (this tests YjsProvider's export methods)
    await page.keyboard.press('Escape'); // Clear any focus
    await canvasPage.kebabMenuButton.click();
    await page.locator('[data-action="export-file"]').click();

    // The export should trigger without errors
    console.log('YjsProvider console logs:', logs);

    // Should not have any error logs
    const errorLogs = logs.filter((log) => log.toLowerCase().includes('error'));
    expect(errorLogs.length).toBe(0);

    console.log('✅ YjsProvider offline mode test passed');
  });
});
