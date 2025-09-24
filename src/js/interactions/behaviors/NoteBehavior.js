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
import { connectionManager } from '../../features/connection/connectionManager.js';
import { DataProviderService } from '../../services/DataProviderService.js';
import config from '../../core/config.js';
import { logger, errorHandler } from '../../services/logger.js';

export class NoteBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'NoteBehavior';

    logger.debug('NoteBehavior created', { timestamp: Date.now() });
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
    logger.debug('NoteBehavior initialized');
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

    logger.info('Note click handled', {
      noteId: noteElement.id,
      inputType,
      clickTarget: clickedElement.tagName,
      isStyledContent: clickedElement !== noteContent
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

    logger.info('Note selection handled', {
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
      logger.warn('No note element provided for double-click', { inputType });
      return;
    }

    logger.info('Note double-click detected', {
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
      logger.warn('Invalid canvas or event for note creation');
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
        logger.warn('Using raw coordinates for testing');
      }

      // Offset the note creation position to centre the note
      return this.createNote(
        x - (config?.noteSize?.width || 200) / 2,
        y - 20,
        canvas,
      );
    } catch (error) {
      logger.error('Error creating note at position:', { error: error });
      return null;
    }
  }

  /**
   * Create note with collision-free ID generation
   * MM-256: Uses NoteIdService to prevent duplicate IDs
   */
  createNote(x, y, canvas) {
    if (!canvas) {
      logger.warn('No canvas provided for note creation');
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
      logger.error('Error creating note:', { error: error });
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
      logger.error('Error creating note from data:', { error: error });
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
      logger.error('Error ensuring unique IDs:', { error: error });
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
   * Delete note with connection cleanup
   * Integrated deletion through behavior system
   */
  deleteNoteWithConnections(note, canvas) {
    if (!note) {
      logger.warn('No note provided for deletion');
      return;
    }

    // Clean up connections first
    connectionManager.deleteConnectionsByNote(note);

    // Delete note from data provider
    try {
      const dataProviderService = DataProviderService.getInstance();
      dataProviderService.deleteNote(note.id, { origin: 'user' });
    } catch (error) {
      console.error(
        'NoteBehavior: Failed to delete note from data provider:',
        error,
      );
      // Continue with DOM cleanup even if provider deletion fails
    }

    // Remove note from DOM
    note.remove();

    // Update connection visualizations
    if (canvas) {
      connectionManager.updateConnections(note, canvas);
    }

    console.log('NoteBehavior: Deleted note with connections:', note.id);
  }

  /**
   * Delete all selected notes
   * Moved from noteDeletion.js to consolidate behavior
   */
  deleteSelectedNotes() {
    const selectedNotes = noteManager.getSelectedNotes();
    if (selectedNotes.length > 0) {
      const canvas = document.getElementById('canvas');

      // Delete all selected notes
      selectedNotes.forEach((note) => {
        this.deleteNoteWithConnections(note, canvas);
      });

      console.log(
        'NoteBehavior: Deleted selected notes:',
        selectedNotes.length,
      );
    } else {
      console.log('NoteBehavior: No selected notes to delete');
    }
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
