/**
 * EditModeController - Unified controller for note edit/view mode transitions
 *
 * Single source of truth for edit mode state, managed through EventBus.
 * Coordinates between adapters, markdown rendering, and DOM updates.
 * Replaces legacy noteEvents.js dual-system conflict.
 */

import { eventBus } from '../../core/eventBus.js';
import {
  displayAsViewMode,
  displayAsEditMode,
  getCurrentMarkdownContent,
} from './editViewMode.js';

class EditModeController {
  constructor() {
    this.currentEditingNote = null;
    this.state = 'VIEW'; // VIEW | EDITING | TRANSITIONING
    this.initialized = false;
  }

  /**
   * Initialize the controller and set up event listeners
   */
  initialize() {
    if (this.initialized) {
      console.warn('EditModeController: Already initialized');
      return;
    }

    this.setupEventListeners();
    this.initialized = true;
    console.log('EditModeController: Initialized');
  }

  /**
   * Set up EventBus listeners for edit mode requests
   */
  setupEventListeners() {
    // Listen for edit mode requests from adapters
    eventBus.on('note.requestEdit', (data) => this.handleEditRequest(data));
    eventBus.on('note.requestView', (data) => this.handleViewRequest(data));

    // Listen for external triggers to exit edit mode
    eventBus.on('canvas.clicked', () => this.exitEditMode());
    eventBus.on('note.selected', (data) => {
      // Exit edit mode if a different note is selected
      if (this.currentEditingNote && this.currentEditingNote.id !== data.id) {
        this.exitEditMode();
      }
    });

    // Listen for note deletion to handle cleanup
    eventBus.on('note.deleted', (data) => {
      if (this.currentEditingNote && this.currentEditingNote.id === data.id) {
        this.currentEditingNote = null;
        this.state = 'VIEW';
      }
    });
  }

  /**
   * Handle request to enter edit mode for a note
   */
  handleEditRequest(data) {
    console.log('EditModeController: Received edit request', {
      ...data,
      hasNoteElement: !!data.noteElement,
      noteElementId: data.noteElement?.id,
    });
    const { noteId, noteElement } = data;

    if (!noteElement) {
      console.warn('EditModeController: No note element provided');
      return;
    }

    // If we're already editing this note, ignore
    if (this.currentEditingNote && this.currentEditingNote.id === noteId) {
      return;
    }

    // Exit current edit if editing a different note
    if (this.currentEditingNote) {
      this.exitEditMode();
    }
    this.enterEditMode(noteElement);
  }

  /**
   * Handle request to exit edit mode
   */
  handleViewRequest(data) {
    if (
      this.currentEditingNote &&
      (!data || !data.noteId || this.currentEditingNote.id === data.noteId)
    ) {
      this.exitEditMode();
    }
  }

  /**
   * Enter edit mode for a specific note
   */
  enterEditMode(noteElement) {
    if (this.state === 'TRANSITIONING') {
      return;
    }

    this.state = 'TRANSITIONING';

    const noteContent = noteElement.querySelector('.note-content');
    if (!noteContent) {
      console.warn('EditModeController: No note content element found');
      this.state = 'VIEW';
      return;
    }

    // Store current note reference
    this.currentEditingNote = {
      id: noteElement.id,
      element: noteElement,
      contentElement: noteContent,
    };

    // Get current markdown content - NEVER fall back to textContent (corrupted HTML-derived)
    const currentContent =
      getCurrentMarkdownContent(noteContent) ||
      noteContent.dataset.markdown ||
      '';

    // Debug warning if no content found
    if (!currentContent) {
      console.warn(
        'EditModeController: No markdown content found for note',
        noteElement.id,
      );
    }

    // Switch to edit mode display
    const newElement = displayAsEditMode(noteContent, currentContent);

    // Update our reference if the element was replaced
    if (newElement && newElement !== noteContent) {
      this.currentEditingNote.contentElement = newElement;
    }

    // Note: The textarea handles its own focus in displayAsEditMode
    // We don't need to manually focus or select text here

    // Blur handling is now done through adapters (DesktopAdapter/TouchAdapter)
    // which emit note.requestView events
    // this.setupBlurHandler(noteElement);

    this.state = 'EDITING';

    // Emit edit mode entered event
    eventBus.emit('note.editModeEntered', {
      noteId: noteElement.id,
      element: noteElement,
    });
  }

