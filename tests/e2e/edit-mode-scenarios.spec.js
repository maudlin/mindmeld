// tests/e2e/edit-mode-scenarios.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('MM-173: Edit Mode Click Detection Scenarios', () => {
  test('Empty note should enter edit mode when clicked @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load('desktop'); // Explicit desktop mode

    // Create a completely empty note
    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Verify it's empty and in view mode
    await expect(noteContent).toHaveAttribute('data-markdown', '');
    await canvasPage.assertNoteInViewMode(noteContent);

    // Click should trigger edit mode
    await noteContent.click();
    await page.waitForTimeout(100); // Wait for element replacement

    // Re-query after mode change
    const editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);
  });

  test('Unstyled text note should enter edit mode when clicked @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load('desktop');

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Set up unstyled text content
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute('data-markdown', 'Simple text content');
        noteContentDiv.textContent = 'Simple text content'; // Plain text, no HTML
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      await note.getAttribute('id'),
    );

    // Verify starting state
    await canvasPage.assertNoteInViewMode(noteContent);
    await canvasPage.assertNoteContent(noteContent, 'Simple text content');

    // Click should trigger edit mode
    await noteContent.click();
    await page.waitForTimeout(100); // Wait for element replacement

    // Re-query after mode change and verify edit mode with original markdown
    const editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);
    await canvasPage.assertNoteContent(editContent, 'Simple text content');
  });

  test('Styled note (with HTML) should enter edit mode when clicked @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load('desktop');

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Set up styled content with HTML (like the failing test)
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute(
          'data-markdown',
          '# Test Header\n**Bold** content',
        );
        noteContentDiv.innerHTML =
          '<h1>Test Header</h1><p><strong>Bold</strong> content</p>';
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      await note.getAttribute('id'),
    );

    // Verify starting state shows rendered HTML
    await canvasPage.assertNoteInViewMode(noteContent);

    const headerElement = noteContent.locator('h1');
    await expect(headerElement).toBeVisible();
    await expect(headerElement).toHaveText('Test Header');

    const boldElement = noteContent.locator('strong');
    await expect(boldElement).toBeVisible();
    await expect(boldElement).toHaveText('Bold');

    // Click on the note-content div should trigger edit mode
    await noteContent.click();
    await page.waitForTimeout(100); // Wait for element replacement

    // Re-query after mode change and verify raw markdown
    const editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    await canvasPage.assertNoteContentContains(editContent, '# Test Header');
    await canvasPage.assertNoteContentContains(editContent, '**Bold**');
    await canvasPage.assertNoteContentDoesNotContain(editContent, '<h1>');
    await canvasPage.assertNoteContentDoesNotContain(editContent, '<strong>');
  });

  test('Clicking on HTML elements inside styled note should still trigger edit mode @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load('desktop');

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Set up styled content
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute(
          'data-markdown',
          '# Click Target\n**Bold text**',
        );
        noteContentDiv.innerHTML =
          '<h1>Click Target</h1><p><strong>Bold text</strong></p>';
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      await note.getAttribute('id'),
    );

    // Verify H1 is visible but click on note-content (child elements have pointer-events: none)
    const headerElement = noteContent.locator('h1');
    await expect(headerElement).toBeVisible();
    await noteContent.click(); // Click parent since child has pointer-events: none
    await page.waitForTimeout(100); // Wait for element replacement

    // Re-query after mode change and verify edit mode
    const editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    await canvasPage.assertNoteContentContains(editContent, '# Click Target');
    await canvasPage.assertNoteContentContains(editContent, '**Bold text**');
  });

  test('Clicking on deeply nested HTML elements should trigger edit mode @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load('desktop');

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Set up deeply nested content
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute(
          'data-markdown',
          '# Header\n**Bold *italic* text**',
        );
        noteContentDiv.innerHTML =
          '<h1>Header</h1><p><strong>Bold <em>italic</em> text</strong></p>';
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      await note.getAttribute('id'),
    );

    // Verify deeply nested <em> element is visible but click on note-content
    const italicElement = noteContent.locator('em');
    await expect(italicElement).toBeVisible();
    await expect(italicElement).toHaveText('italic');
    await noteContent.click(); // Click parent since child has pointer-events: none
    await page.waitForTimeout(100); // Wait for element replacement

    // Re-query after mode change and verify edit mode
    const editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    await canvasPage.assertNoteContentContains(editContent, '# Header');
    await canvasPage.assertNoteContentContains(
      editContent,
      '**Bold *italic* text**',
    );
  });

  test('Edit mode to view mode transition preserves content @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load('desktop');

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Start with some initial content in view mode
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute('data-markdown', '# Original');
        noteContentDiv.innerHTML = '<h1>Original</h1>';
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      await note.getAttribute('id'),
    );

    // Click to enter edit mode properly through EditModeController
    await noteContent.click();
    await page.waitForTimeout(100); // Wait for element replacement

    let editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    // Modify content - use actual newline, not escaped
    await editContent.fill('# Modified Header\n**New content**');

    // Click outside to trigger view mode
    await page.click('#canvas');
    await page.waitForTimeout(100); // Allow for processing

    // Re-query after mode change
    const viewContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInViewMode(viewContent);

    // Check that markdown was rendered (h1 and strong tags exist)
    const headerElement = viewContent.locator('h1');
    await expect(headerElement).toBeVisible();

    const boldElement = viewContent.locator('strong');
    await expect(boldElement).toBeVisible();

    // Click again should show the modified markdown in edit mode
    await viewContent.click();
    await page.waitForTimeout(100); // Wait for element replacement

    editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    // Check that both parts of the markdown are present
    await canvasPage.assertNoteContentContains(
      editContent,
      '# Modified Header',
    );
    await canvasPage.assertNoteContentContains(editContent, '**New content**');
  });
});
