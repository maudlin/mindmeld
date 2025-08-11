import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Canvas Template Switching', () => {
  test('Switch between different canvas templates', async ({ page }) => {
    const canvasPage = new CanvasPage(page);

    // Step 1: Load and verify default template
    await canvasPage.load();
    await expect(canvasPage.canvasStyleMenuButton).toBeVisible();

    // Verify Standard Canvas is the default
    await canvasPage.verifyTemplate('Standard Canvas');

    // Step 2: Switch to Hero's Journey template
    await canvasPage.switchToTemplate("Hero's Journey");
    await canvasPage.verifyTemplate("Hero's Journey");
    await canvasPage.verifyTemplateCleanup('Standard Canvas');

    // Step 3: Switch to Now/Next/Future template
    await canvasPage.switchToTemplate('Now/Next/Future');
    await canvasPage.verifyTemplate('Now/Next/Future');
    await canvasPage.verifyTemplateCleanup("Hero's Journey");

    // Step 4: Switch to Wardley Map template
    await canvasPage.switchToTemplate('Wardley Map');
    await canvasPage.verifyTemplate('Wardley Map');
    await canvasPage.verifyTemplateCleanup('Now/Next/Future');

    // Step 5: Switch back to Standard Canvas
    await canvasPage.switchToTemplate('Standard Canvas');
    await canvasPage.verifyTemplate('Standard Canvas');
    await canvasPage.verifyTemplateCleanup('Wardley Map');
  });

  test('Template switching preserves dropdown functionality', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);

    await canvasPage.load();

    // Test multiple template switches to ensure dropdown remains functional
    const templates = [
      "Hero's Journey",
      'Now/Next/Future',
      'Standard Canvas',
      'Wardley Map',
    ];

    for (const templateName of templates) {
      await canvasPage.switchToTemplate(templateName);
      await canvasPage.verifyTemplate(templateName);

      // Verify dropdown is still accessible after each switch
      await expect(canvasPage.canvasStyleMenuButton).toBeVisible();
    }
  });

  test('Template switching with notes present', async ({ page }) => {
    const canvasPage = new CanvasPage(page);

    await canvasPage.load();

    // Create a note first
    await page.mouse.dblclick(400, 300);
    await canvasPage.waitForNoteCreated();

    // Verify note was created
    const note = page.locator('.note').first();
    await expect(note).toBeVisible();

    // Get initial note position
    const initialPosition = await note.boundingBox();

    // Switch templates and verify note is preserved
    await canvasPage.switchToTemplate("Hero's Journey");
    await canvasPage.verifyTemplate("Hero's Journey");

    // Verify note still exists and is visible
    await expect(note).toBeVisible();
    const newPosition = await note.boundingBox();

    // Note should still be in approximately the same position
    // (Different templates have different dimensions, so allow for significant shifts)
    expect(Math.abs(newPosition.x - initialPosition.x)).toBeLessThan(500);
    expect(Math.abs(newPosition.y - initialPosition.y)).toBeLessThan(500);

    // Switch back to standard and verify again
    await canvasPage.switchToTemplate('Standard Canvas');
    await expect(note).toBeVisible();
  });
});