  /**
   * Exit edit mode and return to view mode
   */
  exitEditMode() {
    if (!this.currentEditingNote || this.state !== 'EDITING') {
      return;
    }

    this.state = 'TRANSITIONING';

    const { element: noteElement, contentElement: noteContent } =
      this.currentEditingNote;

    // Get the current markdown content - NO DANGEROUS FALLBACKS
    const rawText = getCurrentMarkdownContent(noteContent) || '';

    if (!rawText) {
      console.warn(
        'EditModeController: Failed to extract content during exit. Content may be lost.',
      );
    }

    // Check if noteContent is a textarea that needs to be replaced with div
    let targetElement = noteContent;
    if (noteContent.tagName === 'TEXTAREA') {
      // Create a new div to replace the textarea
      const newDiv = document.createElement('div');
      newDiv.className = 'note-content';
      newDiv.setAttribute('data-markdown', rawText);

      // Replace the textarea with the new div
      noteContent.parentNode.replaceChild(newDiv, noteContent);
      targetElement = newDiv;

      // Update the reference in currentEditingNote
      this.currentEditingNote.contentElement = newDiv;
    } else {
      // Store markdown in dataset for persistence (old approach)
      noteContent.dataset.markdown = rawText;
    }

    // Switch to view mode display
    displayAsViewMode(targetElement, rawText);

    // Remove editable state
    noteElement.removeAttribute('contenteditable');
    targetElement.removeAttribute('contenteditable');

    // Blur handling is now done through adapters
    // this.removeBlurHandler(noteElement);

    // Save the updated content
    eventBus.emit('note.updated', {
      id: noteElement.id,
      content: rawText,
    });
    eventBus.emit('state.save');

    // Emit edit mode exited event
    eventBus.emit('note.editModeExited', {
      noteId: noteElement.id,
      element: noteElement,
    });

    // Clear current editing reference
    this.currentEditingNote = null;
    this.state = 'VIEW';
  }

  /**
   * Set up blur handler for the current edit session
   */
  setupBlurHandler(noteElement) {
    // Store handler reference for cleanup
    this.currentBlurHandler = (event) => {
      // Don't trigger on internal focus changes
      if (noteElement.contains(event.relatedTarget)) {
        return;
      }

      // Delay to allow for click events to process
      setTimeout(() => {
        if (
          this.currentEditingNote &&
          this.currentEditingNote.element === noteElement
        ) {
          this.exitEditMode();
        }
      }, 100);
    };

    noteElement.addEventListener('blur', this.currentBlurHandler, true);
  }

  /**
   * Remove blur handler from note
   */
  removeBlurHandler(noteElement) {
    if (this.currentBlurHandler) {
      noteElement.removeEventListener('blur', this.currentBlurHandler, true);
      this.currentBlurHandler = null;
    }
  }

  /**
   * Check if a note is currently being edited
   */
  isEditing(noteId) {
    return this.currentEditingNote
      ? this.currentEditingNote.id === noteId
      : false;
  }

  /**
   * Get the current edit state
   */
  getState() {
    return this.state;
  }

  /**
   * Clean up controller resources
   */
  cleanup() {
    if (this.currentEditingNote) {
      this.exitEditMode();
    }

    // Remove all event listeners
    eventBus.off('note.requestEdit');
    eventBus.off('note.requestView');
    eventBus.off('canvas.clicked');
    eventBus.off('note.selected');
    eventBus.off('note.deleted');

    this.initialized = false;
  }
}

// Export singleton instance
export const editModeController = new EditModeController();
