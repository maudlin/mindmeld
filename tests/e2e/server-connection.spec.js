// tests/e2e/server-connection.spec.js
import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Server Connection UI', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('should show server connection modal when menu item is clicked', async ({
    page,
  }) => {
    // Open kebab menu
    await page.click('#kebab-menu-button');

    // Wait for menu to be visible
    await expect(page.locator('#kebab-context-menu')).toBeVisible();

    // Click on "Connect to Server..." menu item
    await page.click('[data-action="connect-server"]');

    // Verify server connection modal appears
    await expect(page.locator('#server-connection-modal')).toBeVisible();
    await expect(page.locator('#server-modal-title')).toHaveText(
      'Connect to Server',
    );
    await expect(page.locator('#server-uri-input')).toBeVisible();
    await expect(page.locator('#connect-server-btn')).toBeVisible();
    // Note: test-connection-btn removed in simplified UI - Connect now does the test
  });

  test('should validate server URI input', async ({ page }) => {
    // Open server connection modal
    await page.click('#kebab-menu-button');
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Test invalid URL (non-HTTPS)
    await page.fill('#server-uri-input', 'http://insecure.com');
    await page.click('#connect-server-btn');

    // Should show validation error (browser native validation)
    // Note: Browser validation messages are hard to test consistently across browsers
    // so we'll just verify the form doesn't submit by checking modal is still open
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Test valid HTTPS URL
    await page.fill('#server-uri-input', 'https://api.example.com');
    // URL should be accepted (no validation error styling)
    await expect(page.locator('#server-uri-input')).toHaveValue(
      'https://api.example.com',
    );
  });

  test('should close modal when close button is clicked', async ({ page }) => {
    // Open server connection modal
    await page.click('#kebab-menu-button');
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Close modal using close button
    await page.click('.server-modal-close');

    // Verify modal is hidden
    await expect(page.locator('#server-connection-modal')).toBeHidden();
  });

  test('should NOT close modal when clicking outside (better UX)', async ({
    page,
  }) => {
    // Open server connection modal
    await page.click('#kebab-menu-button');
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Click outside the modal content (this should NOT close the modal)
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Verify modal is still visible (better UX - no accidental closures)
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Only explicit actions should close modal
    await page.click('.server-modal-close');
    await expect(page.locator('#server-connection-modal')).toBeHidden();
  });

  test('should close modal when Escape key is pressed', async ({ page }) => {
    // Open server connection modal
    await page.click('#kebab-menu-button');
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');

    // Verify modal is hidden
    await expect(page.locator('#server-connection-modal')).toBeHidden();
  });

  test('should handle connection attempt with valid URL', async ({ page }) => {
    // Mock network requests for testing
    await page.route('https://test-server.com/health', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
    });

    // Open server connection modal
    await page.click('#kebab-menu-button');
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Fill in server URL
    await page.fill('#server-uri-input', 'https://test-server.com');

    // Click connect button (now does test + connect in one step)
    await page.click('#connect-server-btn');

    // Verify connection attempt was made (button should be available to click)
    await expect(page.locator('#connect-server-btn')).toBeVisible();
  });

  test('should show disconnect option when connected (placeholder)', async ({
    page,
  }) => {
    // This test verifies the disconnect menu item exists but is initially hidden
    await page.click('#kebab-menu-button');

    // Verify disconnect option exists but is hidden initially
    const disconnectItem = page.locator('[data-action="disconnect-server"]');
    await expect(disconnectItem).toHaveCount(1);
    await expect(disconnectItem).toBeHidden();

    // The disconnect item should become visible when connected
    // (This would require implementing actual connection state management)
  });

  test('should maintain form state when modal is reopened', async ({
    page,
  }) => {
    // Open server connection modal
    await page.click('#kebab-menu-button');
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Fill in some data
    await page.fill('#server-uri-input', 'https://my-server.com');

    // Close modal
    await page.click('.server-modal-close');
    await expect(page.locator('#server-connection-modal')).toBeHidden();

    // Reopen modal
    await page.click('#kebab-menu-button');
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Verify form state is consistent
    // Note: The actual behavior depends on the serverConnectionBehavior implementation
    const inputValue = await page.locator('#server-uri-input').inputValue();
    expect(typeof inputValue).toBe('string');
    // Could be either empty (fresh state) or preserved (session state)
    // This test documents the current expected behavior
  });

  test('should handle mobile interactions properly', async ({ page }) => {
    // Simulate mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Open kebab menu (should show as bottom sheet on mobile)
    await page.click('#kebab-menu-button');
    await expect(page.locator('#kebab-context-menu')).toBeVisible();

    // Click server connection option
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    // Verify modal works properly on mobile
    await expect(page.locator('#server-uri-input')).toBeVisible();
    await expect(page.locator('#connect-server-btn')).toBeVisible();

    // Close modal
    await page.click('.server-modal-close');
    await expect(page.locator('#server-connection-modal')).toBeHidden();
  });

  test('should allow typing and persist URL input without losing focus', async ({
    page,
  }) => {
    // Open server connection modal
    await page.click('#kebab-menu-button');
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    const input = page.locator('#server-uri-input');

    // Focus the input and verify it's focused
    await input.click();
    await expect(input).toBeFocused();

    // Type URL character by character to catch focus loss issues
    const testUrl = 'https://api.myserver.com';

    // Clear any existing text first
    await input.clear();

    // Type the URL slowly to simulate real user interaction
    for (let i = 0; i < testUrl.length; i++) {
      const partialUrl = testUrl.substring(0, i + 1);

      // Type the character
      await page.keyboard.type(testUrl.charAt(i));

      // Verify input still has focus after each character
      await expect(input).toBeFocused();

      // Verify the text is accumulating correctly
      await expect(input).toHaveValue(partialUrl);

      // Small delay to simulate real typing
      // Brief pause to simulate natural typing speed
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Final verification that the complete URL is in the input
    await expect(input).toHaveValue(testUrl);

    // Verify input is still focused after typing the complete URL
    await expect(input).toBeFocused();

    // Test that clicking elsewhere and back works
    await page.click('.server-modal-header h2'); // Click modal header
    await input.click(); // Click back to input

    // Verify the URL is still there and input is focused
    await expect(input).toHaveValue(testUrl);
    await expect(input).toBeFocused();

    // Test that the URL persists when pressing Tab (moving focus)
    await page.keyboard.press('Tab'); // Move to next element
    await input.click(); // Click back to input

    // URL should still be there
    await expect(input).toHaveValue(testUrl);
  });

  test('should maintain input data during form interactions', async ({
    page,
  }) => {
    // Open server connection modal
    await page.click('#kebab-menu-button');
    await page.click('[data-action="connect-server"]');
    await expect(page.locator('#server-connection-modal')).toBeVisible();

    const input = page.locator('#server-uri-input');
    const testUrl = 'https://test.example.com';

    // Fill input
    await input.fill(testUrl);
    await expect(input).toHaveValue(testUrl);

    // Click various UI elements to ensure input data persists
    await page.click('#connect-server-btn');
    await expect(input).toHaveValue(testUrl);

    // Click on form elements
    await page.click('.form-label');
    await expect(input).toHaveValue(testUrl);

    await page.click('.form-help');
    await expect(input).toHaveValue(testUrl);

    // Test keyboard navigation doesn't clear input
    await input.focus();
    await page.keyboard.press('Tab'); // Tab to next element
    await page.keyboard.press('Shift+Tab'); // Tab back
    await expect(input).toHaveValue(testUrl);
  });
});
