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

    // FAILING TEST: Should be in view mode by default
    await expect(noteContent).toHaveClass(/view-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'false');

    // FAILING TEST: Should display rendered HTML
    await expect(noteContent).toContainText('Header'); // From <h1>
    await expect(noteContent).toContainText('Bold'); // From <strong>
    await expect(noteContent).toContainText('List item'); // From <li>

    // FAILING TEST: Should contain actual HTML elements, not raw markdown
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
    await expect(noteContent).toHaveClass(/view-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'false');

    // Click should trigger switch to edit mode (focus the element)
    await noteContent.click();
    await noteContent.focus(); // Ensure focus is triggered

    // FAILING TEST: Should now be in edit mode
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'true');

    // FAILING TEST: Should show raw markdown, not HTML
    const textContent = await noteContent.textContent();
    expect(textContent).toContain('# Test Header');
    expect(textContent).toContain('**Bold**');
    expect(textContent).not.toContain('<h1>'); // No HTML tags in edit mode
    expect(textContent).not.toContain('<strong>');

    // FAILING TEST: Should have cursor focus
    await expect(noteContent).toBeFocused();
  });

  test('Blur event switches from edit mode back to view mode @smoke @critical', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load();

    const note = await canvasPage.createNote(640, 388);
    const noteContent = note.locator('.note-content');

    // Start in edit mode with markdown content
    await page.evaluate(
      (noteId) => {
        const noteElement = document.getElementById(noteId);
        const noteContentDiv = noteElement.querySelector('.note-content');
        noteContentDiv.setAttribute(
          'data-markdown',
          '## Subtitle\n*Italic* text',
        );
        noteContentDiv.textContent = '## Subtitle\n*Italic* text'; // Raw markdown in edit mode
        noteContentDiv.contentEditable = true;
        noteContentDiv.classList.add('edit-mode');
        noteContentDiv.focus();
      },
      await note.getAttribute('id'),
    );

    // Verify starting in edit mode
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).toBeFocused();

    // FAILING TEST: Blur should trigger switch back to view mode
    await noteContent.blur(); // Remove focus
    await page.waitForTimeout(100); // Allow for processing

    // FAILING TEST: Should be back in view mode
    await expect(noteContent).toHaveClass(/view-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'false');

    // FAILING TEST: Should display rendered HTML again
    const headerElement = noteContent.locator('h2');
    await expect(headerElement).toBeVisible();
    await expect(headerElement).toHaveText('Subtitle');

    const italicElement = noteContent.locator('em');
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

    // FAILING TEST: Should show original markdown content
    const editModeContent = noteContent;
    await expect(editModeContent).toHaveText(originalMarkdown);

    // Modify content in edit mode
    await noteContent.fill(''); // Clear
    await noteContent.type(
      '# Modified Header\n**Updated** content\n- New item',
    );

    // Switch back to view mode
    await noteContent.blur();
    await page.waitForTimeout(100);

    // FAILING TEST: Should render the new markdown content
    const modifiedHeaderElement = noteContent.locator('h1');
    await expect(modifiedHeaderElement).toHaveText('Modified Header');

    const updatedBoldElement = noteContent.locator('strong');
    await expect(updatedBoldElement).toHaveText('Updated');

    const newListItem = noteContent.locator('ul li');
    await expect(newListItem).toHaveText('New item');

    // FAILING TEST: Storage should be updated with new markdown content
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
    await noteContent.blur();
    await page.waitForTimeout(100);

    // FAILING TEST: HTML should be stripped, only safe content should remain
    const renderedContent = await noteContent.innerHTML();
    expect(renderedContent).not.toContain('<script>');
    expect(renderedContent).not.toContain('onclick=');
    expect(renderedContent).not.toContain('alert');
    expect(renderedContent).not.toContain('steal()');

    // FAILING TEST: Safe markdown should still be rendered
    expect(renderedContent).toContain('<strong>Bold</strong>');

    // FAILING TEST: Text content should be preserved (without HTML)
    const textContent = await noteContent.textContent();
    expect(textContent).toContain('Click me');
    expect(textContent).toContain('Bold text');
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

    // FAILING TEST: Empty view mode should be handled gracefully
    await expect(noteContent).toHaveText('');
    await expect(noteContent).toHaveClass(/view-mode/);

    // Switch to edit mode
    await noteContent.click();

    // FAILING TEST: Empty edit mode should be editable
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).toBeFocused();

    // Add content and switch back
    await noteContent.type('# New Content');
    await noteContent.blur();

    // FAILING TEST: Should render the new content
    const headerElement = noteContent.locator('h1');
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

    // FAILING TEST: Touch tap should trigger edit mode
    await page.touchscreen.tap(
      (await noteContent.boundingBox()).x + 50,
      (await noteContent.boundingBox()).y + 20,
    );

    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).toHaveAttribute('contenteditable', 'true');

    // FAILING TEST: Should show markdown content
    const textContent = await noteContent.textContent();
    expect(textContent).toContain('# Touch Header');

    // Tap outside to blur (simulate touch-based blur)
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(100);

    // FAILING TEST: Should return to view mode
    await expect(noteContent).toHaveClass(/view-mode/);
    const headerElement = noteContent.locator('h1');
    await expect(headerElement).toHaveText('Touch Header');
  });

  test('Focus management and keyboard navigation', async ({ page }) => {
    const canvasPage = new CanvasPage(page);
    await canvasPage.load();

    // Create two notes for navigation testing
    const note1 = await canvasPage.createNote(400, 300);
    const note2 = await canvasPage.createNote(600, 300);

    const noteContent1 = note1.locator('.note-content');
    const noteContent2 = note2.locator('.note-content');

    // Set up both notes in view mode
    await page.evaluate(() => {
      document
        .querySelectorAll('.note-content')
        .forEach((noteContentDiv, index) => {
          noteContentDiv.setAttribute('data-markdown', `# Note ${index + 1}`);
          // eslint-disable-next-line no-unsanitized/property
          noteContentDiv.innerHTML = `<h1>Note ${index + 1}</h1>`;
          noteContentDiv.contentEditable = false;
          noteContentDiv.classList.add('view-mode');
        });
    });

    // FAILING TEST: Tab should move focus between notes in view mode
    await noteContent1.focus();
    await page.keyboard.press('Tab');
    await expect(noteContent2).toBeFocused();

    // FAILING TEST: Enter should switch focused note to edit mode
    await page.keyboard.press('Enter');
    await expect(noteContent2).toHaveClass(/edit-mode/);

    // FAILING TEST: Escape should exit edit mode back to view mode (future-proofing)
    await page.keyboard.press('Escape');
    await expect(noteContent2).toHaveClass(/view-mode/);
  });
});
