/**
 * DragBehavior - Handles all dragging operations
 *
 * Unified behavior for note dragging, multi-note dragging, and connection updates.
 * Receives input from both DesktopAdapter and TouchAdapter.
 */

import { getZoomLevel } from '../../features/zoom/viewportAdapter.js';
import { noteManager } from '../../services/noteManager.js';
import { connectionManager } from '../../features/connection/connectionManager.js';
import { CoordinateTransform } from '../../core/coordinates/CoordinateTransform.js';
import { logger, errorHandler } from '../../services/logger.js';

export class DragBehavior {
  constructor(eventBus, coordinateTransform = null) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'DragBehavior';

    // Coordinate transformation service
    this.coordinateTransform = coordinateTransform;

    // Drag state
    this.isDragging = false;
    this.dragState = null;

    // Movement state (adapted from working implementation)
    this.shiftX = 0;
    this.shiftY = 0;
    this.selectedNotesOffsets = [];

    logger.debug('DragBehavior created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Initialize coordinate transform service if not injected
    if (!this.coordinateTransform) {
      const canvas = document.getElementById('canvas');
      if (!canvas) {
        throw new Error(
          'DragBehavior: Canvas element required for coordinate transformations',
        );
      }

      const zoomProvider = {
        getZoomLevel: () => getZoomLevel(),
      };

      this.coordinateTransform = new CoordinateTransform(canvas, zoomProvider);
    }

    // Set up drag coordination
    // Direct adapter-to-behavior communication means no global listeners needed here
    // Each adapter will call our methods directly based on input detection

    this.isInitialized = true;
    logger.debug('DragBehavior initialized');
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

    // Prevent text selection during drag operations (like working implementation)
    document.body.classList.add('dragging');

    // Enable drag-optimized connection updates (like working implementation)
    connectionManager.setDragState(true);

    // Calculate movement offsets (adapted from working implementation)
    this.calculateDragOffsets(noteElement, event);

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
   * Calculates deltas and updates note positions
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

    // Move notes using pointer coordinates (adapted from working implementation)
    this.updateNotePositions(event);

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

    // Remove dragging class to re-enable text selection (like working implementation)
    document.body.classList.remove('dragging');

    // Disable drag-optimized connection updates (like working implementation)
    connectionManager.setDragState(false);

    // Final connection update for all moved notes (like working implementation)
    this.selectedNotesOffsets.forEach(({ note }) => {
      connectionManager.updateConnections(note);
    });

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
   * Calculate movement offsets for drag operation (using CoordinateTransform service)
   */
  calculateDragOffsets(noteElement, event) {
    try {
      const selectedNotes = noteManager.getSelectedNotes();

      // Use coordinate service for clean transformations
      const pointerCanvas = this.coordinateTransform.viewportToCanvas(
        event.clientX,
        event.clientY,
      );
      const noteCanvas = this.coordinateTransform.elementToCanvas(noteElement);

      // Calculate shift offsets using clean service API
      this.shiftX = pointerCanvas.x - noteCanvas.x;
      this.shiftY = pointerCanvas.y - noteCanvas.y;

      // Calculate relative offsets for all selected notes using service
      this.selectedNotesOffsets = selectedNotes.map((selectedNote) => {
        const selectedNoteCanvas =
          this.coordinateTransform.elementToCanvas(selectedNote);
        return {
          note: selectedNote,
          offsetX: selectedNoteCanvas.x - noteCanvas.x,
          offsetY: selectedNoteCanvas.y - noteCanvas.y,
        };
      });

      logger.info('Calculated drag offsets', {
        shiftX: this.shiftX,
        shiftY: this.shiftY,
        selectedNotesCount: this.selectedNotesOffsets.length,
      });
    } catch (error) {
      logger.error('Failed to calculate drag offsets:', { error: error });
      // Graceful fallback
      this.shiftX = 0;
      this.shiftY = 0;
      this.selectedNotesOffsets = [];
    }
  }

  /**
   * Update note positions during drag (using CoordinateTransform service)
   */
  updateNotePositions(event) {
    try {
      // Use coordinate service for clean transformation
      const canvasPos = this.coordinateTransform.viewportToCanvas(
        event.clientX,
        event.clientY,
      );

      const offsetX = canvasPos.x - this.shiftX;
      const offsetY = canvasPos.y - this.shiftY;

      // Update positions for all selected notes
      this.selectedNotesOffsets.forEach(
        ({ note, offsetX: relativeX, offsetY: relativeY }) => {
          const noteX = offsetX + relativeX;
          const noteY = offsetY + relativeY;

          // Update DOM position
          note.style.left = `${noteX}px`;
          note.style.top = `${noteY}px`;

          // Update data store via event bus
          this.eventBus.emit('note.updated', {
            id: note.id,
            left: note.style.left,
            top: note.style.top,
          });
        },
      );

      // Update connections for each individual note during drag (like working implementation)
      this.selectedNotesOffsets.forEach(({ note }) => {
        connectionManager.updateConnections(note);
      });
    } catch (error) {
      logger.error('Failed to update note positions:', { error: error });
      // Continue with existing positions on coordinate errors
    }
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
