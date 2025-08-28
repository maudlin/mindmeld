/**
 * DragBehavior - Handles all dragging operations
 *
 * Unified behavior for note dragging, multi-note dragging, and connection updates.
 * Receives input from both DesktopAdapter and TouchAdapter.
 */

export class DragBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'DragBehavior';

    // Drag state
    this.isDragging = false;
    this.dragState = null;

    console.log('DragBehavior: Created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Set up drag coordination
    // Direct adapter-to-behavior communication means no global listeners needed here
    // Each adapter will call our methods directly based on input detection

    this.isInitialized = true;
    console.log('DragBehavior: Initialized');
  }

  /**
   * Start dragging operation
   * Handles both single-note and multi-note dragging
   */
  startDrag(noteElement, event, inputType, options = {}) {
    if (!noteElement || !event) {
      return;
    }

    // Prevent multiple concurrent drags
    if (this.isDragging) {
      return;
    }

    // Extract coordinates safely
    const startX = event.clientX || 0;
    const startY = event.clientY || 0;

    // Prevent default browser behavior
    if (event.preventDefault) {
      event.preventDefault();
    }

    // Set up drag state
    const selectedNotes = options.selectedNotes || [noteElement];
    const isMultiNoteDrag = selectedNotes.length > 1;

    this.dragState = {
      startPosition: { x: startX, y: startY },
      currentPosition: { x: startX, y: startY },
      noteElement,
      selectedNotes,
      isMultiNoteDrag,
      inputType,
    };

    this.isDragging = true;

    // Emit interaction start
    this.eventBus.emit('interaction.start', {
      type: 'drag',
      behavior: this,
    });

    // Emit drag-specific start event
    const dragStartData = {
      noteElement,
      inputType,
      startPosition: { x: startX, y: startY },
    };

    if (isMultiNoteDrag) {
      dragStartData.selectedNotes = selectedNotes;
      dragStartData.isMultiNoteDrag = true;
    }

    this.eventBus.emit('drag.started', dragStartData);

    console.log(`DragBehavior: Drag started from ${inputType}`, {
      noteId: noteElement.id,
      isMultiNoteDrag,
      noteCount: selectedNotes.length,
    });
  }

  /**
   * Update drag operation
   * Calculates deltas and emits position updates
   */
  updateDrag(event, inputType) {
    if (!this.isDragging || !this.dragState || !event) {
      return;
    }

    // Extract coordinates safely
    const currentX = event.clientX || 0;
    const currentY = event.clientY || 0;

    // Prevent default browser behavior
    if (event.preventDefault) {
      event.preventDefault();
    }

    // Calculate deltas
    const deltaX = currentX - this.dragState.startPosition.x;
    const deltaY = currentY - this.dragState.startPosition.y;

    // Update current position
    this.dragState.currentPosition = { x: currentX, y: currentY };

    // Emit drag update event
    this.eventBus.emit('drag.updated', {
      deltaX,
      deltaY,
      currentPosition: { x: currentX, y: currentY },
    });

    // Emit connection update coordination
    this.eventBus.emit('connection.updateNeeded', {
      noteElement: this.dragState.noteElement,
      deltaX,
      deltaY,
    });

    console.log(`DragBehavior: Drag updated from ${inputType}`, {
      deltaX,
      deltaY,
    });
  }

  /**
   * End dragging operation
   * Finalizes positions and triggers cleanup
   */
  endDrag(event, inputType) {
    if (!this.isDragging || !this.dragState) {
      return;
    }

    // Extract coordinates safely  
    const endX = event?.clientX || this.dragState.currentPosition.x;
    const endY = event?.clientY || this.dragState.currentPosition.y;

    // Prevent default browser behavior
    if (event?.preventDefault) {
      event.preventDefault();
    }

    // Calculate final delta
    const finalDelta = {
      x: endX - this.dragState.startPosition.x,
      y: endY - this.dragState.startPosition.y,
    };

    const savedInputType = this.dragState.inputType;

    // Clean up drag state
    this.isDragging = false;
    this.dragState = null;

    // Emit drag-specific end event
    this.eventBus.emit('drag.ended', {
      finalDelta,
      inputType: savedInputType,
    });

    // Emit interaction end
    this.eventBus.emit('interaction.end', {
      type: 'drag',
    });

    console.log(`DragBehavior: Drag ended from ${inputType}`, {
      finalDelta,
    });
  }

  /**
   * Cancel drag operation
   * Restores original positions and cleans up state
   */
  cancel() {
    if (!this.isDragging) return;

    console.log('DragBehavior: Drag cancelled');

    // TODO: In future, emit event to restore original positions
    
    this.isDragging = false;
    this.dragState = null;
  }

  /**
   * Clean up behavior resources
   */
  async destroy() {
    this.cancel();
    this.isInitialized = false;
    this.eventBus = null;
    console.log('DragBehavior: Destroyed');
  }
}
