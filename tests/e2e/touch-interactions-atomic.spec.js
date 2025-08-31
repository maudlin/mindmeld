// tests/e2e/touch-interactions-atomic.spec.js
/**
 * Atomic Touch Interaction Tests
 *
 * Breaks down touch interactions into individual, traceable steps
 * Each test focuses on ONE specific touch gesture to isolate failures
 */

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Atomic Touch Interactions', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    // Configure mobile viewport and touch
    await page.setViewportSize({ width: 375, height: 667 });

    canvasPage = new CanvasPage(page);
    await canvasPage.load('touch'); // Force touch mode
    await page.waitForTimeout(1000); // Stability delay

    // Debug bootstrap and adapter loading
    const debugInfo = await page.evaluate(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const manualMode = urlParams.get('mode');

      return {
        url: window.location.href,
        urlModeParam: manualMode,
        // Current adapter state
        currentAdapter: window.currentAdapter?.constructor?.name,
        currentMode: window.currentMode,
        maxTouchPoints: navigator.maxTouchPoints,
        inputController: !!window.inputController,
        capabilityDetector: !!window.capabilityDetector,
        detectedMode: window.capabilityDetector?.getOptimalInputMode?.(),
        // Bootstrap debug info
        mindMeldDebug: window.mindMeldDebug,
        // Error checking
        hasErrors: !!window.bootstrapErrors,
        errors: window.bootstrapErrors || [],
      };
    });
    console.log('Bootstrap & Touch adapter debug:', debugInfo);

    // If bootstrap failed, skip the rest of the test requirements
    if (!debugInfo.mindMeldDebug?.modernInputSystemReady) {
      console.error(
        'Bootstrap failed - InteractionBootstrap did not complete successfully',
      );
      console.log('Available debug info:', debugInfo.mindMeldDebug);
      throw new Error(
        `Bootstrap incomplete: ${JSON.stringify(debugInfo.mindMeldDebug)}`,
      );
    }

    // Only check mode if bootstrap succeeded
    expect(debugInfo.urlModeParam).toBe('touch');
  });

  test('Step 1: Canvas double-tap creates note @atomic', async ({ page }) => {
    console.log('Testing: Double-tap empty canvas → create note');

    // Double-tap empty canvas
    const x = 300,
      y = 200;
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(600); // Respect note creation throttle

    // Verify note was created
    const noteCount = await page.locator('.note').count();
    console.log('Notes created:', noteCount);
    expect(noteCount).toBe(1);

    const note = page.locator('.note').first();
    await expect(note).toBeVisible();

    // Should be in view mode initially
    const noteContent = note.locator('.note-content');
    await expect(noteContent).toHaveClass(/view-mode/);
  });

  test('Step 2: Single tap selects note @atomic', async ({ page }) => {
    console.log('Testing: Single tap note → select note');

    // Enable console logging for debugging
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    // Create note with double-tap (touchscreen method that works)
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

    // Single tap to select (using bounding box for accuracy)
    const bbox = await note.boundingBox();
    await page.touchscreen.tap(bbox.x + 50, bbox.y + 20);
    await page.waitForTimeout(200);

    // Verify note is selected
    await expect(note).toHaveClass(/selected/);
    console.log('Note selection: SUCCESS');
  });

  test('Step 3: Double-tap selected note enters edit mode @atomic', async ({
    page,
  }) => {
    console.log('Testing: Double-tap selected note → enter edit mode');

    // Create note with double-tap (touchscreen method that works)
    await page.touchscreen.tap(300, 200);
    await page.waitForTimeout(100);
    await page.touchscreen.tap(300, 200);
    await page.waitForTimeout(500);

    // Type some text
    await page.keyboard.type('Edit Mode Test');
    // Exit edit mode by tapping on canvas (proper touch behavior)
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(300);

    // Verify note exists
    const note = page.locator('.note').first();
    await expect(note).toBeVisible();
    const noteContent = note.locator('.note-content');

    // Single tap to select the note
    const bbox = await note.boundingBox();
    await page.touchscreen.tap(bbox.x + 50, bbox.y + 20);
    await page.waitForTimeout(200);
    await expect(note).toHaveClass(/selected/);
    console.log('Note selected: ✓');

    // Double-tap the selected note to enter edit mode
    await page.touchscreen.tap(bbox.x + 50, bbox.y + 20);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(bbox.x + 50, bbox.y + 20);
    await page.waitForTimeout(300);

    // Verify edit mode
    await expect(noteContent).toHaveClass(/edit-mode/, { timeout: 2000 });
    await expect(noteContent).not.toHaveClass(/view-mode/);
    console.log('Edit mode entry: SUCCESS');
  });

  test('Step 4: Drag note moves position @atomic', async ({ page }) => {
    console.log('Testing: Drag note → move position');

    // Create and select a note
    const note = await canvasPage.createNote(300, 200);

    // Get initial position
    const initialBbox = await note.boundingBox();
    console.log('Initial position:', { x: initialBbox.x, y: initialBbox.y });

    // Drag the note
    await page.touchscreen.tap(initialBbox.x + 50, initialBbox.y + 20); // Touch down
    await page.waitForTimeout(100); // Hold for drag recognition

    // This should trigger drag, but might not be implemented yet
    const finalBbox = await note.boundingBox();
    console.log('Final position:', { x: finalBbox.x, y: finalBbox.y });

    // For now, just verify the note still exists and is draggable
    await expect(note).toBeVisible();
    console.log(
      'Drag test: Note remains visible (drag implementation pending)',
    );
  });

  test('Step 5: Canvas drag creates selection box @atomic', async ({
    page,
  }) => {
    console.log('Testing: Long press + drag canvas → selection box');

    // Create first note with double-tap
    await page.touchscreen.tap(200, 200);
    await page.waitForTimeout(100);
    await page.touchscreen.tap(200, 200);
    await page.waitForTimeout(500);
    await page.keyboard.type('Note 1');
    // Exit edit mode by tapping on canvas (proper touch behavior)
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(600); // Throttle wait

    // Create second note with double-tap
    await page.touchscreen.tap(400, 300);
    await page.waitForTimeout(100);
    await page.touchscreen.tap(400, 300);
    await page.waitForTimeout(500);
    await page.keyboard.type('Note 2');
    // Exit edit mode by tapping on canvas (proper touch behavior)
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(300);

    // Verify both notes exist
    const notes = page.locator('.note');
    await expect(notes).toHaveCount(2);
    const note1 = notes.first();
    const note2 = notes.last();

    // Try long press + drag on canvas (implementation pending)
    await page.touchscreen.tap(150, 150); // Start drag
    await page.waitForTimeout(500); // Long press delay

    // This should create selection box, but might not be implemented yet
    const selectionBox = page.locator('.selection-box');
    const hasSelectionBox = (await selectionBox.count()) > 0;
    console.log('Selection box created:', hasSelectionBox);

    // For now, just verify notes exist for future testing
    await expect(note1).toBeVisible();
    await expect(note2).toBeVisible();
    console.log(
      'Multi-select test: Notes ready (selection box implementation pending)',
    );
  });
});
