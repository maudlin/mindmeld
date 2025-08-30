/**
 * SelectionBoxBehavior - Handles lasso selection operations
 *
 * Unified behavior for selection box drawing and multi-note selection.
 * Receives input from both DesktopAdapter and TouchAdapter.
 */

import { calculateOffsetPosition, throttle } from '../../utils/utils.js';
import { noteManager } from '../../services/noteManager.js';

export class SelectionBoxBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'SelectionBoxBehavior';

    // Selection state
    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;
    this.selectionBox = null;

    // Create throttled update function (60fps like the working implementation)
    this.throttledUpdateSelectionBox = throttle(
      this.updateSelectionBoxVisual.bind(this),
      16,
    );

    // CRITICAL: Throttle the expensive note selection checking (this was causing lag!)
    this.throttledSelectNotesWithinBox = throttle(
      this.selectNotesWithinBox.bind(this),
      32, // 30fps for note selection checking - less frequent than visual updates
    );

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

    // Prevent default browser behavior
    if (event.preventDefault) {
      event.preventDefault();
    }

    this.isDrawingSelectionBox = true;

    // Prevent text selection during drag operations
    document.body.classList.add('dragging');

    // Get canvas-relative coordinates using the proven utility function
    const canvas = document.getElementById('canvas');
    const { left: startX, top: startY } = calculateOffsetPosition(
      canvas,
      event,
    );

    // Set up selection state
    this.selectionBoxState = {
      startX: startX,
      startY: startY,
      pointerId: event.pointerId,
      inputType,
    };

    // Use pointer capture for reliable selection box tracking (like working implementation)
    if (canvas && canvas.setPointerCapture && event.pointerId) {
      canvas.setPointerCapture(event.pointerId);
    }

    // Clear existing selections before starting new selection box (like working implementation)
    noteManager.clearSelections();

    // Create visual selection box with canvas-relative coordinates
    this.createSelectionBoxElement(startX, startY);

    // Emit interaction start
    this.eventBus.emit('interaction.start', {
      type: 'selection',
      behavior: this,
    });

    // Emit selection-specific start event
    this.eventBus.emit('selection.started', {
      startX: startX,
      startY: startY,
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

    // Prevent default browser behavior
    if (event.preventDefault) {
      event.preventDefault();
    }

    // Get canvas-relative coordinates using the proven utility function
    const canvas = document.getElementById('canvas');
    const { left: currentX, top: currentY } = calculateOffsetPosition(
      canvas,
      event,
    );

    // Use throttled update for smooth 60fps performance (like working implementation)
    this.throttledUpdateSelectionBox(
      this.selectionBoxState.startX,
      this.selectionBoxState.startY,
      currentX,
      currentY,
    );

    // Provide live selection preview during dragging (like working implementation)
    // CRITICAL: Use throttled version to prevent lag
    this.throttledSelectNotesWithinBox();

    console.log(`SelectionBoxBehavior: Selection updated from ${inputType}`, {
      currentX,
      currentY,
    });
  }

  /**
   * End selection box drawing and finalize selection
   */
  endSelectionBox(event, inputType) {
    if (!this.isDrawingSelectionBox || !this.selectionBoxState) {
      return;
    }

    // Prevent default browser behavior
    if (event?.preventDefault) {
      event.preventDefault();
    }

    const savedInputType = this.selectionBoxState.inputType;

    // Select notes that fall within the current selection box (like working implementation)
    this.selectNotesWithinBox();

    // Clean up visual selection box
    this.clearSelectionBox();

    // Remove dragging class from body
    document.body.classList.remove('dragging');

    // Reset state
    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;

    // Emit selection-specific end event
    this.eventBus.emit('selection.ended', {
      inputType: savedInputType,
    });

    // Emit interaction end
    this.eventBus.emit('interaction.end', {
      type: 'selection',
    });

    console.log(`SelectionBoxBehavior: Selection ended from ${inputType}`);
  }

  /**
   * Cancel selection box operation
   */
  cancel() {
    console.log('SelectionBoxBehavior: Selection cancelled');

    // If we're currently drawing a selection box, clean it up
    if (this.isDrawingSelectionBox) {
      // Clean up visual selection box
      this.clearSelectionBox();

      // Remove dragging class from body
      document.body.classList.remove('dragging');

      // Reset state
      this.isDrawingSelectionBox = false;
      this.selectionBoxState = null;
    }

    // Always clear selections when canceling (like Escape key should do)
    noteManager.clearSelections();
  }

  /**
   * Create visual selection box element (matching working implementation)
   */
  createSelectionBoxElement(startX, startY) {
    this.clearSelectionBox();

    this.selectionBox = document.createElement('div');
    this.selectionBox.id = 'selection-box';
    Object.assign(this.selectionBox.style, {
      position: 'absolute',
      border: '1px dashed #000',
      backgroundColor: 'rgba(0, 0, 255, 0.1)',
      left: `${startX}px`,
      top: `${startY}px`,
      width: '0px',
      height: '0px',
      pointerEvents: 'none', // Don't interfere with pointer events
    });

    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.appendChild(this.selectionBox);
    }
  }

  /**
   * Update selection box visual (matching working implementation)
   */
  updateSelectionBoxVisual(startX, startY, currentX, currentY) {
    if (!this.selectionBox) return;

    const width = currentX - startX;
    const height = currentY - startY;

    Object.assign(this.selectionBox.style, {
      width: `${Math.abs(width)}px`,
      height: `${Math.abs(height)}px`,
      left: `${Math.min(currentX, startX)}px`,
      top: `${Math.min(currentY, startY)}px`,
    });
  }

  /**
   * Clear selection box visual (matching working implementation)
   */
  clearSelectionBox() {
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
  }

  /**
   * Select notes that fall within the current selection box (matching working implementation)
   */
  selectNotesWithinBox() {
    if (!this.selectionBox) return;

    const notes = document.querySelectorAll('.note');
    const boxRect = this.selectionBox.getBoundingClientRect();

    // Performance: Only log box bounds, not every note check
    // console.log('SelectionBoxBehavior: Selection box bounds:', boxRect);

    notes.forEach((note) => {
      const noteRect = note.getBoundingClientRect();

      // Performance: Removed per-note logging to prevent lag
      // console.log('SelectionBoxBehavior: Checking note', { noteId: note.id, noteRect });

      // Use intersection-based selection instead of containment
      // This is more user-friendly and matches typical selection behavior
      const intersects =
        noteRect.left < boxRect.right &&
        noteRect.right > boxRect.left &&
        noteRect.top < boxRect.bottom &&
        noteRect.bottom > boxRect.top;

      if (intersects) {
        // Use noteManager to properly handle selection
        noteManager.selectNote(note);
        // Performance: Reduced logging frequency
        // console.log('SelectionBoxBehavior: Note intersects - selected:', note.id);
      } else {
        // Deselect notes that don't intersect
        noteManager.deselectNote(note);
      }
    });
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
