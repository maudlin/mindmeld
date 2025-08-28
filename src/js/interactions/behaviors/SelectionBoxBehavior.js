/**
 * SelectionBoxBehavior - Handles lasso selection operations
 *
 * Unified behavior for selection box drawing and multi-note selection.
 * Receives input from both DesktopAdapter and TouchAdapter.
 *
 * STUB: Will be implemented with comprehensive TDD in MM-189
 */

export class SelectionBoxBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'SelectionBoxBehavior';

    // Selection state
    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;
    this.selectionBox = null;

    console.log('SelectionBoxBehavior: Created (STUB)');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // TODO MM-189: Set up event listeners for selection box
    // - Listen for adapter selection events
    // - Set up visual selection box coordination
    // - Handle multi-select logic

    this.isInitialized = true;
    console.log('SelectionBoxBehavior: Initialized (STUB)');
  }

  /**
   * Start selection box drawing
   * TODO MM-189: Implement unified selection start
   */
  startSelectionBox(event, inputType) {
    console.log(
      `SelectionBoxBehavior: STUB - Selection start from ${inputType}`,
      {
        x: event.clientX,
        y: event.clientY,
      },
    );

    this.isDrawingSelectionBox = true;

    // TODO: Implement actual selection start
    // - Create visual selection box element
    // - Set up selection state
    // - Clear existing selections

    this.eventBus.emit('interaction.start', {
      type: 'selection',
      behavior: this,
    });
  }

  /**
   * Update selection box
   * TODO MM-189: Implement unified selection update
   */
  updateSelectionBox(event, inputType) {
    if (!this.isDrawingSelectionBox) return;

    console.log(
      `SelectionBoxBehavior: STUB - Selection update from ${inputType}`,
    );

    // TODO: Implement actual selection update
    // - Update visual selection box
    // - Detect notes within selection bounds
    // - Update selection state
  }

  /**
   * End selection box drawing
   * TODO MM-189: Implement unified selection end
   */
  endSelectionBox(event, inputType) {
    if (!this.isDrawingSelectionBox) return;

    console.log(`SelectionBoxBehavior: STUB - Selection end from ${inputType}`);

    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;

    // TODO: Implement actual selection end
    // - Finalize note selections
    // - Remove visual selection box
    // - Emit selection events

    this.eventBus.emit('interaction.end', {
      type: 'selection',
    });
  }

  /**
   * Cancel selection box operation
   */
  cancel() {
    if (!this.isDrawingSelectionBox) return;

    console.log('SelectionBoxBehavior: STUB - Selection cancelled');

    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;

    // TODO: Remove visual selection box, restore previous selections
  }

  /**
   * Clean up behavior resources
   */
  async destroy() {
    this.cancel();
    this.isInitialized = false;
    this.eventBus = null;
    console.log('SelectionBoxBehavior: STUB - Destroyed');
  }
}
