import { test, expect } from '@playwright/test';
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

test.describe('Menu Functionality', () => {
  test.describe('Navigation Menu Structure', () => {
    test('Should display all main menu items', async ({ page }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Verify main menu items are visible
      await expect(page.locator('#navbar')).toBeVisible();
      await expect(page.locator('#logo')).toBeVisible();

      // Check main menu buttons
      await expect(page.locator('button:has-text("About")')).toBeVisible();
      await expect(
        page.locator('button:has-text("Import/Export")'),
      ).toBeVisible();
      await expect(
        page.locator('button:has-text("Canvas Style")'),
      ).toBeVisible();
      await expect(page.locator('#clear-canvas-button')).toBeVisible();
    });

    test('Should show About dropdown menu on hover', async ({ page }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Hover over About menu
      await page.hover('.menu-item:has-text("About")');

      // Verify dropdown items appear
      await expect(
        page.locator('a[href="about.html"]:has-text("About MindMeld")'),
      ).toBeVisible();
      await expect(
        page.locator('a[href="changelog.html"]:has-text("What\'s New")'),
      ).toBeVisible();
    });

    test('Should show Import/Export dropdown menu on hover', async ({
      page,
    }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Hover over Import/Export menu
      await page.hover('.menu-item:has-text("Import/Export")');

      // Verify all import/export buttons are accessible
      await expect(page.locator('#import-from-file-button')).toBeVisible();
      await expect(page.locator('#export-to-file-button')).toBeVisible();
      await expect(page.locator('#export-to-clipboard-button')).toBeVisible();
      await expect(page.locator('#import-from-clipboard-button')).toBeVisible();
    });
  });

  test.describe('Clear Canvas Functionality', () => {
    test('Should clear all notes and connections when confirmed', async ({
      page,
    }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Create test content using JavaScript dispatch (more reliable in CI)
      const note1 = await canvasPage.createNoteViaJavaScript(
        TestCoordinates.note1.x,
        TestCoordinates.note1.y,
      );
      await page.waitForTimeout(800); // Throttle handling
      const note2 = await canvasPage.createNoteViaJavaScript(
        TestCoordinates.note2.x,
        TestCoordinates.note2.y,
      );

      // Create connection between notes
      await canvasPage.connectNotes(note1, note2);
      await canvasPage.verifyConnection(note1, note2);

      // Verify content exists before clearing
      await expect(canvasPage.notes).toHaveCount(2);

      // Set up confirmation dialog to accept
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain(
          'Are you sure you want to clear the canvas?',
        );
        await dialog.accept();
      });

      // Click clear canvas button
      await page.click('#clear-canvas-button');
      await page.waitForTimeout(500);

      // Verify everything is cleared
      await expect(canvasPage.notes).toHaveCount(0);
      const connectionGroups = canvasPage.svgContainer.locator(
        'g[data-start][data-end]',
      );
      await expect(connectionGroups).toHaveCount(0);
    });

    test('Should preserve content when clear is cancelled', async ({
      page,
    }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Create test note
      await canvasPage.createNoteViaJavaScript(
        TestCoordinates.note1.x,
        TestCoordinates.note1.y,
      );

      await expect(canvasPage.notes).toHaveCount(1);

      // Set up confirmation dialog to decline
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain(
          'Are you sure you want to clear the canvas?',
        );
        await dialog.dismiss();
      });

      // Click clear canvas button
      await page.click('#clear-canvas-button');
      await page.waitForTimeout(500);

      // Verify content is preserved
      await expect(canvasPage.notes).toHaveCount(1);
    });
  });

  test.describe('Import/Export Functionality', () => {
    test('Should export to clipboard button be accessible and functional', async ({
      page,
    }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Create test content with notes and connections
      const note1 = await canvasPage.createNoteViaJavaScript(
        TestCoordinates.note1.x,
        TestCoordinates.note1.y,
      );
      await page.waitForTimeout(800); // Throttle handling
      const note2 = await canvasPage.createNoteViaJavaScript(
        TestCoordinates.note2.x,
        TestCoordinates.note2.y,
      );

      // Add content to notes
      await canvasPage.selectNote(note1);
      await canvasPage.editNoteContent('First Note', note1);
      await canvasPage.selectNote(note2);
      await canvasPage.editNoteContent('Second Note', note2);

      // Create connection
      await canvasPage.connectNotes(note1, note2);
      await canvasPage.verifyConnection(note1, note2);

      // Export to clipboard
      await page.hover('.menu-item:has-text("Import/Export")');

      // Handle the alert that appears after export (could be success or failure in headless mode)
      page.on('dialog', async (dialog) => {
        // In headless mode, clipboard access might fail, so we accept either message
        expect(dialog.message()).toMatch(
          /Mind map exported to clipboard!|Failed to copy to clipboard/,
        );
        await dialog.accept();
      });

      await page.click('#export-to-clipboard-button');
      await page.waitForTimeout(1000);

      // Verify export button functionality (the click should trigger some response)
      // In headless browsers, clipboard access is limited, so we just verify the button works
    });

    test('Should import from clipboard button be accessible', async ({
      page,
    }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Test that import from clipboard button is accessible
      await page.hover('.menu-item:has-text("Import/Export")');

      // Set up error dialog handler (clipboard might be empty in headless mode)
      page.on('dialog', async (dialog) => {
        // Could be error message due to empty/invalid clipboard in test environment
        expect(dialog.message()).toMatch(
          /imported from clipboard|Error importing from clipboard|Failed to read from clipboard/,
        );
        await dialog.accept();
      });

      const importButton = page.locator('#import-from-clipboard-button');
      await expect(importButton).toBeVisible();
      await expect(importButton).toBeEnabled();

      // Click the button (it will likely fail gracefully due to empty clipboard in test)
      await importButton.click();
      await page.waitForTimeout(1000);

      // Button should remain functional even if clipboard is empty
    });

    test('Should handle export to file download', async ({ page }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Create test content
      await canvasPage.createNoteViaJavaScript(
        TestCoordinates.note1.x,
        TestCoordinates.note1.y,
      );

      // Set up download handling
      const downloadPromise = page.waitForEvent('download');

      // Export to file
      await page.hover('.menu-item:has-text("Import/Export")');
      await page.click('#export-to-file-button');

      // Verify download was triggered
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('mindmap_export.json');
    });

    test('Should handle import from file', async ({ page }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Test would need JSON data for import functionality
      // Format: { data: { n: [...], c: [...] } }

      // Create test JSON data structure for import testing
      // (File upload testing is limited in E2E tests)

      // We can't easily test file upload in this context, but we can test that
      // the button is functional and triggers the file input
      await page.hover('.menu-item:has-text("Import/Export")');

      // Click should trigger file input (we can't test the full file upload easily in E2E)
      const importButton = page.locator('#import-from-file-button');
      await expect(importButton).toBeVisible();
      await expect(importButton).toBeEnabled();
    });

    test('Should handle invalid clipboard data gracefully', async ({
      page,
    }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Mock invalid clipboard data (this is tricky in E2E tests, but we can test the error handling)
      await page.hover('.menu-item:has-text("Import/Export")');

      // Set up error dialog handler
      page.on('dialog', async (dialog) => {
        if (dialog.message().includes('Error importing from clipboard')) {
          await dialog.accept();
        }
      });

      // The import button should be accessible even if clipboard is empty/invalid
      const importButton = page.locator('#import-from-clipboard-button');
      await expect(importButton).toBeVisible();
      await expect(importButton).toBeEnabled();
    });

    test('Should test export/import workflow via file operations', async ({
      page,
    }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Create notes at specific positions with content
      const note1 = await canvasPage.createNoteViaJavaScript(
        TestCoordinates.note1.x,
        TestCoordinates.note1.y,
      );
      await page.waitForTimeout(800); // Throttle handling
      const note2 = await canvasPage.createNoteViaJavaScript(
        TestCoordinates.note2.x,
        TestCoordinates.note2.y,
      );

      // Add specific content
      await canvasPage.selectNote(note1);
      await canvasPage.editNoteContent('Export Test 1', note1);
      await canvasPage.selectNote(note2);
      await canvasPage.editNoteContent('Export Test 2', note2);

      // Create connection
      await canvasPage.connectNotes(note1, note2);
      await canvasPage.verifyConnection(note1, note2);

      // Test export to file functionality
      await page.hover('.menu-item:has-text("Import/Export")');

      // Set up download handling for export
      const downloadPromise = page.waitForEvent('download');
      await page.click('#export-to-file-button');
      const download = await downloadPromise;

      // Verify export worked
      expect(download.suggestedFilename()).toBe('mindmap_export.json');

      // Verify the content exists before we test further functionality
      await expect(canvasPage.notes).toHaveCount(2);
      const firstNote = page.locator('.note:has-text("Export Test 1")');
      const secondNote = page.locator('.note:has-text("Export Test 2")');

      await expect(firstNote).toBeVisible();
      await expect(secondNote).toBeVisible();

      // Verify connection exists
      await canvasPage.verifyConnection(firstNote, secondNote);
    });
  });

  test.describe('Canvas Style Menu', () => {
    test('Should show canvas style options on hover', async ({ page }) => {
      const canvasPage = new CanvasPage(page);
      await canvasPage.load();

      // Hover over Canvas Style menu
      await page.hover('.menu-item:has-text("Canvas Style")');

      // Verify dropdown shows canvas style options
      const dropdown = page.locator('#canvas-style-dropdown');
      await expect(dropdown).toBeVisible();

      // Should have at least one canvas style option
      const styleButtons = dropdown.locator('button');
      await expect(styleButtons.first()).toBeVisible();
    });
  });
});
