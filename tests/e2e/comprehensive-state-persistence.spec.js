// tests/e2e/comprehensive-state-persistence.spec.js
// Comprehensive test for state persistence including notes, colors, and connections

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Comprehensive State Persistence', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();

    // Clear any existing state
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Refresh to start with clean state
    await page.reload();
    await expect(canvasPage.canvas).toBeVisible();
  });

  test('Should persist complete state across page refresh', async ({
    page,
  }) => {
    // Step 1: Create notes with different colors
    const note1 = await canvasPage.createNote(300, 200);
    await canvasPage.selectNote(note1);
    await page.click('.color-swatch[data-color="blue"]');
    await expect(note1).toHaveClass(/color-blue/);

    // Add content to note1
    const note1Content = note1.locator('.note-content');
    await note1Content.click();
    await note1Content.fill('Test Note 1');

    const note2 = await canvasPage.createNote(500, 200);
    await canvasPage.selectNote(note2);
    await page.click('.color-swatch[data-color="green"]');
    await expect(note2).toHaveClass(/color-green/);

    // Add content to note2
    const note2Content = note2.locator('.note-content');
    await note2Content.click();
    await note2Content.fill('Test Note 2');

    const note3 = await canvasPage.createNote(400, 350);
    // Note3 should remain default yellow

    // Add content to note3
    const note3Content = note3.locator('.note-content');
    await note3Content.click();
    await note3Content.fill('Test Note 3');

    // Step 2: Create connections between notes
    // Connect note1 to note2
    await canvasPage.dragConnection(note1, note2);

    // Connect note2 to note3
    await canvasPage.dragConnection(note2, note3);

    // Verify connections exist
    const connections = page.locator('g[data-start]');
    await expect(connections).toHaveCount(2);

    // Step 3: Wait for auto-save
    await page.waitForTimeout(1000);

    // Step 4: Capture pre-refresh state
    const preRefreshState = await page.evaluate(() => {
      return {
        localStorage: localStorage.getItem('mindmeld_state'),
        noteCount: document.querySelectorAll('.note').length,
        connectionCount: document.querySelectorAll('g[data-start]').length,
        noteContents: Array.from(document.querySelectorAll('.note')).map(
          (note) => ({
            id: note.id,
            content: note.querySelector('.note-content').textContent,
            color:
              Array.from(note.classList).find((cls) =>
                cls.startsWith('color-'),
              ) || 'color-yellow',
          }),
        ),
      };
    });

    console.log('Pre-refresh state:', JSON.stringify(preRefreshState, null, 2));

    // Verify localStorage contains expected data
    expect(preRefreshState.localStorage).toBeTruthy();
    const parsedState = JSON.parse(preRefreshState.localStorage);
    expect(parsedState.notes).toHaveLength(3);
    expect(parsedState.connections).toHaveLength(2);
    expect(parsedState.colorState.notes).toBeDefined();

    // Step 5: Refresh the page
    await page.reload();
    await expect(canvasPage.canvas).toBeVisible();

    // Wait for state restoration
    await page.waitForTimeout(1000);

    // Step 6: Verify all state is restored correctly

    // Check notes are restored
    const restoredNotes = page.locator('.note');
    await expect(restoredNotes).toHaveCount(3);

    // Check note contents are restored
    const note1Restored = page.locator('.note').first();
    const note2Restored = page.locator('.note').nth(1);
    const note3Restored = page.locator('.note').nth(2);

    await expect(note1Restored.locator('.note-content')).toHaveText(
      'Test Note 1',
    );
    await expect(note2Restored.locator('.note-content')).toHaveText(
      'Test Note 2',
    );
    await expect(note3Restored.locator('.note-content')).toHaveText(
      'Test Note 3',
    );

    // Check colors are restored
    await expect(note1Restored).toHaveClass(/color-blue/);
    await expect(note2Restored).toHaveClass(/color-green/);
    await expect(note3Restored).toHaveClass(/color-yellow/);

    // Check connections are restored
    const restoredConnections = page.locator('g[data-start]');
    await expect(restoredConnections).toHaveCount(2);

    // Step 7: Verify post-refresh state matches pre-refresh
    const postRefreshState = await page.evaluate(() => {
      return {
        localStorage: localStorage.getItem('mindmeld_state'),
        noteCount: document.querySelectorAll('.note').length,
        connectionCount: document.querySelectorAll('g[data-start]').length,
        noteContents: Array.from(document.querySelectorAll('.note')).map(
          (note) => ({
            id: note.id,
            content: note.querySelector('.note-content').textContent,
            color:
              Array.from(note.classList).find((cls) =>
                cls.startsWith('color-'),
              ) || 'color-yellow',
          }),
        ),
      };
    });

    console.log(
      'Post-refresh state:',
      JSON.stringify(postRefreshState, null, 2),
    );

    // Verify state consistency
    expect(postRefreshState.noteCount).toBe(preRefreshState.noteCount);
    expect(postRefreshState.connectionCount).toBe(
      preRefreshState.connectionCount,
    );

    // Verify note contents and colors are preserved
    expect(postRefreshState.noteContents).toHaveLength(3);

    const blueCastedNotes = postRefreshState.noteContents.filter(
      (n) => n.color === 'color-blue',
    );
    const greenCastedNotes = postRefreshState.noteContents.filter(
      (n) => n.color === 'color-green',
    );
    const yellowCastedNotes = postRefreshState.noteContents.filter(
      (n) => n.color === 'color-yellow',
    );

    expect(blueCastedNotes).toHaveLength(1);
    expect(greenCastedNotes).toHaveLength(1);
    expect(yellowCastedNotes).toHaveLength(1);

    expect(blueCastedNotes[0].content).toBe('Test Note 1');
    expect(greenCastedNotes[0].content).toBe('Test Note 2');
    expect(yellowCastedNotes[0].content).toBe('Test Note 3');
  });

  test('Should handle state persistence with zoom and pan', async ({
    page,
  }) => {
    // Test that zoom and pan state is also persisted
    await canvasPage.createNote(400, 300);

    // Change zoom level
    await page.evaluate(() => {
      // Simulate zoom change - this should trigger state save
      window.appStateDebug.setState({ zoomLevel: 3 });
    });

    // Wait for save
    await page.waitForTimeout(500);

    // Verify zoom is saved
    const preRefreshZoom = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('mindmeld_state'));
      return state.zoomLevel;
    });

    expect(preRefreshZoom).toBe(3);

    // Refresh and verify zoom is restored
    await page.reload();
    await expect(canvasPage.canvas).toBeVisible();
    await page.waitForTimeout(500);

    const postRefreshZoom = await page.evaluate(() => {
      return window.appStateDebug.getState().zoomLevel;
    });

    expect(postRefreshZoom).toBe(3);
  });

  test('Should handle empty state correctly', async ({ page }) => {
    // Test that empty state doesn't cause issues
    await page.reload();
    await expect(canvasPage.canvas).toBeVisible();

    // Should start with default state
    const initialState = await page.evaluate(() => {
      return window.appStateDebug.getState();
    });

    expect(initialState.notes).toHaveLength(0);
    expect(initialState.connections).toHaveLength(0);
    expect(initialState.zoomLevel).toBe(5);
    expect(initialState.colorState.currentColor).toBe('yellow');
    expect(initialState.colorState.notes).toEqual({});
  });
});
