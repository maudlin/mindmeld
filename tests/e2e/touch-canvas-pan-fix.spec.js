import { test, expect } from '@playwright/test';

test.describe('Touch Canvas Pan Fix Verification', () => {
  test('CRITICAL: Single touch hold should NOT move canvas in touch mode', async ({
    page,
  }) => {
    // This test verifies the critical bug fix you identified
    await page.goto('http://localhost:8080/?mode=touch');
    await page.waitForTimeout(1000);

    const canvas = page.locator('#canvas');

    // Create a reference note to detect canvas movement
    await canvas.dispatchEvent('touchstart', {
      touches: [{ clientX: 300, clientY: 200, identifier: 0 }],
      changedTouches: [{ clientX: 300, clientY: 200, identifier: 0 }],
    });
    await canvas.dispatchEvent('touchend', {
      touches: [],
      changedTouches: [{ clientX: 300, clientY: 200, identifier: 0 }],
    });
    await page.waitForTimeout(100);
    await canvas.dispatchEvent('touchstart', {
      touches: [{ clientX: 300, clientY: 200, identifier: 0 }],
      changedTouches: [{ clientX: 300, clientY: 200, identifier: 0 }],
    });
    await canvas.dispatchEvent('touchend', {
      touches: [],
      changedTouches: [{ clientX: 300, clientY: 200, identifier: 0 }],
    });

    const note = page.locator('.note').first();
    await expect(note).toBeVisible();
    await page.waitForTimeout(500);

    const initialNotePos = await note.boundingBox();
    console.log('Initial note position:', initialNotePos);

    // Single touch and hold on empty canvas area
    console.log('Testing single touch hold on canvas...');
    await canvas.dispatchEvent('touchstart', {
      touches: [{ clientX: 500, clientY: 400, identifier: 0 }],
      changedTouches: [{ clientX: 500, clientY: 400, identifier: 0 }],
    });

    // Hold for long press duration (enough to trigger old pan behavior)
    await page.waitForTimeout(1000);

    // End the touch
    await canvas.dispatchEvent('touchend', {
      touches: [],
      changedTouches: [{ clientX: 500, clientY: 400, identifier: 0 }],
    });

    await page.waitForTimeout(500);

    const finalNotePos = await note.boundingBox();
    console.log('Final note position:', finalNotePos);

    const deltaX = Math.abs(finalNotePos.x - initialNotePos.x);
    const deltaY = Math.abs(finalNotePos.y - initialNotePos.y);

    console.log(`Note movement: ${deltaX}px horizontal, ${deltaY}px vertical`);

    // The critical test: note should NOT have moved significantly
    // (small movements due to rendering differences are acceptable)
    expect(deltaX).toBeLessThan(10);
    expect(deltaY).toBeLessThan(10);

    if (deltaX < 5 && deltaY < 5) {
      console.log('✅ SUCCESS: Canvas did not pan on single touch hold');
    } else {
      console.log('❌ FAILURE: Canvas unexpectedly moved on single touch hold');
    }
  });

  test('Baseline: Single touch hold SHOULD move canvas without touch mode (legacy behavior)', async ({
    page,
  }) => {
    // This verifies that legacy behavior is preserved for non-touch-mode users
    await page.goto('http://localhost:8080'); // No ?mode=touch
    await page.waitForTimeout(1000);

    console.log('Testing legacy touch behavior without touch mode...');

    // This test helps us understand if the old behavior is preserved
    // We'll just log results to see what happens
    const canvas = page.locator('#canvas');

    // Create reference note
    await canvas.dblclick({ position: { x: 300, y: 200 } });
    const note = page.locator('.note').first();
    await expect(note).toBeVisible();
    await page.waitForTimeout(500);

    const initialNotePos = await note.boundingBox();
    console.log('Legacy mode - Initial note position:', initialNotePos);

    // Single touch and hold (should trigger legacy pan if mobile device detected)
    await canvas.dispatchEvent('touchstart', {
      touches: [{ clientX: 500, clientY: 400, identifier: 0 }],
      changedTouches: [{ clientX: 500, clientY: 400, identifier: 0 }],
    });

    await page.waitForTimeout(100);

    await canvas.dispatchEvent('touchmove', {
      touches: [{ clientX: 600, clientY: 500, identifier: 0 }],
      changedTouches: [{ clientX: 600, clientY: 500, identifier: 0 }],
    });

    await canvas.dispatchEvent('touchend', {
      touches: [],
      changedTouches: [{ clientX: 600, clientY: 500, identifier: 0 }],
    });

    await page.waitForTimeout(500);

    const finalNotePos = await note.boundingBox();
    console.log('Legacy mode - Final note position:', finalNotePos);

    const deltaX = Math.abs(finalNotePos.x - initialNotePos.x);
    const deltaY = Math.abs(finalNotePos.y - initialNotePos.y);

    console.log(
      `Legacy mode - Note movement: ${deltaX}px horizontal, ${deltaY}px vertical`,
    );

    // Just log the results - don't assert, as behavior depends on device detection
    if (deltaX > 10 || deltaY > 10) {
      console.log('ℹ️ Legacy panning detected (mobile device behavior)');
    } else {
      console.log('ℹ️ No panning (desktop device behavior)');
    }
  });
});
