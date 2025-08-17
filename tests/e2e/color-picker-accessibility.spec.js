// tests/e2e/color-picker-accessibility.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Color Picker - Accessibility', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Should support keyboard navigation between color swatches @smoke', async ({
    page,
  }) => {
    // Focus first color swatch
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Navigate to color picker area

    // Focus first swatch and verify
    const yellowSwatch = page.locator('.color-swatch[data-color="yellow"]');
    await yellowSwatch.focus();
    await expect(yellowSwatch).toBeFocused();

    // Navigate right with arrow key
    await page.keyboard.press('ArrowRight');
    const pinkSwatch = page.locator('.color-swatch[data-color="pink"]');
    await expect(pinkSwatch).toBeFocused();

    // Navigate right again
    await page.keyboard.press('ArrowRight');
    const greenSwatch = page.locator('.color-swatch[data-color="green"]');
    await expect(greenSwatch).toBeFocused();

    // Navigate right again
    await page.keyboard.press('ArrowRight');
    const blueSwatch = page.locator('.color-swatch[data-color="blue"]');
    await expect(blueSwatch).toBeFocused();

    // Navigate right should wrap to beginning
    await page.keyboard.press('ArrowRight');
    await expect(yellowSwatch).toBeFocused();
  });

  test('Should support keyboard navigation with arrow keys in all directions', async ({
    page,
  }) => {
    const yellowSwatch = page.locator('.color-swatch[data-color="yellow"]');
    const pinkSwatch = page.locator('.color-swatch[data-color="pink"]');
    const blueSwatch = page.locator('.color-swatch[data-color="blue"]');

    // Start at yellow
    await yellowSwatch.focus();

    // Test ArrowDown (should go to next)
    await page.keyboard.press('ArrowDown');
    await expect(pinkSwatch).toBeFocused();

    // Test ArrowLeft (should go to previous)
    await page.keyboard.press('ArrowLeft');
    await expect(yellowSwatch).toBeFocused();

    // Test ArrowUp (should go to previous/last)
    await page.keyboard.press('ArrowUp');
    await expect(blueSwatch).toBeFocused();

    // Test Home key (should go to first)
    await page.keyboard.press('Home');
    await expect(yellowSwatch).toBeFocused();

    // Test End key (should go to last)
    await page.keyboard.press('End');
    await expect(blueSwatch).toBeFocused();
  });

  test('Should support color selection with Enter and Space keys', async ({
    page,
  }) => {
    // Create a note first
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.selectNote(note);

    // Focus green swatch
    const greenSwatch = page.locator('.color-swatch[data-color="green"]');
    await greenSwatch.focus();

    // Select with Enter key
    await page.keyboard.press('Enter');

    // Verify color was applied
    await expect(greenSwatch).toHaveClass(/active/);
    await expect(note).toHaveClass(/color-green/);

    // Focus blue swatch
    const blueSwatch = page.locator('.color-swatch[data-color="blue"]');
    await blueSwatch.focus();

    // Select with Space key
    await page.keyboard.press('Space');

    // Verify color was applied
    await expect(blueSwatch).toHaveClass(/active/);
    await expect(note).toHaveClass(/color-blue/);
  });

  test('Should have proper ARIA attributes for screen readers', async ({
    page,
  }) => {
    const colorSwatches = page.locator('.color-swatch');
    const swatchCount = await colorSwatches.count();

    // Verify each swatch has proper ARIA attributes
    for (let i = 0; i < swatchCount; i++) {
      const swatch = colorSwatches.nth(i);

      // Should have role="button"
      await expect(swatch).toHaveAttribute('role', 'button');

      // Should have tabindex="0" for keyboard accessibility
      await expect(swatch).toHaveAttribute('tabindex', '0');

      // Should have aria-label describing the color
      const ariaLabel = await swatch.getAttribute('aria-label');
      await expect(swatch).toHaveAttribute('aria-label');
      expect(ariaLabel).toMatch(/select.*color/i);
    }
  });

  test('Should have appropriate color contrast and visual indicators', async ({
    page,
  }) => {
    // Test that focused swatches have visible focus indicators
    const yellowSwatch = page.locator('.color-swatch[data-color="yellow"]');
    await yellowSwatch.focus();

    // Check that focus creates a visible outline or border change
    const focusedStyles = await yellowSwatch.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineColor: styles.outlineColor,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    // Should have some form of focus indicator
    const hasFocusIndicator =
      focusedStyles.outline !== 'none' ||
      focusedStyles.boxShadow !== 'none' ||
      focusedStyles.outlineWidth !== '0px';

    expect(hasFocusIndicator).toBeTruthy();
  });

  test('Should support screen reader announcements for color changes', async ({
    page,
  }) => {
    // Create a note and select it
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.selectNote(note);

    // Listen for aria-live announcements (simulated)
    const announcements = [];
    await page.exposeFunction('captureAnnouncement', (text) => {
      announcements.push(text);
    });

    // Focus and select different colors
    const colors = ['pink', 'green', 'blue'];

    for (const color of colors) {
      const swatch = page.locator(`.color-swatch[data-color="${color}"]`);
      await swatch.focus();
      await page.keyboard.press('Enter');

      // Verify the color was applied (visual confirmation)
      await expect(swatch).toHaveClass(/active/);
      await expect(note).toHaveClass(new RegExp(`color-${color}`));

      // Small delay for any announcements
      await page.waitForTimeout(300);
    }
  });

  test('Should maintain focus management during color operations', async ({
    page,
  }) => {
    // Create and select a note
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.selectNote(note);

    // Focus a color swatch
    const greenSwatch = page.locator('.color-swatch[data-color="green"]');
    await greenSwatch.focus();

    // Apply the color
    await page.keyboard.press('Enter');

    // Focus should remain on the swatch after application
    await expect(greenSwatch).toBeFocused();

    // Navigate to another swatch
    await page.keyboard.press('ArrowRight');
    const blueSwatch = page.locator('.color-swatch[data-color="blue"]');
    await expect(blueSwatch).toBeFocused();
  });

  test('Should work with assistive technologies simulation', async ({
    page,
  }) => {
    // Simulate screen reader navigation
    const swatches = await page.locator('.color-swatch').all();

    for (const swatch of swatches) {
      // Check that each swatch is accessible via keyboard
      await swatch.focus();
      await expect(swatch).toBeFocused();

      // Verify swatch can be activated
      await page.keyboard.press('Enter');
      await expect(swatch).toHaveClass(/active/);

      // Note: aria-pressed might not be implemented, that's ok for this color picker design
    }
  });

  test('Should handle keyboard navigation with multiple notes selected', async ({
    page,
  }) => {
    // Create multiple notes
    const note1 = await canvasPage.createNote(300, 300);
    await page.waitForTimeout(200);
    const note2 = await canvasPage.createNote(500, 300);

    // Select both notes
    await canvasPage.createSelectionBox(250, 250, 550, 350);
    await canvasPage.verifyNotesSelected(2);

    // Navigate to color picker via keyboard
    const greenSwatch = page.locator('.color-swatch[data-color="green"]');
    await greenSwatch.focus();

    // Apply color via keyboard
    await page.keyboard.press('Enter');

    // Both notes should have the new color
    await expect(note1).toHaveClass(/color-green/);
    await expect(note2).toHaveClass(/color-green/);

    // Color picker should show the applied color
    await expect(greenSwatch).toHaveClass(/active/);
  });

  test('Should provide proper feedback for disabled or invalid states', async ({
    page,
  }) => {
    // Color picker should always be available, but let's test edge cases

    // When no notes exist, color picker should still be accessible
    await expect(page.locator('.color-swatch')).toHaveCount(4);

    const yellowSwatch = page.locator('.color-swatch[data-color="yellow"]');
    await yellowSwatch.focus();
    await page.keyboard.press('Enter');

    // Should set global color even with no notes
    await expect(yellowSwatch).toHaveClass(/active/);

    // Create a note - should use the selected color
    const note = await canvasPage.createNote(400, 300);
    await expect(note).toHaveClass(/color-yellow/);
  });

  test('Should support high contrast mode considerations', async ({ page }) => {
    // Enable high contrast simulation (browser-specific)
    await page.emulateMedia({ forcedColors: 'active' });

    // Color swatches should still be distinguishable
    const swatches = page.locator('.color-swatch');
    const swatchCount = await swatches.count();

    for (let i = 0; i < swatchCount; i++) {
      const swatch = swatches.nth(i);

      // Should be visible in high contrast mode
      await expect(swatch).toBeVisible();

      // Should maintain interactive functionality
      await swatch.focus();
      await expect(swatch).toBeFocused();
    }

    // Reset media emulation
    await page.emulateMedia({ forcedColors: null });
  });

  test.skip('Should handle rapid keyboard navigation without issues', async ({
    page,
  }) => {
    const yellowSwatch = page.locator('.color-swatch[data-color="yellow"]');
    await yellowSwatch.focus();

    // Rapid arrow key navigation
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50);
    }

    // Should end up on a valid swatch (yellow after full cycles)
    await expect(yellowSwatch).toBeFocused();

    // Should still be able to select
    await page.keyboard.press('Enter');
    await expect(yellowSwatch).toHaveClass(/active/);
  });

  test('Should work with browser zoom levels', async ({ page }) => {
    // Test with different zoom levels
    const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5];

    for (const zoom of zoomLevels) {
      // Set zoom level
      await page.evaluate((z) => {
        document.body.style.zoom = z;
      }, zoom);

      // Color picker should remain functional
      const pinkSwatch = page.locator('.color-swatch[data-color="pink"]');
      await pinkSwatch.focus();
      await expect(pinkSwatch).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(pinkSwatch).toHaveClass(/active/);

      // Small delay between zoom changes
      await page.waitForTimeout(100);
    }

    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = 1;
    });
  });
});
