/**
 * E2E Smoke Tests - Core User Workflows
 *
 * Tests the essential user journeys that define MindMeld's core value.
 * These tests should represent real user workflows, not implementation details.
 *
 * Target: 3 tests covering 80% of user value
 */

import { test, expect } from '@playwright/test';
import { CanvasPage } from '../helpers/CanvasPage.js';

test.describe('Core User Workflows @smoke', () => {
  let canvasPage;

  test.beforeEach(async ({ page }) => {
    canvasPage = new CanvasPage(page);
    await canvasPage.load();
  });

  test('Complete Note Lifecycle - Create, Edit, Persist', async () => {
    // User Journey: Create note → Add content → Verify persistence

    // 1. User creates a note
    const note = await canvasPage.createNote(400, 300);
    await expect(note).toBeVisible();

    // 2. User adds content using the proper editNoteContent method
    await canvasPage.editNoteContent('My Important Test Note', note);

    // 3. Exit edit mode and verify content
    await canvasPage.page.mouse.click(100, 100);
    await canvasPage.waitForAppReady();

    // 4. Verify content is shown using the pattern from working tests
    const noteContent = note.locator('.note-content');
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      await expect(noteContent).toHaveValue('My Important Test Note');
    } else {
      await expect(noteContent).toHaveText('My Important Test Note');
    }

    // 5. Verify persistence - reload page
    await canvasPage.page.reload();
    await canvasPage.waitForAppReady();

    // 6. Content should persist after reload
    const persistedNote = canvasPage.page.locator('.note').first();
    await expect(persistedNote).toBeVisible();
    const persistedContent = persistedNote.locator('.note-content');
    await expect(persistedContent).toContainText('My Important Test Note');
  });

  test('Complete Note State Persistence - Color, Content, Position', async () => {
    // User Journey: Create multiple notes with different colors → Edit content → Verify complete persistence

    // === SETUP PHASE ===
    // Create test notes with specific positions, colors, and content
    const testNotes = [
      { x: 200, y: 150, color: 'blue', content: 'Test Note 1' },
      { x: 400, y: 250, color: 'pink', content: 'Test Note 2' },
      { x: 600, y: 350, color: 'green', content: 'Test Note 3' },
    ];

    const createdNotes = [];

    for (const noteSpec of testNotes) {
      // Select color first
      await canvasPage.selectColor(noteSpec.color);

      // Create note at specific position
      const note = await canvasPage.createNote(noteSpec.x, noteSpec.y);

      // Add content
      await canvasPage.editNote(note, noteSpec.content);

      // Verify color was applied
      await canvasPage.verifyNoteColor(note, noteSpec.color);

      // Store note info for later verification
      const noteId = await note.getAttribute('id');
      const position = await canvasPage.getNotePosition(note);

      createdNotes.push({
        id: noteId,
        element: note,
        expectedColor: noteSpec.color,
        expectedContent: noteSpec.content,
        expectedPosition: position,
      });

      console.log(
        `Created note ${noteId} at (${position.x}, ${position.y}) with color ${noteSpec.color}`,
      );
    }

    // === PERSISTENCE VERIFICATION ===
    // Check that data exists in browser storage before refresh
    const storageData = await canvasPage.page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
      };
    });

    console.log(
      'Storage data before refresh:',
      Object.keys(storageData.localStorage),
    );

    // Verify we have some data stored
    expect(Object.keys(storageData.localStorage).length).toBeGreaterThan(0);

    // === HARD REFRESH SIMULATION ===
    console.log('=== SIMULATING HARD REFRESH ===');
    await canvasPage.page.reload({ waitUntil: 'domcontentloaded' });
    await canvasPage.waitForAppReady();

    // Wait for YjsProvider to fully restore data
    await canvasPage.page.waitForTimeout(1000);

    // === VALIDATION PHASE ===
    console.log('=== VALIDATING RESTORED STATE ===');

    // Verify all notes were restored
    const restoredNotes = await canvasPage.notes.all();
    expect(restoredNotes.length).toBe(testNotes.length);

    // Verify each note's complete state
    for (let i = 0; i < createdNotes.length; i++) {
      const originalNote = createdNotes[i];
      const restoredNote = restoredNotes[i];

      console.log(`Validating note ${i + 1}:`);

      // 1. Verify position persisted
      const restoredPosition = await canvasPage.getNotePosition(restoredNote);
      console.log(
        `  Position: expected (${originalNote.expectedPosition.x}, ${originalNote.expectedPosition.y}), got (${restoredPosition.x}, ${restoredPosition.y})`,
      );

      expect(
        Math.abs(restoredPosition.x - originalNote.expectedPosition.x),
      ).toBeLessThan(10);
      expect(
        Math.abs(restoredPosition.y - originalNote.expectedPosition.y),
      ).toBeLessThan(10);

      // 2. Verify content persisted
      const restoredContent = await canvasPage.getNoteContent(restoredNote);
      console.log(
        `  Content: expected "${originalNote.expectedContent}", got "${restoredContent}"`,
      );

      expect(restoredContent.trim()).toBe(originalNote.expectedContent);

      // 3. CRITICAL: Verify color persisted
      console.log(`  Color: expected "${originalNote.expectedColor}"`);

      await canvasPage.verifyNoteColor(
        restoredNote,
        originalNote.expectedColor,
      );
    }

    console.log('✅ ALL NOTE STATE SUCCESSFULLY PERSISTED AND RESTORED');
  });

  test('Note Modification and Color Changes Persist', async () => {
    // User Journey: Create note → Modify content and color → Verify persistence

    // Create initial note
    await canvasPage.selectColor('yellow');
    const note = await canvasPage.createNote(300, 200);
    await canvasPage.editNote(note, 'Original content');

    // Modify the note
    await canvasPage.selectNote(note); // First select the note
    await canvasPage.selectColor('pink'); // Then apply color
    await canvasPage.verifyNoteColor(note, 'pink');
    await canvasPage.editNote(note, 'Modified content');

    // Move the note
    await canvasPage.dragNote(note, 100, 100); // Move by offset
    const modifiedPosition = await canvasPage.getNotePosition(note);

    // Refresh and verify modifications persisted
    await canvasPage.page.reload({ waitUntil: 'domcontentloaded' });
    await canvasPage.waitForAppReady();
    await canvasPage.page.waitForTimeout(1000);

    const restoredNotes = await canvasPage.notes.all();
    expect(restoredNotes.length).toBe(1);

    const restoredNote = restoredNotes[0];

    // Verify all modifications persisted
    const restoredContent = await canvasPage.getNoteContent(restoredNote);
    expect(restoredContent.trim()).toBe('Modified content');

    await canvasPage.verifyNoteColor(restoredNote, 'pink');

    const restoredPosition = await canvasPage.getNotePosition(restoredNote);
    expect(Math.abs(restoredPosition.x - modifiedPosition.x)).toBeLessThan(10);
    expect(Math.abs(restoredPosition.y - modifiedPosition.y)).toBeLessThan(10);
  });

  test('Basic Menu Functionality', async () => {
    // User Journey: Create content → Use menu → Verify operations work

    // 1. User creates content
    const note1 = await canvasPage.createNote(400, 300);
    await canvasPage.editNoteContent('Menu Test Note', note1);

    // 2. User applies styling
    await canvasPage.selectNote(note1);
    await canvasPage.selectColor('pink');
    await canvasPage.verifyNoteColor(note1, 'pink');

    // 3. User opens kebab menu
    await canvasPage.page.click('#kebab-menu-button');
    await expect(
      canvasPage.page.locator('#kebab-context-menu.open'),
    ).toBeVisible();

    // 4. User can access menu options (verify menu works)
    const clearCanvasOption = canvasPage.page.locator(
      '.kebab-menu-item[data-action="clear-canvas"]',
    );
    await expect(clearCanvasOption).toBeVisible();

    const exportOption = canvasPage.page.locator(
      '.kebab-menu-item[data-action="copy-clipboard"]',
    );
    await expect(exportOption).toBeVisible();

    // 5. Close menu (don't actually clear - just verify menu works)
    await canvasPage.page.keyboard.press('Escape');
    await expect(
      canvasPage.page.locator('#kebab-context-menu.open'),
    ).toBeHidden();

    // 6. Verify note content is preserved using proper method
    const noteContent = note1.locator('.note-content');
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      await expect(noteContent).toHaveValue('Menu Test Note');
    } else {
      await expect(noteContent).toHaveText('Menu Test Note');
    }
  });
});
