/**
 * E2E Test Suite: Touch Interactions
 *
 * Comprehensive test coverage for touch interactions using Playwright's touch simulation.
 * These tests ensure TouchAdapter works correctly on mobile devices and tablets.
 *
 * Critical: These tests should expose the MM-173 pointer-events bug affecting touch.
 */

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

// Configure for touch simulation with mobile viewport
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 12 Pro dimensions
  hasTouch: true,
  isMobile: true,
});

test.describe('Touch Interactions - Core Functionality', () => {
  let page;
  let canvasPage;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    canvasPage = new CanvasPage(page);

    // Load in touch mode using URL parameter (same as existing touch tests)
    await canvasPage.load('touch');

    // Wait for initialization to complete
    await page.waitForTimeout(1000);

    // Verify TouchAdapter is active
    const adapterInfo = await page.evaluate(() => {
      const inputController = window.mindMeldDebug?.inputController;
      const adapter = inputController?.currentAdapter;
      return {
        name: adapter?.constructor?.name,
        mode: inputController?.currentMode,
        maxTouchPoints: navigator.maxTouchPoints,
      };
    });

    console.log('Touch adapter info:', adapterInfo);
    expect(adapterInfo.name).toBe('TouchAdapter');
  });

  test('Touch: Create note with double-tap @critical', async () => {
    // Double-tap to create note
    const x = 300;
    const y = 200;

    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(50); // Small delay between taps
    await page.touchscreen.tap(x, y);

    // Wait for note creation
    await page.waitForTimeout(600); // Respect throttle

    // Check if note was actually created
    const noteCount = await page.locator('.note').count();
    console.log('Note count after double-tap:', noteCount);

    // Verify note was created
    const note = page.locator('.note').first();
    await expect(note).toBeVisible({ timeout: 10000 });

    // Debug: Check if note has proper data-id attribute
    const noteId = await note.getAttribute('id');
    const dataId = await note.getAttribute('data-id');
    console.log('Note ID:', noteId, 'Data-ID:', dataId);

    // Should start in view mode (consistent with desktop UX)
    const noteContent = note.locator('.note-content');
    await expect(noteContent).toHaveClass(/view-mode/);

    // Double-tap the note to enter edit mode (following working pattern from edit-view-mode-toggle.spec.js)
    const bbox = await noteContent.boundingBox();
    await page.touchscreen.tap(bbox.x + 50, bbox.y + 20);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(bbox.x + 50, bbox.y + 20); // Double tap
    await page.waitForTimeout(100); // Wait for element replacement

    // Now should be in edit mode
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).not.toHaveClass(/view-mode/);

    // Verify we're using textarea architecture
    const textarea = noteContent.locator('textarea.edit-textarea');
    await expect(textarea).toBeVisible();
  });

  test('Touch: Enter and exit edit mode @critical', async () => {
    // Create a note first
    const note = await canvasPage.createNote(300, 200);
    const noteContent = note.locator('.note-content');

    // Exit edit mode by tapping outside
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(500);

    // Should be in view mode
    await expect(noteContent).toHaveClass(/view-mode/);
    await expect(noteContent).not.toHaveClass(/edit-mode/);

    // Double-tap note to enter edit mode
    const box = await noteContent.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

    await page.waitForTimeout(500);

    // Should be back in edit mode
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).not.toHaveClass(/view-mode/);

    // Verify textarea is visible
    const textarea = noteContent.locator('textarea.edit-textarea');
    await expect(textarea).toBeVisible();
  });

  test('Touch: Select single note with tap @critical', async () => {
    // Create two notes
    const note1 = await canvasPage.createNote(300, 200);
    await page.waitForTimeout(800);
    const note2 = await canvasPage.createNote(500, 200);

    // Exit any edit mode
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(500);

    // Tap first note to select it (single tap in view mode)
    const noteContent1 = note1.locator('.note-content');
    const box1 = await noteContent1.boundingBox();
    await page.touchscreen.tap(
      box1.x + box1.width / 2,
      box1.y + box1.height / 2,
    );

    await page.waitForTimeout(300);

    // First note should be selected
    await expect(note1).toHaveClass(/selected/);
    await expect(note2).not.toHaveClass(/selected/);

    // Tap second note to select it instead
    const noteContent2 = note2.locator('.note-content');
    const box2 = await noteContent2.boundingBox();
    await page.touchscreen.tap(
      box2.x + box2.width / 2,
      box2.y + box2.height / 2,
    );

    await page.waitForTimeout(300);

    // Second note should be selected, first should not
    await expect(note1).not.toHaveClass(/selected/);
    await expect(note2).toHaveClass(/selected/);
  });

  test('Touch: Move single note with drag @critical', async () => {
    const note = await canvasPage.createNote(300, 200);

    // Exit edit mode
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(500);

    // Get initial position
    const initialBox = await note.boundingBox();

    // Touch and drag to move note
    const startX = initialBox.x + initialBox.width / 2;
    const startY = initialBox.y + initialBox.height / 2;
    const endX = startX + 100;
    const endY = startY + 50;

    // Simulate touch drag
    await page.touchscreen.tap(startX, startY); // Touch down
    await page.waitForTimeout(100);

    // Drag gesture
    await page.evaluate(
      ({ sx, sy, ex, ey }) => {
        const canvas = document.querySelector('#canvas');

        // Simulate touchstart
        const touchStart = new TouchEvent('touchstart', {
          touches: [
            new Touch({
              identifier: 1,
              target: canvas,
              clientX: sx,
              clientY: sy,
            }),
          ],
          bubbles: true,
          cancelable: true,
        });

        // Simulate touchmove
        const touchMove = new TouchEvent('touchmove', {
          touches: [
            new Touch({
              identifier: 1,
              target: canvas,
              clientX: ex,
              clientY: ey,
            }),
          ],
          bubbles: true,
          cancelable: true,
        });

        // Simulate touchend
        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [
            new Touch({
              identifier: 1,
              target: canvas,
              clientX: ex,
              clientY: ey,
            }),
          ],
          bubbles: true,
          cancelable: true,
        });

        // Find the note element to drag
        const noteElement = document.querySelector('.note');
        if (noteElement) {
          noteElement.dispatchEvent(touchStart);
          canvas.dispatchEvent(touchMove);
          canvas.dispatchEvent(touchEnd);
        }
      },
      { sx: startX, sy: startY, ex: endX, ey: endY },
    );

    await page.waitForTimeout(500);

    // Verify note moved
    const finalBox = await note.boundingBox();
    expect(Math.abs(finalBox.x - initialBox.x - 100)).toBeLessThan(10);
    expect(Math.abs(finalBox.y - initialBox.y - 50)).toBeLessThan(10);
  });

  test('Touch: Multi-select notes with selection box @critical', async () => {
    // Create three notes
    const note1 = await canvasPage.createNote(300, 200);
    await page.waitForTimeout(800);
    const note2 = await canvasPage.createNote(400, 200);
    await page.waitForTimeout(800);
    const note3 = await canvasPage.createNote(350, 300);

    // Exit edit mode
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(500);

    // Create selection box using touch drag on canvas
    const startX = 250;
    const startY = 150;
    const endX = 450;
    const endY = 350;

    // Simulate touch selection box
    await page.evaluate(
      ({ sx, sy, ex, ey }) => {
        const canvas = document.querySelector('#canvas');

        // Long press to start selection
        const touchStart = new TouchEvent('touchstart', {
          touches: [
            new Touch({
              identifier: 1,
              target: canvas,
              clientX: sx,
              clientY: sy,
            }),
          ],
          bubbles: true,
          cancelable: true,
        });
        canvas.dispatchEvent(touchStart);

        // After delay, drag to create selection
        setTimeout(() => {
          const touchMove = new TouchEvent('touchmove', {
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: ex,
                clientY: ey,
              }),
            ],
            bubbles: true,
            cancelable: true,
          });
          canvas.dispatchEvent(touchMove);

          const touchEnd = new TouchEvent('touchend', {
            changedTouches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: ex,
                clientY: ey,
              }),
            ],
            bubbles: true,
            cancelable: true,
          });
          canvas.dispatchEvent(touchEnd);
        }, 500); // Long press delay
      },
      { sx: startX, sy: startY, ex: endX, ey: endY },
    );

    await page.waitForTimeout(1000);

    // All three notes should be selected
    await expect(note1).toHaveClass(/selected/);
    await expect(note2).toHaveClass(/selected/);
    await expect(note3).toHaveClass(/selected/);
  });

  test('Touch: Move multiple selected notes @critical', async () => {
    // Create two notes
    const note1 = await canvasPage.createNote(300, 200);
    await page.waitForTimeout(800);
    const note2 = await canvasPage.createNote(400, 200);

    // Exit edit mode
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(500);

    // Select both notes with selection box
    await page.evaluate(() => {
      const canvas = document.querySelector('#canvas');

      // Create selection box
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          new Touch({
            identifier: 1,
            target: canvas,
            clientX: 250,
            clientY: 150,
          }),
        ],
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(touchStart);

      setTimeout(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [
            new Touch({
              identifier: 1,
              target: canvas,
              clientX: 450,
              clientY: 250,
            }),
          ],
          bubbles: true,
          cancelable: true,
        });
        canvas.dispatchEvent(touchMove);

        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [
            new Touch({
              identifier: 1,
              target: canvas,
              clientX: 450,
              clientY: 250,
            }),
          ],
          bubbles: true,
          cancelable: true,
        });
        canvas.dispatchEvent(touchEnd);
      }, 500);
    });

    await page.waitForTimeout(1000);

    // Verify both selected
    await expect(note1).toHaveClass(/selected/);
    await expect(note2).toHaveClass(/selected/);

    // Get initial positions
    const initial1 = await note1.boundingBox();
    const initial2 = await note2.boundingBox();

    // Move selected notes
    const moveX = 50;
    const moveY = 50;

    await page.evaluate(
      ({ mx, my }) => {
        const firstNote = document.querySelector('.note.selected');
        const canvas = document.querySelector('#canvas');

        if (firstNote) {
          const box = firstNote.getBoundingClientRect();
          const startX = box.x + box.width / 2;
          const startY = box.y + box.height / 2;

          // Touch and drag first selected note
          const touchStart = new TouchEvent('touchstart', {
            touches: [
              new Touch({
                identifier: 1,
                target: firstNote,
                clientX: startX,
                clientY: startY,
              }),
            ],
            bubbles: true,
            cancelable: true,
          });
          firstNote.dispatchEvent(touchStart);

          const touchMove = new TouchEvent('touchmove', {
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: startX + mx,
                clientY: startY + my,
              }),
            ],
            bubbles: true,
            cancelable: true,
          });
          canvas.dispatchEvent(touchMove);

          const touchEnd = new TouchEvent('touchend', {
            changedTouches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: startX + mx,
                clientY: startY + my,
              }),
            ],
            bubbles: true,
            cancelable: true,
          });
          canvas.dispatchEvent(touchEnd);
        }
      },
      { mx: moveX, my: moveY },
    );

    await page.waitForTimeout(500);

    // Verify both notes moved by same amount
    const final1 = await note1.boundingBox();
    const final2 = await note2.boundingBox();

    expect(Math.abs(final1.x - initial1.x - moveX)).toBeLessThan(10);
    expect(Math.abs(final1.y - initial1.y - moveY)).toBeLessThan(10);
    expect(Math.abs(final2.x - initial2.x - moveX)).toBeLessThan(10);
    expect(Math.abs(final2.y - initial2.y - moveY)).toBeLessThan(10);
  });

  test('Touch: Delete single note with long press @critical', async () => {
    const note = await canvasPage.createNote(300, 200);

    // Exit edit mode
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(500);

    // Select note first
    const noteContent = note.locator('.note-content');
    const box = await noteContent.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    await expect(note).toHaveClass(/selected/);

    // Long press to show context menu and delete
    await page.evaluate(
      ({ x, y }) => {
        const noteElement = document.querySelector('.note.selected');

        if (noteElement) {
          // Simulate long press
          const touchStart = new TouchEvent('touchstart', {
            touches: [
              new Touch({
                identifier: 1,
                target: noteElement,
                clientX: x,
                clientY: y,
              }),
            ],
            bubbles: true,
            cancelable: true,
          });
          noteElement.dispatchEvent(touchStart);

          // After long press delay, trigger context menu
          setTimeout(() => {
            const touchEnd = new TouchEvent('touchend', {
              changedTouches: [
                new Touch({
                  identifier: 1,
                  target: noteElement,
                  clientX: x,
                  clientY: y,
                }),
              ],
              bubbles: true,
              cancelable: true,
            });
            noteElement.dispatchEvent(touchEnd);

            // Trigger delete through context menu or keyboard
            const event = new KeyboardEvent('keydown', {
              key: 'Delete',
              code: 'Delete',
              bubbles: true,
            });
            document.dispatchEvent(event);
          }, 1000); // Long press threshold
        }
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );

    await page.waitForTimeout(1500);

    // Note should be deleted
    await expect(note).not.toBeAttached();
  });

  test('Touch: Clicks on styled content should enter edit mode', async () => {
    // Test that styled content is clickable after MM-176 EventDelegationManager fix
    const note = await canvasPage.createNote(300, 200);
    const noteContent = note.locator('.note-content');

    // Add styled content via textarea
    const textarea = noteContent.locator('textarea.edit-textarea');
    await textarea.fill('**Bold Text** and *Italic Text*');

    // Exit edit mode
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(500);

    await expect(noteContent).toHaveClass(/view-mode/);

    // Tap on the bold text to enter edit mode
    const boldElement = noteContent.locator('strong');
    await expect(boldElement).toBeVisible();

    const box = await boldElement.boundingBox();

    // Double-tap on styled element should work now
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

    await page.waitForTimeout(500);

    // Should successfully enter edit mode
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).not.toHaveClass(/view-mode/);
  });
});

