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

  test('Multi-Note and Color Workflow', async () => {
    // User Journey: Create multiple notes → Apply colors → Verify persistence

    // 1. User creates first note
    const note1 = await canvasPage.createNote(300, 250);
    await canvasPage.editNoteContent('First Note', note1);

    // 2. User creates second note
    const note2 = await canvasPage.createNote(500, 350);
    await canvasPage.editNoteContent('Second Note', note2);

    // 3. User applies color to first note
    await canvasPage.selectNote(note1);
    await canvasPage.selectColor('blue');
    await canvasPage.verifyNoteColor(note1, 'blue');

    // 4. User selects both notes using selection box
    await canvasPage.createSelectionBox(250, 200, 550, 400);
    await canvasPage.verifyNotesSelected(2);

    // 5. Apply color to both selected notes
    await canvasPage.selectColor('green');
    await canvasPage.verifyNoteColor(note1, 'green');
    await canvasPage.verifyNoteColor(note2, 'green');

    // 6. Verify persistence after reload
    await canvasPage.page.reload();
    await canvasPage.waitForAppReady();

    const persistedNotes = canvasPage.page.locator('.note');
    await expect(persistedNotes).toHaveCount(2);

    // Verify colors persisted
    const persistedNote1 = persistedNotes.first();
    const persistedNote2 = persistedNotes.last();
    await canvasPage.verifyNoteColor(persistedNote1, 'green');
    await canvasPage.verifyNoteColor(persistedNote2, 'green');
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
