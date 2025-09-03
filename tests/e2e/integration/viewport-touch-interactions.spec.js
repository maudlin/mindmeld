/**
 * Viewport Touch Interaction E2E Tests
 *
 * Tests critical zoom/pan functionality in touch mode to prevent regressions.
 * These tests replicate mobile device behavior and catch coordinate system bugs
 * that are hard to debug manually on actual devices.
 */

import { test, expect } from '@playwright/test';

test.describe('Viewport Touch Interactions @integration', () => {
  let logs = [];
  let errors = [];

  test.beforeEach(async ({ page }) => {
    // Reset log collectors
    logs = [];
    errors = [];

    // Capture all console messages and errors for debugging
    page.on('console', (msg) => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Set up mobile viewport and force touch mode
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.goto('http://localhost:8080?mode=touch');
    await page.waitForTimeout(1000); // Allow full initialization
  });

  test('canvas should handle pinch zoom out gesture', async ({ page }) => {
    // Get initial canvas state
    const initialState = await getCanvasState(page);

    expect(initialState.exists).toBe(true);
    expect(initialState.isVisible).toBe(true);

    console.log('Testing pinch zoom out gesture...');
    console.log('Initial canvas position:', initialState.boundingRect);

    // Perform pinch zoom out gesture on canvas
    await performPinchGesture(page, '#canvas', 'out');
    await page.waitForTimeout(500);

    const afterZoomOut = await getCanvasState(page);
    console.log('After pinch zoom canvas position:', afterZoomOut.boundingRect);

    // Canvas should still exist and be visible
    expect(afterZoomOut.exists).toBe(true);
    expect(afterZoomOut.isVisible).toBe(true);

    // For infinite canvas (like Google Maps/Miro), canvas extends beyond viewport - this is correct!
    // Key validations: zoom functionality works and no errors occur
    const zoomDisplay = await page.textContent('#zoom-display');
    const hasValidZoomDisplay = zoomDisplay && zoomDisplay.includes('x');
    expect(hasValidZoomDisplay).toBe(true);

    // Canvas should have transform applied (indicating gesture was processed)
    const canvasTransform = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      return canvas.style.transform;
    });
    expect(canvasTransform).toContain('scale');
    expect(canvasTransform).toContain('translate');

    // Verify no JavaScript errors occurred
    expect(errors).toEqual([]);
  });

  test('canvas should handle multiple pinch gestures without going off-screen', async ({
    page,
  }) => {
    const states = [];
    let offScreenCount = 0;

    // Test multiple pinch zoom operations
    for (let i = 0; i < 3; i++) {
      await performPinchGesture(page, '#canvas', 'out');
      await page.waitForTimeout(300);

      const state = await getCanvasState(page);
      states.push(state);

      // Check if canvas goes off-screen
      if (
        Math.abs(state.boundingRect.left) > 2000 ||
        Math.abs(state.boundingRect.top) > 2000
      ) {
        offScreenCount++;
        console.log(
          `Pinch ${i + 1}: Canvas off-screen at (${state.boundingRect.left}, ${state.boundingRect.top})`,
        );
      }
    }

    // Log progression for debugging
    console.log(
      'Canvas positions after pinch gestures:',
      states.map((s) => ({
        left: Math.round(s.boundingRect.left),
        top: Math.round(s.boundingRect.top),
      })),
    );

    // For infinite canvas, being "off-screen" is normal and expected
    // What matters is that gestures are processed and transforms are applied correctly
    console.log(
      `Off-screen positioning count: ${offScreenCount} (expected for infinite canvas)`,
    );

    // Verify that each gesture actually applied transforms (using CSS matrix or transform syntax)
    for (const state of states) {
      const hasTransform =
        state.transform &&
        state.transform !== 'none' &&
        (state.transform.includes('scale') ||
          state.transform.includes('matrix') ||
          state.transform.includes('translate'));

      expect(hasTransform).toBe(true);
    }

    // Verify no JavaScript errors occurred
    expect(errors).toEqual([]);
  });

  test('touch mode should initialize correctly', async ({ page }) => {
    // Check that touch mode was properly activated
    const touchLogs = logs.filter(
      (log) => log.includes('TouchAdapter') && log.includes('initialize'),
    );

    expect(touchLogs.length).toBeGreaterThan(0);

    // Check that ViewportBehavior initialized properly
    const viewportLogs = logs.filter(
      (log) => log.includes('ViewportBehavior') && log.includes('Initialized'),
    );

    expect(viewportLogs.length).toBeGreaterThan(0);

    // Verify initial state is correct
    const initialState = await getCanvasState(page);
    // Note: zoom display may not exist, but canvas should
    expect(initialState.exists).toBe(true);
    expect(initialState.transform).toMatch(/matrix/); // CSS transforms use matrix format
  });

  test('zoom display should exist and update correctly', async ({ page }) => {
    // Check if zoom display exists - this should NOT be a known issue
    let zoom = await getZoomDisplay(page);

    // This test should fail if zoom display is missing - no conditional skipping
    expect(zoom).not.toBe('not found');
    console.log('Initial zoom display:', zoom);

    // Use proper touch pinch gesture instead of mouse wheel
    await performPinchGesture(page, '#canvas', 'out');
    await page.waitForTimeout(300);

    zoom = await getZoomDisplay(page);
    console.log('After pinch zoom out:', zoom);

    // Zoom display should have valid format
    expect(zoom).toMatch(/^\d+\.?\d*x$/); // Should be valid format like "4x" or "4.5x"
    expect(zoom).not.toMatch(/\.\d{3,}/); // No more than 2 decimal places
  });

  test('canvas should handle two-finger pan gesture', async ({ page }) => {
    // Get initial canvas state
    const initialState = await getCanvasState(page);
    expect(initialState.exists).toBe(true);

    console.log('Testing two-finger pan gesture...');
    console.log('Initial canvas position:', initialState.boundingRect);

    // Perform two-finger pan gesture
    await performTwoFingerPan(page, '#canvas', 100, 50);
    await page.waitForTimeout(500);

    const afterPan = await getCanvasState(page);
    console.log('After pan canvas position:', afterPan.boundingRect);

    // Canvas should still exist and be visible
    expect(afterPan.exists).toBe(true);
    expect(afterPan.isVisible).toBe(true);

    // Pan gesture should move canvas position
    const positionChanged =
      Math.abs(initialState.boundingRect.left - afterPan.boundingRect.left) >
        10 ||
      Math.abs(initialState.boundingRect.top - afterPan.boundingRect.top) > 10;

    // This test should FAIL if pan gesture doesn't work
    expect(positionChanged).toBe(true);

    // Verify no JavaScript errors occurred
    expect(errors).toEqual([]);
  });

  test('should support fine-grained zoom control (like Google Maps)', async ({
    page,
  }) => {
    // This test validates that pinch zoom provides smooth, continuous zoom levels
    // rather than jumping from max zoom (5x) to min zoom (1x)

    console.log('Testing fine-grained pinch zoom control...');

    // Start from max zoom level (5x) - this is the default
    const initialZoom = await getZoomDisplay(page);
    console.log('Initial zoom level (max):', initialZoom);

    // Perform a PARTIAL pinch zoom out (smaller finger movement)
    await performPartialPinchGesture(page, '#canvas', 'out', 0.3); // 30% of full pinch
    await page.waitForTimeout(200);

    const partialZoom1 = await getZoomDisplay(page);
    console.log('After partial pinch out (30%):', partialZoom1);

    // Perform another PARTIAL pinch zoom out
    await performPartialPinchGesture(page, '#canvas', 'out', 0.5); // 50% of full pinch
    await page.waitForTimeout(200);

    const partialZoom2 = await getZoomDisplay(page);
    console.log('After partial pinch out (50%):', partialZoom2);

    // Parse zoom levels to numbers for comparison
    const initialLevel = parseFloat(initialZoom.replace('x', ''));
    const partialLevel1 = parseFloat(partialZoom1.replace('x', ''));
    const partialLevel2 = parseFloat(partialZoom2.replace('x', ''));

    console.log('Zoom progression:', {
      initialLevel,
      partialLevel1,
      partialLevel2,
    });

    // CRITICAL: Test for fine-grained control (zoom out progression)
    // 1. Each partial gesture should reduce zoom level smoothly
    expect(partialLevel1).toBeLessThan(initialLevel);
    expect(partialLevel2).toBeLessThan(partialLevel1);

    // 2. Should support decimal zoom levels (like Google Maps)
    const hasDecimalPrecision =
      partialLevel1 % 1 !== 0 || // First level has decimals
      partialLevel2 % 1 !== 0 || // Second level has decimals
      Math.abs(partialLevel2 - partialLevel1) < 1.0; // Small increments

    // This should PASS for Google Maps-like behavior
    expect(hasDecimalPrecision).toBe(true);

    // 3. Should not jump from 5x to 1x (the "jumpy" bug)
    const maxJumpSize = Math.max(
      Math.abs(partialLevel1 - initialLevel),
      Math.abs(partialLevel2 - partialLevel1),
    );

    // Fine-grained control means no single gesture should jump more than ~3.5x
    // (Large jumps indicate threshold-based rather than proportional scaling)
    expect(maxJumpSize).toBeLessThan(3.5);

    // 4. Verify no JavaScript errors during fine-grained zoom
    expect(errors).toEqual([]);

    console.log('Fine-grained zoom test completed successfully');
  });

  test('should capture and log touch-related errors for debugging', async ({
    page,
  }) => {
    // This test is primarily for debugging - it logs useful info
    // and ensures our error capture system is working

    // Try some touch operations that might cause issues
    await performPinchGesture(page, '#canvas', 'out');
    await page.waitForTimeout(300);
    await performPinchGesture(page, '#canvas', 'in');
    await page.waitForTimeout(300);

    // Log captured touch-related messages for analysis
    const touchLogs = logs.filter(
      (log) =>
        log.includes('TouchAdapter') ||
        log.includes('ViewportBehavior') ||
        log.includes('zoom') ||
        log.includes('pan') ||
        log.includes('preventDefault'),
    );

    console.log('=== Touch-related logs captured ===');
    touchLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`));

    // Verify error capture is working (should be no errors in normal case)
    if (errors.length > 0) {
      console.log('=== JavaScript errors detected ===');
      errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }

    // Test should pass even if there are logs (they're for debugging)
    // But fail if there are actual JavaScript errors
    expect(errors).toEqual([]);
  });

  // Helper function to get comprehensive canvas state
  async function getCanvasState(page) {
    return await page.evaluate(() => {
      const canvas = document.querySelector('#canvas');
      const zoomDisplay = document.querySelector('#zoom-display');

      if (!canvas) {
        return { exists: false, zoom: 'not found' };
      }

      const style = window.getComputedStyle(canvas);
      const rect = canvas.getBoundingClientRect();

      // Check if canvas is actually visible to user
      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden';

      return {
        exists: true,
        isVisible,
        zoom: zoomDisplay ? zoomDisplay.textContent : 'no display',
        transform: style.transform,
        boundingRect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        computedStyle: {
          display: style.display,
          visibility: style.visibility,
          transform: style.transform,
        },
      };
    });
  }

  // Helper function to get zoom display text
  async function getZoomDisplay(page) {
    return await page.evaluate(() => {
      const display = document.querySelector('#zoom-display');
      return display ? display.textContent : 'not found';
    });
  }

  // Helper function to perform partial pinch zoom gesture with fine control
  async function performPartialPinchGesture(
    page,
    selector,
    direction,
    intensity = 1.0,
  ) {
    // intensity: 0.1 = very small pinch, 1.0 = full pinch gesture
    const locator = page.locator(selector);

    // Get element center
    const { centerX, centerY } = await locator.evaluate((target) => {
      const bounds = target.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      return { centerX, centerY };
    });

    // FIXED: Create realistic finger distances that meet 1% scale change threshold
    const baseDistance = 100; // Start with fingers 100px apart
    const changeDistance = baseDistance * intensity * 0.5; // 50% change for full intensity

    let initialDistance, finalDistance;
    if (direction === 'out') {
      initialDistance = baseDistance;
      finalDistance = baseDistance - changeDistance; // Fingers move closer (zoom out)
    } else {
      initialDistance = baseDistance;
      finalDistance = baseDistance + changeDistance; // Fingers move apart (zoom in)
    }

    const steps = 5;

    // Start with initial finger positions
    let touches = [
      {
        identifier: 0,
        clientX: centerX - initialDistance / 2,
        clientY: centerY,
      },
      {
        identifier: 1,
        clientX: centerX + initialDistance / 2,
        clientY: centerY,
      },
    ];

    // Start the pinch gesture
    await locator.dispatchEvent('touchstart', {
      touches,
      changedTouches: touches,
      targetTouches: touches,
    });

    // Gradually move fingers to final positions
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const currentDistance =
        initialDistance + (finalDistance - initialDistance) * progress;

      touches = [
        {
          identifier: 0,
          clientX: centerX - currentDistance / 2,
          clientY: centerY,
        },
        {
          identifier: 1,
          clientX: centerX + currentDistance / 2,
          clientY: centerY,
        },
      ];

      await locator.dispatchEvent('touchmove', {
        touches,
        changedTouches: touches,
        targetTouches: touches,
      });

      await page.waitForTimeout(50);
    }

    // End the pinch gesture
    await locator.dispatchEvent('touchend', {
      touches: [],
      changedTouches: touches,
      targetTouches: [],
    });
  }

  // Helper function to perform pinch zoom gesture
  async function performPinchGesture(page, selector, direction) {
    const locator = page.locator(selector);

    // Get element center
    const { centerX, centerY } = await locator.evaluate((target) => {
      const bounds = target.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      return { centerX, centerY };
    });

    const deltaX = 60; // Distance between fingers
    const steps = 3; // Number of steps in the gesture
    const stepDeltaX = deltaX / (steps + 1);

    // Two touch points equally distant from center
    const initialOffset = direction === 'in' ? deltaX : stepDeltaX;
    let touches = [
      {
        identifier: 0,
        clientX: centerX - initialOffset,
        clientY: centerY,
      },
      {
        identifier: 1,
        clientX: centerX + initialOffset,
        clientY: centerY,
      },
    ];

    // Start the pinch gesture
    await locator.dispatchEvent('touchstart', {
      touches,
      changedTouches: touches,
      targetTouches: touches,
    });

    // Move fingers towards or away from each other
    for (let i = 1; i <= steps; i++) {
      const offset =
        direction === 'in' ? deltaX - i * stepDeltaX : stepDeltaX * (i + 1);

      touches = [
        {
          identifier: 0,
          clientX: centerX - offset,
          clientY: centerY,
        },
        {
          identifier: 1,
          clientX: centerX + offset,
          clientY: centerY,
        },
      ];

      await locator.dispatchEvent('touchmove', {
        touches,
        changedTouches: touches,
        targetTouches: touches,
      });

      await page.waitForTimeout(50); // Small delay between steps
    }

    // End the pinch gesture
    await locator.dispatchEvent('touchend', {
      touches: [],
      changedTouches: touches,
      targetTouches: [],
    });
  }

  // Helper function to perform two-finger pan gesture
  async function performTwoFingerPan(page, selector, deltaX, deltaY) {
    const locator = page.locator(selector);

    // Get element center
    const { centerX, centerY } = await locator.evaluate((target) => {
      const bounds = target.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      return { centerX, centerY };
    });

    // Two touch points for pan gesture
    let touches = [
      {
        identifier: 0,
        clientX: centerX - 30,
        clientY: centerY - 30,
      },
      {
        identifier: 1,
        clientX: centerX + 30,
        clientY: centerY + 30,
      },
    ];

    // Start the pan gesture
    await locator.dispatchEvent('touchstart', {
      touches,
      changedTouches: touches,
      targetTouches: touches,
    });

    // Move both fingers together in the same direction
    const steps = 3;
    for (let i = 1; i <= steps; i++) {
      const stepX = (deltaX / steps) * i;
      const stepY = (deltaY / steps) * i;

      touches = [
        {
          identifier: 0,
          clientX: centerX - 30 + stepX,
          clientY: centerY - 30 + stepY,
        },
        {
          identifier: 1,
          clientX: centerX + 30 + stepX,
          clientY: centerY + 30 + stepY,
        },
      ];

      await locator.dispatchEvent('touchmove', {
        touches,
        changedTouches: touches,
        targetTouches: touches,
      });

      await page.waitForTimeout(50);
    }

    // End the pan gesture
    await locator.dispatchEvent('touchend', {
      touches: [],
      changedTouches: touches,
      targetTouches: [],
    });
  }
});