test.describe('Touch Interactions - Gesture Recognition', () => {
  test('Touch: Pinch to zoom @smoke', async ({ page }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load('touch');

    // Create a note for reference
    await canvasPage.createNote(300, 200);

    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      return window.canvasRenderer?.getZoomLevel?.() || 1;
    });

    // Simulate pinch gesture
    await page.evaluate(() => {
      const canvas = document.querySelector('#canvas');

      // Two-finger touch start
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          new Touch({
            identifier: 1,
            target: canvas,
            clientX: 300,
            clientY: 200,
          }),
          new Touch({
            identifier: 2,
            target: canvas,
            clientX: 400,
            clientY: 200,
          }),
        ],
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(touchStart);

      // Pinch out (zoom in)
      const touchMove = new TouchEvent('touchmove', {
        touches: [
          new Touch({
            identifier: 1,
            target: canvas,
            clientX: 250,
            clientY: 200,
          }),
          new Touch({
            identifier: 2,
            target: canvas,
            clientX: 450,
            clientY: 200,
          }),
        ],
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(touchMove);

      // End gesture
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [
          new Touch({
            identifier: 1,
            target: canvas,
            clientX: 250,
            clientY: 200,
          }),
          new Touch({
            identifier: 2,
            target: canvas,
            clientX: 450,
            clientY: 200,
          }),
        ],
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(touchEnd);
    });

    await page.waitForTimeout(500);

    // Verify zoom changed
    const finalZoom = await page.evaluate(() => {
      return window.canvasRenderer?.getZoomLevel?.() || 1;
    });

    expect(finalZoom).toBeGreaterThan(initialZoom);
  });

  test('Touch: Two-finger pan @smoke', async ({ page }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load('touch');

    // Create a note for reference
    const note = await canvasPage.createNote(300, 200);

    // Get initial position
    const initialBox = await note.boundingBox();

    // Simulate two-finger pan
    await page.evaluate(() => {
      const canvas = document.querySelector('#canvas');

      // Two-finger touch start
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          new Touch({
            identifier: 1,
            target: canvas,
            clientX: 300,
            clientY: 200,
          }),
          new Touch({
            identifier: 2,
            target: canvas,
            clientX: 350,
            clientY: 200,
          }),
        ],
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(touchStart);

      // Pan gesture (both fingers move together)
      const touchMove = new TouchEvent('touchmove', {
        touches: [
          new Touch({
            identifier: 1,
            target: canvas,
            clientX: 350,
            clientY: 250,
          }),
          new Touch({
            identifier: 2,
            target: canvas,
            clientX: 400,
            clientY: 250,
          }),
        ],
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(touchMove);

      // End gesture
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [
          new Touch({
            identifier: 1,
            target: canvas,
            clientX: 350,
            clientY: 250,
          }),
          new Touch({
            identifier: 2,
            target: canvas,
            clientX: 400,
            clientY: 250,
          }),
        ],
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(touchEnd);
    });

    await page.waitForTimeout(500);

    // Note position should change relative to viewport (canvas panned)
    const finalBox = await note.boundingBox();
    expect(finalBox.x).not.toBe(initialBox.x);
    expect(finalBox.y).not.toBe(initialBox.y);
  });
});
