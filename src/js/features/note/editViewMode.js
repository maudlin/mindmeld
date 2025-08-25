// editViewMode.js - Pure Display Formatter for Edit vs View Mode
// Handles display switching between raw markdown editing and rendered HTML viewing
// Does NOT handle interactions - existing system handles all focus/blur/click/touch

import { renderMarkdown } from '../markdown/markdownRenderer.js';
import { defangToPlainText } from '../markdown/defangPipeline.js';

/**
 * Display note content in view mode (rendered HTML, not editable)
 * Pure display formatter - does not handle interactions
 * @param {HTMLElement} noteContent - The note content element
 * @param {string} markdownContent - The raw markdown content to render
 */
export function displayAsViewMode(noteContent, markdownContent = '') {
  // Clean and store the markdown content
  const cleanedMarkdown = defangToPlainText(markdownContent, false);
  noteContent.setAttribute('data-markdown', cleanedMarkdown);

  // Simple check: only render as markdown if it contains common markdown syntax
  if (
    cleanedMarkdown.includes('#') ||
    cleanedMarkdown.includes('**') ||
    cleanedMarkdown.includes('*') ||
    cleanedMarkdown.includes('-')
  ) {
    // Render markdown to HTML
    const renderedHTML = renderMarkdown(cleanedMarkdown);
    // eslint-disable-next-line no-unsanitized/property
    noteContent.innerHTML = renderedHTML;
  } else {
    // Plain text - keep as textContent to preserve original behavior
    noteContent.textContent = cleanedMarkdown;
  }

  // In view mode, contentEditable should be false to prevent editing
  // Clicking will be handled by DesktopAdapter to trigger edit mode
  noteContent.contentEditable = false;

  // Track mode state
  noteContent.classList.remove('edit-mode');
  noteContent.classList.add('view-mode');
}

/**
 * Display note content in edit mode (raw markdown, editable)
 * Pure display formatter - does not handle interactions
 * @param {HTMLElement} noteContent - The note content element
 * @param {string} markdownContent - The raw markdown content to edit (optional)
 */
export function displayAsEditMode(noteContent, markdownContent = null) {
  // Get markdown content from parameter or data attribute ONLY
  // Never fall back to textContent as it may be corrupted HTML-derived text
  const rawMarkdown =
    markdownContent || noteContent.getAttribute('data-markdown') || '';

  // Debug warning if no markdown content found
  if (!rawMarkdown && markdownContent === null) {
    console.warn(
      'displayAsEditMode: No markdown content found. data-markdown may be missing.',
    );
  }

  // Clean and store the markdown content
  const cleanedMarkdown = defangToPlainText(rawMarkdown, false);
  noteContent.setAttribute('data-markdown', cleanedMarkdown);

  // Create textarea for proper newline handling
  noteContent.innerHTML = '';

  const textarea = document.createElement('textarea');
  textarea.value = cleanedMarkdown;
  textarea.className = 'edit-textarea';

  // Copy relevant styles and attributes
  textarea.style.width = '100%';
  textarea.style.height = 'auto';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.resize = 'none';
  textarea.style.background = 'transparent';
  textarea.style.fontFamily = 'inherit';
  textarea.style.fontSize = 'inherit';
  textarea.style.lineHeight = 'inherit';
  textarea.style.color = 'inherit';
  textarea.style.padding = '0';
  textarea.style.margin = '0';

  // Auto-resize textarea to fit content
  function resizeTextarea() {
    // Save current scroll position
    const scrollTop = textarea.scrollTop;

    // Reset height to get accurate measurement
    textarea.style.height = 'auto';

    // Set to scrollHeight to fit content
    textarea.style.height = textarea.scrollHeight + 'px';

    // Restore scroll position
    textarea.scrollTop = scrollTop;
  }

  textarea.addEventListener('input', resizeTextarea);

  noteContent.appendChild(textarea);

  // Defer initial resize to next tick to ensure proper rendering
  setTimeout(() => {
    resizeTextarea();
  }, 0);

  // Track mode state
  noteContent.classList.remove('view-mode');
  noteContent.classList.add('edit-mode');

  // Focus the textarea
  setTimeout(() => textarea.focus(), 0);
}

/**
 * Get the current markdown content from a note
 * @param {HTMLElement} noteContent - The note content element
 * @returns {string} The current markdown content
 */
export function getCurrentMarkdownContent(noteContent) {
  if (!noteContent || typeof noteContent.classList === 'undefined') {
    console.warn('getCurrentMarkdownContent: Invalid noteContent element');
    return '';
  }

  if (noteContent.classList.contains('edit-mode')) {
    // In edit mode, get content from textarea
    const textarea = noteContent.querySelector('textarea.edit-textarea');
    const content = textarea ? textarea.value : '';
    return content;
  } else {
    // Get from stored markdown attribute ONLY - never fall back to textContent (corrupted HTML-derived)
    const storedMarkdown = noteContent.getAttribute('data-markdown') || '';

    if (!storedMarkdown) {
      console.warn(
        'getCurrentMarkdownContent: No data-markdown found in view mode. Content may be lost.',
      );
    }

    return storedMarkdown;
  }
}

/**
 * Load note with markdown content in view mode
 * Used when loading notes from storage
 * @param {HTMLElement} noteContent - The note content element
 * @param {string} markdownContent - The markdown content to load
 */
export function loadNoteInViewMode(noteContent, markdownContent = '') {
  displayAsViewMode(noteContent, markdownContent);
}

/**
 * Check if a note is currently in edit mode
 * @param {HTMLElement} noteContent - The note content element
 * @returns {boolean} True if in edit mode
 */
export function isInEditMode(noteContent) {
  return noteContent.classList.contains('edit-mode');
}

/**
 * Check if a note is currently in view mode
 * @param {HTMLElement} noteContent - The note content element
 * @returns {boolean} True if in view mode
 */
export function isInViewMode(noteContent) {
  return noteContent.classList.contains('view-mode');
}
