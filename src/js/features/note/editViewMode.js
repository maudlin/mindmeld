// editViewMode.js - Pure Display Formatter for Edit vs View Mode
// Handles display switching between raw markdown editing and rendered HTML viewing
// Does NOT handle interactions - existing system handles all focus/blur/click/touch

import { renderMarkdown } from '../markdown/markdownRenderer.js';
import { defangToPlainText } from '../markdown/defangPipeline.js';
import { noteManager } from '../../services/noteManager.js';
import { eventBus } from '../../core/eventBus.js';

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

  // Capture current height before changing content
  const currentHeight = noteContent.offsetHeight;

  // Store the parent for replacing the element
  const parent = noteContent.parentNode;

  // Create textarea to REPLACE note-content (not go inside it)
  const textarea = document.createElement('textarea');
  textarea.value = cleanedMarkdown;
  // CRITICAL: Give textarea both classes so event handlers recognize it
  textarea.className = 'note-content edit-mode edit-textarea';
  textarea.rows = 1; // Start with single row to prevent default 2-row height

  // Copy the data-markdown attribute
  textarea.setAttribute('data-markdown', cleanedMarkdown);

  // Copy relevant styles and attributes
  textarea.style.width = '100%';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.resize = 'none';
  textarea.style.background = 'transparent';
  textarea.style.fontFamily = "'Inter', sans-serif";
  textarea.style.fontSize = '0.9em';
  textarea.style.fontWeight = '400';
  textarea.style.lineHeight = '1.4';
  textarea.style.color = '#333';
  textarea.style.textAlign = 'center';
  textarea.style.padding = '0';
  textarea.style.margin = '0';

  // Set initial height to match the original note height exactly
  textarea.style.height = currentHeight + 'px';

  // Auto-resize textarea to fit content
  function resizeTextarea() {
    // Save current scroll position
    const scrollTop = textarea.scrollTop;

    // Temporarily set to small height to measure actual content height
    textarea.style.height = '1px';

    // Get the actual scroll height needed for content
    const contentHeight = textarea.scrollHeight;

    // Set height to fit content, ensuring minimum height for empty notes
    const minHeight = 24; // Matches .note-content min-height
    textarea.style.height = Math.max(contentHeight, minHeight) + 'px';

    // Restore scroll position
    textarea.scrollTop = scrollTop;
  }

  textarea.addEventListener('input', resizeTextarea);

  // Add Ctrl+Enter keybind to exit edit mode
  textarea.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      // Find the note element and emit exit edit mode request
      const note = textarea.closest('.note');
      if (note) {
        eventBus.emit('note.requestView', {
          noteId: note.id,
          noteElement: note,
        });
      }
    }
  });

  // REPLACE the note-content div with the textarea
  parent.replaceChild(textarea, noteContent);

  // Only resize initially if there's actual content that might need more space
  if (cleanedMarkdown && cleanedMarkdown.trim()) {
    // Defer to next tick to ensure textarea is rendered
    setTimeout(() => {
      resizeTextarea();
    }, 0);
  }

  // Note: Mode state is already set on the textarea element itself
  // The old noteContent div has been replaced

  // Handle note selection when entering edit mode
  const note = textarea.closest('.note');
  if (note) {
    // Clear other selections and select this note
    noteManager.clearSelections();
    noteManager.selectNote(note);
  }

  // Focus the textarea
  setTimeout(() => textarea.focus(), 0);

  // Return the textarea so callers can reference the new element
  return textarea;
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

  // Check if noteContent itself is a textarea (new approach)
  if (
    noteContent.tagName === 'TEXTAREA' &&
    noteContent.classList.contains('edit-textarea')
  ) {
    return noteContent.value;
  }

  if (noteContent.classList.contains('edit-mode')) {
    // Legacy: In edit mode, get content from textarea inside
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
