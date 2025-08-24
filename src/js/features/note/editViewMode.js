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
  // Get markdown content from parameter, data attribute, or current text
  const rawMarkdown =
    markdownContent ||
    noteContent.getAttribute('data-markdown') ||
    noteContent.textContent ||
    '';

  // Clean and store the markdown content
  const cleanedMarkdown = defangToPlainText(rawMarkdown, false);
  noteContent.setAttribute('data-markdown', cleanedMarkdown);

  // Show raw markdown for editing - only content changes, no visual styling changes
  noteContent.textContent = cleanedMarkdown;
  noteContent.contentEditable = true;

  // Track mode state without visual changes
  noteContent.classList.remove('view-mode');
  noteContent.classList.add('edit-mode');

  console.log('Displayed as edit mode:', { cleanedMarkdown });
}

/**
 * Get the current markdown content from a note
 * @param {HTMLElement} noteContent - The note content element
 * @returns {string} The current markdown content
 */
export function getCurrentMarkdownContent(noteContent) {
  if (noteContent.classList.contains('edit-mode')) {
    // In edit mode, get the raw text content being edited
    return noteContent.textContent || '';
  } else {
    // Get from stored markdown attribute or fall back to text content
    return (
      noteContent.getAttribute('data-markdown') || noteContent.textContent || ''
    );
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
