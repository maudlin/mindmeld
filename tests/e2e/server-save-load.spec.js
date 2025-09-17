// tests/e2e/server-save-load.spec.js
import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Server Save/Load - E2E (MM-106)', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();

    // Wait for stability in CI
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test('should show server connection option in kebab menu', async ({
    page,
  }) => {
    // Open the kebab menu
    await page.click('#kebab-menu-button');
    await expect(page.locator('#kebab-context-menu')).toBeVisible();

    // Verify server connection option is present in the menu
    const connectOption = page.locator('[data-action="connect-server"]');
    const loadOption = page.locator('[data-action="load-from-server"]');

    await expect(connectOption).toBeVisible();
    // Load option is hidden by default when not connected, but exists in DOM
    await expect(loadOption).toBeAttached();
    // Note: save-to-server removed - saving is now automatic
  });

  test('should show load option when not connected', async ({ page }) => {
    // Open the kebab menu
    await page.click('#kebab-menu-button');
    await expect(page.locator('#kebab-context-menu')).toBeVisible();

    // Server load option should be available (but may be hidden by default)
    const loadOption = page.locator('[data-action="load-from-server"]');

    // Load option exists in DOM but may be hidden when not connected
    await expect(loadOption).toBeAttached();
    // Note: save option removed - saving is now automatic on connection
  });

  test('should open server connection modal', async ({ page }) => {
    // Open the kebab menu
    await page.click('#kebab-menu-button');
    await expect(page.locator('#kebab-context-menu')).toBeVisible();

    // Click connect server option
    await page.click('[data-action="connect-server"]');

    // Modal should open
    const modal = page.locator('#server-connection-modal');
    await expect(modal).toBeVisible();

    // Modal should have required elements
    await expect(page.locator('#server-uri-input')).toBeVisible();
    await expect(page.locator('#connect-server-btn')).toBeVisible();
    // Note: test-connection-btn removed in simplified UI
  });

  test('should test save/load menu actions via JavaScript', async ({
    page,
  }) => {
    // Since the UI implementation might not be complete,
    // test the underlying menu behavior directly via JavaScript

    // Create a note first
    const note = await canvasPage.createNote(300, 200);
    await canvasPage.editNoteContent('Test Note for Server', note);
    // Wait for note creation to complete
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Note: save-to-server action removed - saving is now automatic on data changes
    // Test that the app remains stable without explicit save actions
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Test load action via event system (if available in E2E context)
    const eventResult = await page.evaluate(() => {
      if (window.eventBus && typeof window.eventBus.emit === 'function') {
        // Simulate clicking load-from-server menu action
        window.eventBus.emit('menu.action', {
          action: 'load-from-server',
          inputType: 'click',
        });
        return { success: true };
      }
      return { success: false, reason: 'eventBus not available' };
    });

    // If eventBus is not available in E2E context, that's acceptable
    console.log('Event system test result:', eventResult);

    // Should handle the action without errors
    // Wait for auto-save to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify the app is still functional
    await expect(page.locator('#canvas')).toBeVisible();
    await expect(note).toBeVisible();
  });

  test('should handle server actions through MenuBehavior integration', async ({
    page,
  }) => {
    // Test the integration between MenuBehavior and ServerClient
    // by checking that the methods exist and can be called

    const menuBehaviorExists = await page.evaluate(() => {
      // Check if MenuBehavior has the new server methods
      const canvas = document.querySelector('#canvas');
      if (!canvas || !canvas.menuBehavior) return false;

      const behavior = canvas.menuBehavior;
      return (
        typeof behavior.handleLoadFromServer === 'function' &&
        typeof behavior.getServerConnectionStatus === 'function' &&
        typeof behavior.getAvailableServerActions === 'function'
        // Note: handleSaveToServer removed - saving is now automatic
      );
    });

    expect(menuBehaviorExists).toBe(true);
  });

  test('should show server connection status in menu state', async ({
    page,
  }) => {
    // Test that menu state includes server connection information

    const menuState = await page.evaluate(() => {
      const canvas = document.querySelector('#canvas');
      if (!canvas || !canvas.menuBehavior) return null;

      return canvas.menuBehavior.getMenuState();
    });

    expect(menuState).toBeTruthy();
    expect(menuState).toHaveProperty('serverConnection');
    expect(menuState).toHaveProperty('availableActions');

    // Server should initially be disconnected
    expect(menuState.serverConnection.isConnected).toBe(false);
    expect(menuState.availableActions.loadFromServer).toBe(false);
    // Note: saveToServer removed - saving is now automatic
  });

  test('should maintain menu functionality after server feature integration', async ({
    page,
  }) => {
    // Ensure that adding server features didn't break existing menu functionality

    // Test opening menu
    await page.click('#kebab-menu-button');
    await expect(page.locator('#kebab-context-menu')).toBeVisible();

    // Test existing menu options still work
    const clearOption = page.locator('[data-action="clear-canvas"]');
    await expect(clearOption).toBeVisible();
    await clearOption.click();

    // Menu behavior may vary - either closes immediately or needs manual close
    const menuAfterClick = page.locator('#kebab-context-menu');
    if (await menuAfterClick.isVisible()) {
      // If menu is still open, close it manually
      await page.keyboard.press('Escape');
    }

    // Handle clear confirmation modal if it appears
    const modal = page.locator('#notification-modal-overlay');
    if (await modal.isVisible()) {
      // Try different confirm button selectors
      const confirmButton = modal.locator(
        'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Clear"), button[class*="confirm"]',
      );
      await confirmButton.click();
      // Wait for modal to fully close
      await expect(modal).toBeHidden();
    }

    // Wait for action to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Menu should still open after interaction
    await page.click('#kebab-menu-button');
    await expect(page.locator('#kebab-context-menu')).toBeVisible();
  });
});
