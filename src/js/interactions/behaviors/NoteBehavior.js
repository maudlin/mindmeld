/**
 * NoteBehavior - Handles all note interaction logic
 *
 * Unified behavior for note clicks, selection, and edit mode requests.
 * Receives input from both DesktopAdapter and TouchAdapter.
 * Fixes MM-183: Styled content can now be clicked to enter edit mode.
 */

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

    this.eventBus.emit('note.selected', {
      noteElement,
      isMultiSelect,
      behavior: this,
    });

    console.log('NoteBehavior: Note selection handled', {
      noteId: noteElement.id,
      isMultiSelect,
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
