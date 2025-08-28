/**
 * NoteBehavior - Handles all note interaction logic
 *
 * Unified behavior for note clicks, selection, and edit mode requests.
 * Receives input from both DesktopAdapter and TouchAdapter.
 *
 * STUB: Will be implemented with comprehensive TDD in MM-187
 */

export class NoteBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'NoteBehavior';

    console.log('NoteBehavior: Created (STUB)');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // TODO MM-187: Set up event listeners for note interactions
    // - Listen for adapter input events
    // - Set up edit mode coordination
    // - Handle styled content detection

    this.isInitialized = true;
    console.log('NoteBehavior: Initialized (STUB)');
  }

  /**
   * Handle note click from any adapter
   * TODO MM-187: Implement unified click handling
   */
  handleNoteClick(noteElement, event, inputType) {
    console.log(`NoteBehavior: STUB - Note click detected from ${inputType}`, {
      noteId: noteElement?.id,
      hasNoteElement: !!noteElement,
    });

    // TODO: Implement actual click handling
    // - Detect if click is on styled content
    // - Request edit mode if appropriate
    // - Handle selection logic
  }

  /**
   * Request edit mode for a note
   * TODO MM-187: Implement edit mode logic
   */
  requestEditMode(noteElement) {
    console.log(
      'NoteBehavior: STUB - Edit mode requested for note:',
      noteElement?.id,
    );

    // TODO: Emit note.requestEdit event to EditModeController
  }

  /**
   * Handle note selection
   * TODO MM-187: Implement selection logic
   */
  handleNoteSelection(noteElement, isMultiSelect) {
    console.log('NoteBehavior: STUB - Note selection', {
      noteId: noteElement?.id,
      isMultiSelect,
    });

    // TODO: Coordinate with noteManager for selection
  }

  /**
   * Cancel any active note interaction
   */
  cancel() {
    console.log('NoteBehavior: STUB - Cancelled');
  }

  /**
   * Clean up behavior resources
   */
  async destroy() {
    this.isInitialized = false;
    this.eventBus = null;
    console.log('NoteBehavior: STUB - Destroyed');
  }
}
