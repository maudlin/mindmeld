// src/js/services/markdownContentService.js

/**
 * Markdown Content Service - Clean Separation of Concerns
 *
 * This service provides a clear boundary between:
 * - Raw content editing (textContent management)
 * - Markdown processing (defang + render pipeline)
 * - Content persistence (safe extraction for storage)
 *
 * This prevents the mixing of HTML-derived content with user-entered markdown.
 */

import { defangToPlainText } from '../features/markdown/defangPipeline.js';
import { renderMarkdown } from '../features/markdown/markdownRenderer.js';

/**
 * Safe content extraction that never corrupts markdown structure
 * @param {HTMLElement} noteContentElement - The note content DOM element
 * @returns {string} Safe markdown content
 */
export function extractMarkdownForStorage(noteContentElement) {
  if (!noteContentElement) {
    console.warn('extractMarkdownForStorage: No element provided');
    return '';
  }

  // Edit mode: User is actively typing - use textContent
  if (
    noteContentElement.classList.contains('edit-mode') ||
    noteContentElement.contentEditable === 'true'
  ) {
    const currentText = noteContentElement.textContent || '';
    console.log('📝 Extracting from edit mode:', {
      length: currentText.length,
      hasNewlines: currentText.includes('\n'),
    });
    return currentText;
  }

  // View mode: Use stored markdown data - NEVER textContent from HTML
  const storedMarkdown = noteContentElement.getAttribute('data-markdown') || '';

  if (!storedMarkdown) {
    // For newly created notes that haven't been through the full pipeline yet,
    // we might need to extract from textContent ONCE (if not HTML-derived)
    const hasHTML =
      noteContentElement.innerHTML &&
      noteContentElement.innerHTML.includes('<');

    if (!hasHTML && noteContentElement.textContent) {
      // This appears to be a new note with plain text, not HTML-rendered content
      console.log(
        '⚠️ Extracting from new note textContent (one-time migration)',
      );
      return noteContentElement.textContent;
    }

    console.warn(
      'extractMarkdownForStorage: No data-markdown found and content appears HTML-rendered. Refusing to extract corrupted content.',
    );
    return '';
  }

  console.log('📖 Extracting from view mode data-markdown:', {
    length: storedMarkdown.length,
    hasNewlines: storedMarkdown.includes('\n'),
  });
  return storedMarkdown;
}

/**
 * Process raw user input through the security pipeline
 * @param {string} rawInput - Raw user input
 * @returns {string} Sanitized markdown
 */
export function processUserInput(rawInput) {
  if (typeof rawInput !== 'string') {
    console.warn('processUserInput: Invalid input type:', typeof rawInput);
    return '';
  }

  // Run through defang pipeline (security first)
  const sanitized = defangToPlainText(rawInput, false);

  console.log('🔒 User input processed:', {
    original: rawInput.length,
    sanitized: sanitized.length,
    newlinesPreserved: sanitized.includes('\n'),
  });

  return sanitized;
}

/**
 * Render sanitized markdown to safe HTML for display
 * @param {string} sanitizedMarkdown - Sanitized markdown from processUserInput
 * @returns {string} Safe HTML
 */
export function renderMarkdownForDisplay(sanitizedMarkdown) {
  if (!sanitizedMarkdown || typeof sanitizedMarkdown !== 'string') {
    return '';
  }

  const html = renderMarkdown(sanitizedMarkdown);

  console.log('🎨 Markdown rendered:', {
    markdown: sanitizedMarkdown.length,
    html: html.length,
    structure: html.includes('<h1>')
      ? 'headers'
      : html.includes('<ul>')
        ? 'lists'
        : 'text',
  });

  return html;
}

/**
 * Complete content lifecycle: raw input → sanitized → rendered
 * @param {string} rawInput - Raw user input
 * @returns {object} { sanitized: string, html: string }
 */
export function processContentForDisplay(rawInput) {
  const sanitized = processUserInput(rawInput);
  const html = renderMarkdownForDisplay(sanitized);

  return { sanitized, html };
}

/**
 * Set up a note element in view mode with proper data storage
 * @param {HTMLElement} noteContentElement - The note content element
 * @param {string} markdownContent - The markdown content to display
 */
export function setupViewMode(noteContentElement, markdownContent) {
  const { sanitized, html } = processContentForDisplay(markdownContent);

  // Store the sanitized markdown for future extraction
  noteContentElement.setAttribute('data-markdown', sanitized);

  // Display the rendered HTML
  // eslint-disable-next-line no-unsanitized/property
  noteContentElement.innerHTML = html;

  // Set up view mode state
  noteContentElement.contentEditable = 'false';
  noteContentElement.classList.remove('edit-mode');
  noteContentElement.classList.add('view-mode');

  console.log('👁️ View mode setup complete:', {
    storedMarkdown: sanitized.length,
    renderedHTML: html.length,
  });
}

/**
 * Set up a note element in edit mode with safe content
 * @param {HTMLElement} noteContentElement - The note content element
 * @param {string} markdownContent - The markdown content to edit
 */
export function setupEditMode(noteContentElement, markdownContent) {
  const sanitized = processUserInput(markdownContent);

  // Store for future reference
  noteContentElement.setAttribute('data-markdown', sanitized);

  // Show raw markdown for editing
  noteContentElement.textContent = sanitized;

  // Set up edit mode state
  noteContentElement.contentEditable = 'true';
  noteContentElement.classList.remove('view-mode');
  noteContentElement.classList.add('edit-mode');

  console.log('✏️ Edit mode setup complete:', {
    editingContent: sanitized.length,
    hasNewlines: sanitized.includes('\n'),
  });
}
