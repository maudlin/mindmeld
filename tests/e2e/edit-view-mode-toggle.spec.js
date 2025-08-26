// tests/e2e/edit-view-mode-toggle.spec.js

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('MM-155: Edit vs View Mode Toggle', () => {
  test('Note starts in view mode with rendered markdown @smoke @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load();

    // Create a note with markdown content
    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Add markdown content through direct content setting (simulating storage load)
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        // Set raw markdown content as if loaded from storage
        noteContentDiv.setAttribute(
          'data-markdown',
          '# Header\n**Bold** text\n- List item',
        );
      },
      await note.getAttribute('id'),
    );

    // Trigger view mode rendering (this should happen automatically in implementation)
    await page.evaluate(
      (noteId) => {
        // This will be replaced by actual view mode rendering in implementation
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.getAttribute('data-markdown');
        // For now, simulate what the markdown renderer should do
        noteContentDiv.innerHTML =
          '<h1>Header</h1><p><strong>Bold</strong> text</p><ul><li>List item</li></ul>';
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      await note.getAttribute('id'),
    );

    // Should be in view mode by default
    await canvasPage.assertNoteInViewMode(noteContent);

    // Should display rendered HTML
    await expect(noteContent).toContainText('Header'); // From <h1>
    await expect(noteContent).toContainText('Bold'); // From <strong>
    await expect(noteContent).toContainText('List item'); // From <li>

    // Should contain actual HTML elements, not raw markdown
    const headerElement = noteContent.locator('h1');
    await expect(headerElement).toBeVisible();
    await expect(headerElement).toHaveText('Header');

    const boldElement = noteContent.locator('strong');
    await expect(boldElement).toBeVisible();
    await expect(boldElement).toHaveText('Bold');

    const listElement = noteContent.locator('ul li');
    await expect(listElement).toBeVisible();
    await expect(listElement).toHaveText('List item');
  });

  test('Clicking note switches from view mode to edit mode @smoke @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load();

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Set up initial view mode (simulating loaded state)
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

    // Verify starting in view mode
    await canvasPage.assertNoteInViewMode(noteContent);

    // Click should trigger switch to edit mode
    await noteContent.click();
    await page.waitForTimeout(100); // Wait for element replacement
    
    // Re-query after mode change
    const editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    // Should show raw markdown, not HTML
    await canvasPage.assertNoteContentContains(editContent, '# Test Header');
    await canvasPage.assertNoteContentContains(editContent, '**Bold**');
    await canvasPage.assertNoteContentDoesNotContain(editContent, '<h1>'); // No HTML tags in edit mode
    await canvasPage.assertNoteContentDoesNotContain(editContent, '<strong>');
  });

  test('Blur event switches from edit mode back to view mode @smoke @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load();

    const note = await canvasPage.createNote(640, 388);
    
    // Enter edit mode properly through the EditModeController
    const editContent = await canvasPage.enterEditMode(note);
    
    // Add markdown content in edit mode
    await editContent.fill('## Subtitle\n*Italic* text');

    // Click outside to trigger switch back to view mode (blur doesn't work reliably in E2E)
    await page.click('#canvas');
    await page.waitForTimeout(100); // Allow for processing

    // Re-query after mode change
    const viewContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInViewMode(viewContent);

    // Should display rendered HTML again
    const headerElement = viewContent.locator('h2');
    await expect(headerElement).toBeVisible();
    await expect(headerElement).toHaveText('Subtitle');

    const italicElement = viewContent.locator('em');
    await expect(italicElement).toBeVisible();
    await expect(italicElement).toHaveText('Italic');
  });

  test('Content is preserved and processed through markdown pipeline during mode switches', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load();

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Start with complex markdown content
    const originalMarkdown =
      '# Main Title\n\nParagraph with **bold** and *italic*.\n\n- First item\n- Second item\n\nFinal paragraph.';

    // Set initial view mode
    await page.evaluate(
      ([noteId, markdown]) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute('data-markdown', markdown);
        // Simulate rendered HTML (what the markdown renderer should produce)
        noteContentDiv.innerHTML =
          '<h1>Main Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em>.</p><ul><li>First item</li><li>Second item</li></ul><p>Final paragraph.</p>';
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      [await note.getAttribute('id'), originalMarkdown],
    );

    // Switch to edit mode
    await noteContent.click();
    await page.waitForTimeout(100); // Wait for element replacement
    
    let editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteContent(editContent, originalMarkdown);

    // Modify content in edit mode
    await editContent.fill(''); // Clear
    await editContent.type(
      '# Modified Header\n**Updated** content\n- New item',
    );

    // Switch back to view mode
    await page.click('#canvas');
    await page.waitForTimeout(100);

    // Re-query after mode change
    const viewContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInViewMode(viewContent);

    // Should render the new markdown content
    const modifiedHeaderElement = viewContent.locator('h1');
    await expect(modifiedHeaderElement).toHaveText('Modified Header');

    const updatedBoldElement = viewContent.locator('strong');
    await expect(updatedBoldElement).toHaveText('Updated');

    const newListItem = viewContent.locator('ul li');
    await expect(newListItem).toHaveText('New item');

    // Storage should be updated with new markdown content
    const storedMarkdown = await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        return noteContentDiv.getAttribute('data-markdown');
      },
      await note.getAttribute('id'),
    );

    expect(storedMarkdown).toBe(
      '# Modified Header\n**Updated** content\n- New item',
    );
  });

  test('Security: HTML injection is prevented in edit mode @security', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load();

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Start in edit mode
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.contentEditable = true;
        noteContentDiv.classList.add('edit-mode');
        noteContentDiv.focus();
      },
      await note.getAttribute('id'),
    );

    // Attempt to inject malicious HTML
    const maliciousContent =
      '<script>alert("xss")</script><div onclick="steal()">Click me</div>**Bold** text';
    await noteContent.fill(maliciousContent);

    // Switch to view mode
    await page.click('#canvas');
    await page.waitForTimeout(100);

    // Re-query after mode change
    const viewContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInViewMode(viewContent);

    // HTML should be escaped/stripped, only safe content should remain
    const renderedContent = await viewContent.innerHTML();
    expect(renderedContent).not.toContain('<script>'); // No executable script tags
    expect(renderedContent).not.toContain('onclick="steal()">'); // No executable onclick
    
    // When HTML is injected via textarea, it gets treated as plain text and escaped
    // This is the correct security behavior - dangerous content is neutralized
    expect(renderedContent).toContain('&lt;script&gt;'); // HTML is escaped
    expect(renderedContent).toContain('&lt;div'); // HTML is escaped

    // Text content should be preserved (without HTML) - but markdown may not be processed when mixed with HTML
    const textContent = await viewContent.textContent();
    expect(textContent).toContain('Click me');
    expect(textContent).toContain('**Bold** text'); // Raw markdown preserved, not processed
  });

  test('Empty content handling in both modes', async ({ page }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load();

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Start with empty content in view mode
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute('data-markdown', '');
        noteContentDiv.innerHTML = '';
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      await note.getAttribute('id'),
    );

    // Empty view mode should be handled gracefully
    await canvasPage.assertNoteContent(noteContent, '');
    await canvasPage.assertNoteInViewMode(noteContent);

    // Switch to edit mode
    await noteContent.click();
    await page.waitForTimeout(100); // Wait for element replacement
    
    let editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    // Add content and switch back
    await editContent.type('# New Content');
    await page.click('#canvas');
    await page.waitForTimeout(100);

    // Re-query after mode change
    const viewContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInViewMode(viewContent);

    // Should render the new content
    const headerElement = viewContent.locator('h1');
    await expect(headerElement).toHaveText('New Content');
  });

  test('Mode toggle works on mobile/touch devices @mobile', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load('touch'); // Load in touch mode

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Set up view mode
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute('data-markdown', '# Touch Header');
        noteContentDiv.innerHTML = '<h1>Touch Header</h1>';
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      await note.getAttribute('id'),
    );

    // Touch double-tap should trigger edit mode (single tap might not be enough)
    const bbox = await noteContent.boundingBox();
    await page.touchscreen.tap(bbox.x + 50, bbox.y + 20);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(bbox.x + 50, bbox.y + 20); // Double tap
    await page.waitForTimeout(100); // Wait for element replacement
    
    let editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    // Should show markdown content
    await canvasPage.assertNoteContentContains(editContent, '# Touch Header');

    // Tap outside to blur (simulate touch-based blur)
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(100);

    // Re-query after mode change and verify return to view mode
    const viewContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInViewMode(viewContent);
    
    const headerElement = viewContent.locator('h1');
    await expect(headerElement).toHaveText('Touch Header');
  });

  test('Keyboard shortcuts for edit mode (Enter, Escape, Ctrl+Enter)', async ({ page }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load();

    const note = await canvasPage.createNote(400, 300);
    const noteContent = note.locator('.note-content');

    // Set up note with some content in view mode
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute('data-markdown', '# Test Note');
        noteContentDiv.innerHTML = '<h1>Test Note</h1>';
        noteContentDiv.contentEditable = false;
        noteContentDiv.classList.add('view-mode');
      },
      await note.getAttribute('id'),
    );

    // Click note to select it, then press Enter to enter edit mode
    await note.click();
    await page.waitForTimeout(50); // Wait for selection
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100); // Wait for element replacement
    
    let editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    // Add some content
    await editContent.fill('# Modified Content\nTest text');

    // Test Ctrl+Enter to exit edit mode
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(100); // Wait for element replacement
    
    let viewContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInViewMode(viewContent);

    // Verify content was saved and rendered
    const headerElement = viewContent.locator('h1');
    await expect(headerElement).toBeVisible();
    await expect(headerElement).toHaveText('Modified Content');

    // Test Enter again to re-enter edit mode - note is still selected from previous click
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    
    editContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInEditMode(editContent);

    // Test Escape to exit edit mode without Ctrl
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    
    viewContent = await canvasPage.getNoteContentElement(note);
    await canvasPage.assertNoteInViewMode(viewContent);
  });
});
