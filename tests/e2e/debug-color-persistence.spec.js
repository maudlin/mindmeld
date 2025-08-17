// tests/e2e/debug-color-persistence.spec.js
// Debug test to investigate color persistence bug

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Debug: Color Persistence Bug', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Should reproduce color persistence bug on page refresh', async ({
    page,
  }) => {
    // Step 1: Create a note and change its color to green (same as working test)
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.selectNote(note);
    await page.click('.color-swatch[data-color="green"]');

    // Verify the note is green
    await expect(note).toHaveClass(/color-green/);

    // Step 2: Wait for auto-save (storageManager has 300ms debounce)
    await page.waitForTimeout(500);

    // Step 3: Refresh the page
    await page.reload();

    // Step 4: Wait for page to load and check note color
    await expect(canvasPage.canvas).toBeVisible();

    // Find the restored note
    const restoredNote = page.locator('.note').first();
    await expect(restoredNote).toBeVisible();

    // Check if color persisted - this should fail and show the bug
    console.log('Checking if note color persisted after refresh...');

    // Debug: Check localStorage content after refresh
    const localStorageAfterRefresh = await page.evaluate(() => {
      return localStorage.getItem('mindmeld_state');
    });
    console.log('LocalStorage after refresh:', localStorageAfterRefresh);

    // Debug: Check what ColorService thinks about the colors
    const colorServiceData = await page.evaluate(() => {
      // Access the ColorService and appState
      return window.appStateDebug
        ? window.appStateDebug.getState()
        : 'appState not available';
    });
    console.log(
      'AppState after refresh:',
      JSON.stringify(colorServiceData, null, 2),
    );

    // Get the note's classes to debug
    const noteClasses = await restoredNote.getAttribute('class');
    console.log('Note classes after refresh:', noteClasses);

    // This should now pass if color persistence is working
    await expect(restoredNote).toHaveClass(/color-green/);
  });

  test('Should verify localStorage contains color data', async ({ page }) => {
    // Step 1: Check initial localStorage
    let localStorageData = await page.evaluate(() => {
      return localStorage.getItem('mindmeld_state');
    });
    console.log('Initial localStorage data:', localStorageData);

    // Step 2: Create a note and change its color to green
    const note = await canvasPage.createNote(400, 300);
    await canvasPage.selectNote(note);

    // Check localStorage after note creation
    localStorageData = await page.evaluate(() => {
      return localStorage.getItem('mindmeld_state');
    });
    console.log('localStorage after note creation:', localStorageData);

    await page.click('.color-swatch[data-color="green"]');

    // Verify the note is green
    await expect(note).toHaveClass(/color-green/);

    // Step 3: Wait for auto-save and check immediately
    await page.waitForTimeout(100);
    localStorageData = await page.evaluate(() => {
      return localStorage.getItem('mindmeld_state');
    });
    console.log('localStorage after color change (100ms):', localStorageData);

    // Wait longer for debounced save
    await page.waitForTimeout(500);
    localStorageData = await page.evaluate(() => {
      return localStorage.getItem('mindmeld_state');
    });
    console.log(
      'localStorage after color change (600ms total):',
      localStorageData,
    );

    // Step 4: Parse and examine the stored data
    if (localStorageData) {
      const parsedData = JSON.parse(localStorageData);
      console.log('Parsed localStorage:', JSON.stringify(parsedData, null, 2));

      // Check if colorState exists
      expect(parsedData.colorState).toBeDefined();
      console.log('Color state:', parsedData.colorState);

      // Check if note colors are stored
      console.log('Note colors in storage:', parsedData.colorState.notes);
    }
  });
});
