// src/js/interactions/adapters/DesktopAdapter.js

import { BaseAdapter } from './BaseAdapter.js';
import { calculateOffsetPosition, throttle } from '../../utils/utils.js';
import { noteManager } from '../../services/noteManager.js';
import { getZoomLevel } from '../../features/zoom/zoomManager.js';
import { connectionManager } from '../../features/connection/connectionManager.js';
import { appState } from '../../data/observableState.js';
import { eventBus } from '../../core/eventBus.js';

/**
 * Desktop input adapter for mouse, keyboard, and trackpad interactions
 * Handles traditional desktop interaction patterns using Pointer Events
 */
export class DesktopAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = 'desktop';

    // State tracking
    this.canvas = null;
    this.isDragging = false;
    this.isDrawingSelectionBox = false;
    this.dragState = null;
    this.selectionBoxState = null;
    this.selectionBox = null;

    // Movement state (similar to movement.js)
    this.shiftX = 0;
    this.shiftY = 0;
    this.selectedNotesOffsets = [];
    this.hasStateChanged = false;

    // Throttled connection updates
    this.throttledUpdateConnections = throttle(
      (noteOrGroup) => connectionManager.updateConnections(noteOrGroup),
      16,
    );

    // Throttled functions for performance
    this.throttledHandleDoubleClick = throttle(
      this.handleDoubleClickInternal.bind(this),
      500,
    );
    this.throttledUpdateSelectionBox = throttle(
      this.updateSelectionBox.bind(this),
      16,
    ); // ~60fps

    // Bound event handlers for proper cleanup
    this.boundHandlers = {
      pointerDown: this.handlePointerDown.bind(this),
      pointerMove: this.handlePointerMove.bind(this),
      pointerUp: this.handlePointerUp.bind(this),
      doubleClick: this.handleDoubleClick.bind(this),
      wheel: this.handleWheel.bind(this),
      keyDown: this.handleKeyDown.bind(this),
      contextMenu: this.preventContextMenu.bind(this),
    };
  }

  /**
   * Initialize desktop-specific event listeners
   */
  async initializeEventListeners() {
    // Get canvas element
    this.canvas = document.getElementById('canvas');
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    console.log(
      'DesktopAdapter: Initializing event listeners for canvas:',
      this.canvas.id,
    );

    // Canvas-specific events
    this.canvas.addEventListener('pointerdown', this.boundHandlers.pointerDown);
    this.canvas.addEventListener('dblclick', this.boundHandlers.doubleClick);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel);

    // Document-level events for dragging and keyboard
    document.addEventListener('pointermove', this.boundHandlers.pointerMove);
    document.addEventListener('pointerup', this.boundHandlers.pointerUp);
    document.addEventListener('keydown', this.boundHandlers.keyDown);
    document.addEventListener('contextmenu', this.boundHandlers.contextMenu);

    console.log('DesktopAdapter: Event listeners initialized successfully');
  }

  /**
   * Clean up desktop event listeners
   */
  async destroyEventListeners() {
    if (this.canvas) {
      this.canvas.removeEventListener(
        'pointerdown',
        this.boundHandlers.pointerDown,
      );
      this.canvas.removeEventListener(
        'dblclick',
        this.boundHandlers.doubleClick,
      );
      this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    }

    document.removeEventListener('pointermove', this.boundHandlers.pointerMove);
    document.removeEventListener('pointerup', this.boundHandlers.pointerUp);
    document.removeEventListener('keydown', this.boundHandlers.keyDown);
    document.removeEventListener('contextmenu', this.boundHandlers.contextMenu);

    // Cleanup any active selection box
    this.clearSelectionBox();

    // Reset state
    this.canvas = null;
    this.isDragging = false;
    this.isDrawingSelectionBox = false;
    this.dragState = null;
    this.selectionBoxState = null;
  }

  /**
   * Handle pointer down events (replaces mousedown)
   */
  handlePointerDown(event) {
    // Only handle left button (primary pointer)
    if (event.button !== 0) return;

    const target = event.target;

    // Check if clicking on a note
    const note = target.classList.contains('note')
      ? target
      : target.closest('.note');

    if (note && !target.classList.contains('ghost-connector')) {
      // Early return for delete button clicks - let the button handle its own event
      if (target.closest('.shared-delete-button--note')) {
        return; // No interaction handling, no pointer capture, no dragging
      }

      // Don't prevent default for note-content clicks (allows editing)
      if (!target.classList.contains('note-content')) {
        event.preventDefault();
        event.stopPropagation();
      }
      this.handleNoteInteraction(event, note);
    } else if (this.isClickOnCanvas(target)) {
      event.preventDefault();
      event.stopPropagation();
      // Clear selections immediately on canvas click
      noteManager.clearSelections();
      // Exit any active edit mode
      this.emit('canvas.clicked');
      this.startSelectionBox(event);
    }
  }

  /**
   * Handle note interaction (selection and drag start)
   */
  handleNoteInteraction(event, note) {
    const target = event.target;
    const isSelected = note.classList.contains('selected');

    // If clicking on note-content, handle edit mode entry/exit
    if (target.classList.contains('note-content')) {
      // If content already has focus, this is a blur request (exit edit mode)
      if (document.activeElement === target) {
        this.emit('note.requestView', { 
          noteId: note.id,
          noteElement: note 
        });
      } else {
        // Content not focused, this is an edit request (enter edit mode)
        // Ensure note is selected first
        if (!isSelected) {
          noteManager.clearSelections();
          noteManager.selectNote(note);
        }
        this.emit('note.requestEdit', { 
          noteId: note.id,
          noteElement: note 
        });
      }
      return; // Don't start dragging for content editing
    }

    // If clicking outside note-content, exit edit mode for focused content  
    const noteContent = note.querySelector('.note-content');
    if (noteContent && document.activeElement === noteContent) {
      this.emit('note.requestView', { 
        noteId: note.id,
        noteElement: note 
      });
    }

    // Handle selection using noteManager service
    if (event.shiftKey) {
      // Multi-select mode - toggle selection
      if (isSelected) {
        noteManager.deselectNote(note);
      } else {
        noteManager.selectNote(note);
      }
    } else {
      // Single select mode
      if (!isSelected) {
        noteManager.clearSelections();
        noteManager.selectNote(note);
      }
    }

    // Start dragging (only if not clicking on content)
    this.startNoteDrag(event, note);
  }

  /**
   * Start note dragging operation
   */
  startNoteDrag(event, note) {
    this.isDragging = true;

    // Prevent text selection during drag operations
    document.body.classList.add('dragging');

    // Enable drag-optimized connection updates
    connectionManager.setDragState(true);

    this.dragState = {
      note: note,
      pointerId: event.pointerId,
    };

    // Use pointer capture for reliable dragging
    if (this.canvas.setPointerCapture) {
      this.canvas.setPointerCapture(event.pointerId);
    }

    // Calculate movement offsets (adapted from movement.js)
    const selectedNotes = noteManager.getSelectedNotes();
    const zoomLevel = getZoomLevel();
    const scale = zoomLevel / 5;

    const canvasRect = this.canvas.getBoundingClientRect();
    const noteRect = note.getBoundingClientRect();

    this.shiftX =
      (event.clientX - canvasRect.left) / scale -
      (noteRect.left - canvasRect.left) / scale;
    this.shiftY =
      (event.clientY - canvasRect.top) / scale -
      (noteRect.top - canvasRect.top) / scale;

    this.selectedNotesOffsets = selectedNotes.map((selectedNote) => {
      const rect = selectedNote.getBoundingClientRect();
      return {
        note: selectedNote,
        offsetX: (rect.left - noteRect.left) / scale,
        offsetY: (rect.top - noteRect.top) / scale,
      };
    });

    this.hasStateChanged = false;
  }

  /**
   * Start selection box drawing
   */
  startSelectionBox(event) {
    this.isDrawingSelectionBox = true;

    // Prevent text selection during drag operations
    document.body.classList.add('dragging');

    const { left: startX, top: startY } = calculateOffsetPosition(
      this.canvas,
      event,
    );

    this.selectionBoxState = {
      startX: startX,
      startY: startY,
      pointerId: event.pointerId,
    };

    // Use pointer capture for reliable selection box
    if (this.canvas.setPointerCapture) {
      this.canvas.setPointerCapture(event.pointerId);
    }

    // Clear existing selections and create visual selection box
    noteManager.clearSelections();
    this.createSelectionBoxElement(startX, startY);

    this.emit('selection.boxStart', {
      startX: startX,
      startY: startY,
    });
  }

  /**
   * Handle pointer move events (replaces mousemove)
   */
  handlePointerMove(event) {
    if (this.isDragging && this.dragState) {
      this.handleNoteDrag(event);
    } else if (this.isDrawingSelectionBox && this.selectionBoxState) {
      this.handleSelectionBoxDrag(event);
    }
  }

  /**
   * Handle note dragging during pointer move
   */
  handleNoteDrag(event) {
    if (!this.dragState?.note) return;

    // Move notes using pointer coordinates (adapted from movement.js moveAt function)
    const zoomLevel = getZoomLevel();
    const scale = zoomLevel / 5;

    const canvasRect = this.canvas.getBoundingClientRect();

    const canvasX = (event.clientX - canvasRect.left) / scale;
    const canvasY = (event.clientY - canvasRect.top) / scale;

    const offsetX = canvasX - this.shiftX;
    const offsetY = canvasY - this.shiftY;

    this.selectedNotesOffsets.forEach(
      ({ note, offsetX: relativeX, offsetY: relativeY }) => {
        const noteShiftX = offsetX + relativeX;
        const noteShiftY = offsetY + relativeY;
        note.style.left = `${noteShiftX}px`;
        note.style.top = `${noteShiftY}px`;

        // Update data store via event bus
        eventBus.emit('note.updated', {
          id: note.id,
          left: note.style.left,
          top: note.style.top,
        });
      },
    );

    // Update connections for each individual note during drag (immediate for smooth movement)
    this.selectedNotesOffsets.forEach(({ note }) => {
      connectionManager.updateConnections(note);
    });

    this.hasStateChanged = true;

    this.emit('note.dragUpdate', {
      note: this.dragState.note,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  /**
   * Handle selection box update during pointer move
   */
  handleSelectionBoxDrag(event) {
    const { left: currentX, top: currentY } = calculateOffsetPosition(
      this.canvas,
      event,
    );

    this.throttledUpdateSelectionBox(
      this.selectionBoxState.startX,
      this.selectionBoxState.startY,
      currentX,
      currentY,
    );

    this.emit('selection.boxUpdate', {
      startX: this.selectionBoxState.startX,
      startY: this.selectionBoxState.startY,
      endX: currentX,
      endY: currentY,
    });

    // Select notes within the selection box
    this.selectNotesWithinBox();
  }

  /**
   * Handle pointer up events (replaces mouseup)
   */
  handlePointerUp(event) {
    // Release pointer capture
    if (this.canvas.releasePointerCapture) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    if (this.isDragging) {
      this.endNoteDrag(event);
    }

    if (this.isDrawingSelectionBox) {
      this.endSelectionBox(event);
    }
  }

  /**
   * End note dragging operation
   */
  endNoteDrag(event) {
    // Remove dragging class to re-enable text selection
    document.body.classList.remove('dragging');

    // Disable drag-optimized connection updates
    connectionManager.setDragState(false);

    if (this.dragState?.note) {
      // Final connection update for all moved notes (immediate, not throttled)
      this.selectedNotesOffsets.forEach(({ note }) => {
        connectionManager.updateConnections(note, this.canvas);
      });

      // Save state if changes were made
      if (this.hasStateChanged) {
        appState.saveToLocalStorage();
      }
    }

    this.emit('note.dragEnd', {
      note: this.dragState.note,
      endX: event.clientX,
      endY: event.clientY,
    });

    // Reset state
    this.isDragging = false;
    this.dragState = null;
    this.hasStateChanged = false;
    this.selectedNotesOffsets = [];
  }

  /**
   * End selection box operation
   */
  endSelectionBox() {
    // Remove dragging class to re-enable text selection
    document.body.classList.remove('dragging');

    this.emit('selection.boxEnd');
    this.clearSelectionBox();

    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;
  }

  /**
   * Handle double-click events for note creation
   */
  handleDoubleClick(event) {
    console.log(
      'DesktopAdapter: Double-click detected on target:',
      event.target,
      'isClickOnCanvas:',
      this.isClickOnCanvas(event.target),
    );

    // Check if clicking directly on canvas (not on notes)
    if (this.isClickOnCanvas(event.target)) {
      console.log('DesktopAdapter: Processing double-click for note creation');
      this.throttledHandleDoubleClick(event);
    }
  }

  /**
   * Internal double-click handler (throttled)
   */
  handleDoubleClickInternal(event) {
    console.log('DesktopAdapter: Emitting note.createAtPosition event');

    this.emit('note.createAtPosition', {
      canvas: this.canvas,
      event: event,
    });

    this.emit('state.save');
    console.log('DesktopAdapter: Note creation event emitted');
  }

  /**
   * Handle wheel events for zoom and pan
   */
  handleWheel(event) {
    if (event.ctrlKey || event.metaKey) {
      // Zoom with Ctrl/Cmd + wheel
      event.preventDefault();

      const direction = event.deltaY < 0 ? 'in' : 'out';

      this.emit('zoom.change', {
        direction: direction,
        centerX: event.clientX,
        centerY: event.clientY,
      });
    } else {
      // Pan with wheel (natural scrolling)
      this.emit('canvas.pan', {
        deltaX: -event.deltaX,
        deltaY: -event.deltaY,
      });
    }
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event) {
    const isEditingNote = this.isEditingNoteContent(event.target);

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!isEditingNote) {
        // Not editing: delete selected items
        event.preventDefault();
        // Get selected notes and emit delete events for each
        const selectedNotes = document.querySelectorAll('.note.selected');
        selectedNotes.forEach((note) => {
          this.emit('note.deleteWithConnections', {
            note,
            canvas: this.canvas,
          });
        });
        this.emit('state.save');
      } else if (
        event.key === 'Backspace' &&
        event.target.textContent.length === 0
      ) {
        // Editing but content is empty: delete the note
        event.preventDefault();
        const note = event.target.closest('.note');
        if (note) {
          this.emit('note.deleteWithConnections', {
            note,
            canvas: this.canvas,
          });
          this.emit('state.save');
        }
      }
      // If editing with content, allow default behavior
    }
  }

  /**
   * Prevent default context menu
   */
  preventContextMenu(event) {
    event.preventDefault();
  }

  /**
   * Check if target is the canvas (not a note or other element)
   */
  isClickOnCanvas(target) {
    return (
      target.id === 'canvas' ||
      target.classList.contains('background-layout') ||
      (target === this.canvas &&
        !target.classList.contains('note') &&
        !target.closest('.note'))
    );
  }

  /**
   * Check if currently editing note content
   */
  isEditingNoteContent(element) {
    return (
      element.classList.contains('note-content') &&
      element.isContentEditable &&
      document.activeElement === element
    );
  }

  /**
   * Create visual selection box element
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

    this.canvas.appendChild(this.selectionBox);
  }

  /**
   * Update selection box visual
   */
  updateSelectionBox(startX, startY, currentX, currentY) {
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
   * Clear selection box visual
   */
  clearSelectionBox() {
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
  }

  /**
   * Select notes that fall within the current selection box
   */
  selectNotesWithinBox() {
    if (!this.selectionBox) return;

    const notes = document.querySelectorAll('.note');
    const boxRect = this.selectionBox.getBoundingClientRect();

    notes.forEach((note) => {
      const noteRect = note.getBoundingClientRect();

      // Use intersection-based selection instead of containment
      // This is more user-friendly and matches typical selection behavior
      const intersects =
        noteRect.left < boxRect.right &&
        noteRect.right > boxRect.left &&
        noteRect.top < boxRect.bottom &&
        noteRect.bottom > boxRect.top;

      if (intersects) {
        noteManager.selectNote(note);
      } else {
        noteManager.deselectNote(note);
      }
    });
  }
}
