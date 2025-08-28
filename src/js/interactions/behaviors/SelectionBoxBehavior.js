/**
 * SelectionBoxBehavior - Handles lasso selection operations
 *
 * Unified behavior for selection box drawing and multi-note selection.
 * Receives input from both DesktopAdapter and TouchAdapter.
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

    console.log('SelectionBoxBehavior: Created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Set up selection box coordination
    // Direct adapter-to-behavior communication means no global listeners needed here
    // Each adapter will call our methods directly based on input detection

    this.isInitialized = true;
    console.log('SelectionBoxBehavior: Initialized');
  }

  /**
   * Start selection box drawing
   * Creates visual selection box and sets up initial state
   */
  startSelectionBox(event, inputType) {
    if (!event || this.isDrawingSelectionBox) {
      return;
    }

    // Extract coordinates safely
    const startX = event.clientX || 0;
    const startY = event.clientY || 0;

    // Prevent default browser behavior
    if (event.preventDefault) {
      event.preventDefault();
    }

    // Create visual selection box
    this.selectionBox = this.createSelectionBoxElement();
    if (!this.selectionBox) {
      return;
    }

    // Set up selection state
    this.selectionBoxState = {
      startPosition: { x: startX, y: startY },
      currentPosition: { x: startX, y: startY },
      inputType,
    };

    this.isDrawingSelectionBox = true;

    // Add selection box to canvas
    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.appendChild(this.selectionBox);
    }

    // Set initial position
    this.updateSelectionBoxVisuals();

    // Emit interaction start
    this.eventBus.emit('interaction.start', {
      type: 'selection',
      behavior: this,
    });

    // Emit selection-specific start event
    this.eventBus.emit('selection.started', {
      startPosition: { x: startX, y: startY },
      inputType,
    });

    console.log(`SelectionBoxBehavior: Selection started from ${inputType}`, {
      startX,
      startY,
    });
  }

  /**
   * Update selection box dimensions and note detection
   */
  updateSelectionBox(event, inputType) {
    if (!this.isDrawingSelectionBox || !this.selectionBoxState || !event) {
      return;
    }

    // Extract coordinates safely
    const currentX = event.clientX || 0;
    const currentY = event.clientY || 0;

    // Prevent default browser behavior
    if (event.preventDefault) {
      event.preventDefault();
    }

    // Update current position
    this.selectionBoxState.currentPosition = { x: currentX, y: currentY };

    // Update visual selection box
    this.updateSelectionBoxVisuals();

    // Calculate current selection bounds
    const bounds = this.calculateSelectionBounds();

    // Detect notes within current selection
    const selectedNotes = this.detectNotesInBounds(bounds);

    // Emit selection update event
    this.eventBus.emit('selection.updated', {
      currentBounds: bounds,
      selectedNotes,
    });

    console.log(`SelectionBoxBehavior: Selection updated from ${inputType}`, {
      width: bounds.width,
      height: bounds.height,
      noteCount: selectedNotes.length,
    });
  }

  /**
   * End selection box drawing and finalize selection
   */
  endSelectionBox(event, inputType) {
    if (!this.isDrawingSelectionBox || !this.selectionBoxState) {
      return;
    }

    // Extract coordinates safely
    const endX = event?.clientX || this.selectionBoxState.currentPosition.x;
    const endY = event?.clientY || this.selectionBoxState.currentPosition.y;

    // Prevent default browser behavior
    if (event?.preventDefault) {
      event.preventDefault();
    }

    // Update final position
    this.selectionBoxState.currentPosition = { x: endX, y: endY };

    // Calculate final selection bounds
    const finalBounds = this.calculateSelectionBounds();

    // Detect final selected notes
    const selectedNotes = this.detectNotesInBounds(finalBounds);

    const savedInputType = this.selectionBoxState.inputType;

    // Clean up visual selection box
    this.removeSelectionBox();

    // Reset state
    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;

    // Emit selection-specific end event
    this.eventBus.emit('selection.ended', {
      selectionBounds: finalBounds,
      selectedNotes,
      inputType: savedInputType,
    });

    // Emit interaction end
    this.eventBus.emit('interaction.end', {
      type: 'selection',
    });

    console.log(`SelectionBoxBehavior: Selection ended from ${inputType}`, {
      finalBounds,
      noteCount: selectedNotes.length,
    });
  }

  /**
   * Cancel selection box operation
   */
  cancel() {
    if (!this.isDrawingSelectionBox) return;

    console.log('SelectionBoxBehavior: Selection cancelled');

    // Clean up visual selection box
    this.removeSelectionBox();

    // Reset state
    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;
  }

  /**
   * Create visual selection box element
   */
  createSelectionBoxElement() {
    try {
      const selectionBox = document.createElement('div');
      selectionBox.className = 'selection-box';

      // Set initial styles
      Object.assign(selectionBox.style, {
        position: 'absolute',
        border: '1px dashed #007acc',
        backgroundColor: 'rgba(0, 122, 204, 0.1)',
        display: 'none',
        pointerEvents: 'none',
        zIndex: '1000',
      });

      return selectionBox;
    } catch (error) {
      console.error(
        'SelectionBoxBehavior: Failed to create selection box element:',
        error,
      );
      return null;
    }
  }

  /**
   * Update visual selection box dimensions and position
   */
  updateSelectionBoxVisuals() {
    if (!this.selectionBox || !this.selectionBoxState) {
      return;
    }

    const bounds = this.calculateSelectionBounds();

    // Update selection box styles
    Object.assign(this.selectionBox.style, {
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      display: 'block',
    });
  }

  /**
   * Calculate selection bounds from start and current positions
   */
  calculateSelectionBounds() {
    if (!this.selectionBoxState) {
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }

    const { startPosition, currentPosition } = this.selectionBoxState;

    const left = Math.min(startPosition.x, currentPosition.x);
    const top = Math.min(startPosition.y, currentPosition.y);
    const right = Math.max(startPosition.x, currentPosition.x);
    const bottom = Math.max(startPosition.y, currentPosition.y);

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  /**
   * Detect notes within selection bounds
   */
  detectNotesInBounds(bounds) {
    try {
      const notes = document.querySelectorAll('.note');
      const selectedNotes = [];

      for (const note of notes) {
        const noteRect = note.getBoundingClientRect();

        // Check if note intersects with selection bounds
        if (this.isRectIntersecting(noteRect, bounds)) {
          selectedNotes.push(note);
        }
      }

      return selectedNotes;
    } catch (error) {
      console.error(
        'SelectionBoxBehavior: Failed to detect notes in bounds:',
        error,
      );
      return [];
    }
  }

  /**
   * Check if a rectangle intersects with selection bounds
   */
  isRectIntersecting(rect, bounds) {
    return !(
      rect.right < bounds.left ||
      rect.left > bounds.right ||
      rect.bottom < bounds.top ||
      rect.top > bounds.bottom
    );
  }

  /**
   * Remove visual selection box from DOM
   */
  removeSelectionBox() {
    if (this.selectionBox) {
      try {
        this.selectionBox.remove();
      } catch (error) {
        console.error(
          'SelectionBoxBehavior: Failed to remove selection box:',
          error,
        );
      }
      this.selectionBox = null;
    }
  }

  /**
   * Clean up behavior resources
   */
  async destroy() {
    this.cancel();
    this.isInitialized = false;
    this.eventBus = null;
    console.log('SelectionBoxBehavior: Destroyed');
  }
}
