/**
 * E2E Critical Tests - Accessibility & Regression
 *
 * Tests for accessibility compliance and known regression scenarios.
 * These test cross-cutting concerns that affect the entire application.
 *
 * Target: 5 tests covering critical user accessibility and known issues
 */

import { test, expect } from '@playwright/test';
import { CanvasPage } from '../helpers/CanvasPage.js';

test.describe('Critical Accessibility & Regression @critical', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('App starts cleanly and creates notes', async () => {
    // Regression Test: App should start reliably and handle basic operations

    // 1. Verify app loads without errors
    await canvasPage.waitForAppReady();

    // 2. Verify initial state is clean
    const notes = canvasPage.page.locator('.note');
    const noteCount = await notes.count();
    expect(noteCount).toBe(0);

    // 3. User should be able to create notes
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.editNoteContent('Smoke test note', note);

    // 4. Verify content using proper method
    const noteContent = note.locator('.note-content');
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      await expect(noteContent).toHaveValue('Smoke test note');
    } else {
      await expect(noteContent).toHaveText('Smoke test note');
    }
  });

  test('Color picker accessibility compliance', async () => {
    // Accessibility Test: Color picker should be keyboard accessible

    // 1. Verify color picker has proper accessibility
    await canvasPage.verifyColorPickerVisible();
    await canvasPage.verifyColorPickerAccessibility();

    // 2. Test keyboard navigation
    await canvasPage.focusColorSwatch('yellow');
    await canvasPage.selectColorWithKeyboard('Enter');

    // 3. Verify selection works
    const activeColor = await canvasPage.getActiveColor();
    expect(activeColor).toBe('yellow');

    // 4. Test that colors apply to notes
    await canvasPage.selectColor('blue');
    const noteWithColor = await canvasPage.createNote(400, 300);
    await canvasPage.verifyNoteColor(noteWithColor, 'blue');
  });

  test('Kebab menu accessibility and functionality', async () => {
    // Integration Test: Menu should be accessible and functional

    // 1. Create a note first
    await canvasPage.createNote(400, 300);
    await canvasPage.page.keyboard.type('Menu test note');
    await canvasPage.page.mouse.click(100, 100);
    await canvasPage.waitForAppReady();

    // 2. Open kebab menu
    const kebabButton = canvasPage.page.locator('#kebab-menu-button');
    await expect(kebabButton).toBeVisible();
    await kebabButton.click();

    // 3. Verify menu accessibility
    const menu = canvasPage.page.locator('#kebab-context-menu');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('role', 'menu');

    // 4. Verify menu items are accessible
    const menuItems = canvasPage.page.locator('.kebab-menu-item');
    const itemCount = await menuItems.count();
    expect(itemCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(itemCount, 3); i++) {
      const item = menuItems.nth(i);
      await expect(item).toHaveAttribute('role', 'menuitem');
      await expect(item).toHaveAttribute('tabindex', '0');
    }

    // 5. Close menu with Escape key
    await canvasPage.page.keyboard.press('Escape');
    await expect(menu).not.toHaveClass(/open/);
  });
});
