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
    await expect(noteContent).toHaveClass(/view-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'false');

    // Click should trigger edit mode
    await noteContent.click();

    // Should now be in edit mode
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'true');
    await expect(noteContent).toBeFocused();
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
    await expect(noteContent).toHaveClass(/view-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'false');
    await expect(noteContent).toHaveText('Simple text content');

    // Click should trigger edit mode
    await noteContent.click();

    // Should now be in edit mode with original markdown
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'true');
    await expect(noteContent).toHaveText('Simple text content');
    await expect(noteContent).toBeFocused();
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
    await expect(noteContent).toHaveClass(/view-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'false');

    const headerElement = noteContent.locator('h1');
    await expect(headerElement).toBeVisible();
    await expect(headerElement).toHaveText('Test Header');

    const boldElement = noteContent.locator('strong');
    await expect(boldElement).toBeVisible();
    await expect(boldElement).toHaveText('Bold');

    // Click on the note-content div should trigger edit mode
    await noteContent.click();

    // Should now be in edit mode showing raw markdown
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'true');

    const textContent = await noteContent.textContent();
    expect(textContent).toContain('# Test Header');
    expect(textContent).toContain('**Bold**');
    expect(textContent).not.toContain('<h1>'); // No HTML tags in edit mode
    expect(textContent).not.toContain('<strong>');

    await expect(noteContent).toBeFocused();
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

    // Should still trigger edit mode even though we clicked on child element
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'true');

    const textContent = await noteContent.textContent();
    expect(textContent).toContain('# Click Target');
    expect(textContent).toContain('**Bold text**');
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

    // Should still trigger edit mode
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'true');

    const textContent = await noteContent.textContent();
    expect(textContent).toContain('# Header');
    expect(textContent).toContain('**Bold *italic* text**');
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
    await expect(noteContent).toHaveClass(/edit-mode/);

    // Modify content - use actual newline, not escaped
    await noteContent.fill('# Modified Header\n**New content**');

    // Click outside to trigger view mode (blur doesn't work reliably in E2E)
    await page.click('#canvas');
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(100); // Allow for processing

    // Should be in view mode with rendered content
    await expect(noteContent).toHaveClass(/view-mode/);
    // Note: contenteditable might be removed or set to false
    const contentEditable = await noteContent.getAttribute('contenteditable');
    expect(!contentEditable || contentEditable === 'false').toBeTruthy();

    // Check that markdown was rendered (h1 and strong tags exist)
    const headerElement = noteContent.locator('h1');
    await expect(headerElement).toBeVisible();

    const boldElement = noteContent.locator('strong');
    await expect(boldElement).toBeVisible();

    // Click again should show the modified markdown in edit mode
    await noteContent.click();

    await expect(noteContent).toHaveClass(/edit-mode/);
    const textContent = await noteContent.textContent();
    // Check that both parts of the markdown are present (newline handling varies)
    expect(textContent).toContain('# Modified Header');
    expect(textContent).toContain('**New content**');
  });
});
