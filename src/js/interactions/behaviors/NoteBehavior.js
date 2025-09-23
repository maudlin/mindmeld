/**
 * NoteBehavior - Handles all note interaction logic
 *
 * Unified behavior for note clicks, selection, and edit mode requests.
 * Receives input from both DesktopAdapter and TouchAdapter.
 * Fixes MM-183: Styled content can now be clicked to enter edit mode.
 */

import { noteManager } from '../../services/noteManager.js';
import { NoteIdService } from '../../services/noteIdService.js';
import { displayAsViewMode } from '../../features/note/editViewMode.js';
import { getCoordinateTransform } from '../../core/coordinates/coordinateService.js';
import config from '../../core/config.js';

export class NoteBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'NoteBehavior';

    console.log('NoteBehavior: Created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Set up event listeners and coordination
    // Note: Direct adapter-to-behavior communication means no global listeners needed here
    // Each adapter will call our methods directly based on input detection

    this.isInitialized = true;
    console.log('NoteBehavior: Initialized');
  }

  /**
   * Handle note click from any adapter
   * Fixes MM-183: Unified handling for both normal and styled content
   */
  handleNoteClick(noteElement, event, inputType) {
    if (!noteElement) {
      return;
    }

    // Find the note content element within the note
    const noteContent = noteElement.querySelector('.note-content');
    if (!noteContent) {
      return;
    }

    // Check if note is already in edit mode
    if (noteContent.classList.contains('edit-mode')) {
      return;
    }

    // Detect styled content using event composition path
    // This solves MM-183: styled elements like <strong>, <h1>, <em> are now clickable
    const clickedElement = event.target;

    // Handle direct clicks on note content or its children
    let isValidClick = false;
    if (clickedElement === noteContent) {
      // Direct click on note content
      isValidClick = true;
    } else if (clickedElement.closest) {
      // Click on styled content within note content
      const noteContentFromPath = clickedElement.closest('.note-content');
      isValidClick = noteContentFromPath === noteContent;
    } else if (clickedElement === noteElement) {
      // Click on note element itself (borders/padding)
      isValidClick = true;
    }

    if (isValidClick) {
      this.requestEditMode(noteElement, inputType);
    }

    console.log(`NoteBehavior: Note click handled from ${inputType}`, {
      noteId: noteElement.id,
      clickTarget: clickedElement.tagName,
      isStyledContent: clickedElement !== noteContent,
    });
  }

  /**
   * Request edit mode for a note
   * Emits event to EditModeController
   */
  requestEditMode(noteElement, inputType = 'unknown') {
    if (!noteElement) {
      return;
    }

    this.eventBus.emit('note.requestEdit', {
      noteId: noteElement.id,
      noteElement,
      behavior: this,
      inputType,
    });

    console.log('NoteBehavior: Edit mode requested for note:', noteElement.id);
  }

  /**
   * Handle note selection
   * Coordinates with noteManager for selection state
   */
  handleNoteSelection(noteElement, isMultiSelect) {
    if (!noteElement) {
      return;
    }

    // Use NoteManager to actually select the note (adds 'selected' class to DOM)
    if (!isMultiSelect) {
      // Clear existing selections first for single select
      noteManager.clearSelections();
    }
    noteManager.selectNote(noteElement);

    // Also emit event for other listeners
    this.eventBus.emit('note.selected', {
      noteElement,
      isMultiSelect,
      behavior: this,
    });

    console.log('NoteBehavior: Note selection handled', {
      noteId: noteElement.id,
      isMultiSelect,
      hasSelectedClass: noteElement.classList.contains('selected'),
    });
  }

  /**
   * Handle note double-click for edit mode entry
   * Used by both DesktopAdapter and TouchAdapter
   */
  handleNoteDoubleClick(noteElement, event, inputType) {
    if (!noteElement) {
      console.warn('NoteBehavior: No note element provided for double-click');
      return;
    }

    console.log('NoteBehavior: Note double-click detected', {
      noteId: noteElement.id,
      inputType,
      isSelected: noteElement.classList.contains('selected'),
    });

    // Ensure note is selected first
    if (!noteElement.classList.contains('selected')) {
      this.handleNoteSelection(noteElement, false);
    }

    // Request edit mode
    this.eventBus.emit('note.requestEdit', {
      noteId: noteElement.id,
      noteElement,
      inputType,
      behavior: this,
    });

    console.log('NoteBehavior: Edit mode requested for note:', noteElement.id);
  }

  /**
   * Create note at specified position using modern ID management
   * MM-256: Prevents ID collisions with existing notes
   */
  createNoteAtPosition(canvas, event) {
    if (!canvas || !event) {
      console.warn('NoteBehavior: Invalid canvas or event for note creation');
      return null;
    }

    try {
      let x = event.clientX || 100;
      let y = event.clientY || 100;

      // Use coordinate transform if available (production), otherwise use raw coordinates (testing)
      try {
        const coordinateTransform = getCoordinateTransform();
        const transformed = coordinateTransform.viewportToCanvas(
          event.clientX,
          event.clientY,
        );
        x = transformed.x;
        y = transformed.y;
      } catch {
        // Fall back to raw coordinates for testing
        console.warn('NoteBehavior: Using raw coordinates for testing');
      }

      // Offset the note creation position to centre the note
      return this.createNote(
        x - (config?.noteSize?.width || 200) / 2,
        y - 20,
        canvas,
      );
    } catch (error) {
      console.error('NoteBehavior: Error creating note at position:', error);
      return null;
    }
  }

  /**
   * Create note with collision-free ID generation
   * MM-256: Uses NoteIdService to prevent duplicate IDs
   */
  createNote(x, y, canvas) {
    if (!canvas) {
      console.warn('NoteBehavior: No canvas provided for note creation');
      return null;
    }

    try {
      const note = document.createElement('div');
      note.className = 'note';

      const noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      noteContent.contentEditable = true;

      note.appendChild(noteContent);
      this.createGhostConnectors(note);

      // Initialize in view mode with empty content
      try {
        displayAsViewMode(noteContent, '');
      } catch {
        // Fall back for testing - just set textContent
        noteContent.textContent = '';
      }

      canvas.appendChild(note);

      note.style.left = `${x}px`;
      note.style.top = `${y}px`;
      note.style.width = `${config?.noteSize?.width || 200}px`;
      note.style.padding = `${config?.noteSize?.padding || 10}px`;

      // MM-256: Use collision-free ID generation
      const noteId = NoteIdService.generateNextId();
      note.id = noteId;
      note.dataset.id = noteId;

      // Emit event for state management
      this.eventBus.emit('note.created', {
        id: noteId,
        content: '',
        left: note.style.left,
        top: note.style.top,
      });

      console.log('NoteBehavior: Created note with ID:', noteId);
      return note;
    } catch (error) {
      console.error('NoteBehavior: Error creating note:', error);
      return null;
    }
  }

  /**
   * Create note from data (import/restore scenarios)
   * MM-256: Uses provided ID without affecting counter
   */
  createNoteFromData(noteData, canvas) {
    if (!noteData || !canvas) {
      console.warn(
        'NoteBehavior: Invalid noteData or canvas for note creation',
      );
      return null;
    }

    try {
      // Create note element without using ID counter (to preserve counter state)
      const note = document.createElement('div');
      note.className = 'note';

      const noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      noteContent.contentEditable = true;

      note.appendChild(noteContent);
      this.createGhostConnectors(note);

      canvas.appendChild(note);

      // Set position
      const x = parseFloat(noteData.left || noteData.p?.[0] || 0);
      const y = parseFloat(noteData.top || noteData.p?.[1] || 0);
      note.style.left = `${x}px`;
      note.style.top = `${y}px`;
      note.style.width = `${config?.noteSize?.width || 200}px`;
      note.style.padding = `${config?.noteSize?.padding || 10}px`;

      // Set specific ID from data (doesn't affect ID counter)
      const noteId = noteData.id || noteData.i;
      if (noteId) {
        note.id = noteId;
        note.dataset.id = noteId;
      }

      // Load stored content and render as HTML (view mode)
      const storedMarkdown = noteData.content || noteData.c || '';
      try {
        displayAsViewMode(noteContent, storedMarkdown);
      } catch {
        // Fall back for testing - just set textContent
        noteContent.textContent = storedMarkdown;
      }

      console.log('NoteBehavior: Created note from data with ID:', noteId);
      return note;
    } catch (error) {
      console.error('NoteBehavior: Error creating note from data:', error);
      return null;
    }
  }

  /**
   * Ensure future generated IDs won't collide with existing notes
   * MM-256: Updates ID service counter based on existing notes
   */
  ensureUniqueIds(existingNotes) {
    try {
      NoteIdService.ensureUniqueIds(existingNotes);
      console.log('NoteBehavior: Updated ID counter to prevent collisions');
    } catch (error) {
      console.error('NoteBehavior: Error ensuring unique IDs:', error);
    }
  }

  /**
   * Helper method to create ghost connectors
   * @private
   */
  createGhostConnectors(note) {
    const positions = ['top', 'bottom', 'left', 'right'];
    positions.forEach((position) => {
      const connector = document.createElement('div');
      connector.className = `ghost-connector ${position}`;
      note.appendChild(connector);
    });
  }

  /**
   * Cancel any active note interaction
   */
  cancel() {
    // Currently no ongoing interactions to cancel
    // This method exists for consistency with other behaviors
    console.log('NoteBehavior: Cancelled');
  }

  /**
   * Clean up behavior resources
   */
  async destroy() {
    this.isInitialized = false;
    this.eventBus = null;
    console.log('NoteBehavior: Destroyed');
  }
}
