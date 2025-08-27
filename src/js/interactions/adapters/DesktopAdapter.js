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
      click: this.handleClick.bind(this), // MM-168: Click-based edit mode
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

    // Listen for delegated events from EventDelegationManager (MM-176)
    this.setupDelegatedEventListeners();

    // Canvas-specific events
    this.canvas.addEventListener('pointerdown', this.boundHandlers.pointerDown);
    this.canvas.addEventListener('dblclick', this.boundHandlers.doubleClick);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel);

    // Document-level events for dragging and keyboard
    document.addEventListener('pointermove', this.boundHandlers.pointerMove);
    document.addEventListener('pointerup', this.boundHandlers.pointerUp);
    document.addEventListener('click', this.boundHandlers.click); // MM-168: Click-based edit mode
    document.addEventListener('keydown', this.boundHandlers.keyDown, true); // Use capture phase for priority
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
    document.removeEventListener('click', this.boundHandlers.click);
    document.removeEventListener('keydown', this.boundHandlers.keyDown, true);
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
   * Setup listeners for delegated events from EventDelegationManager
   * This handles clicks on styled content elements that previously were blocked
   * by the CSS pointer-events hack (MM-176)
   */
  setupDelegatedEventListeners() {
    // Listen for delegated click events
    this.eventBus.on('note.delegatedClick', (data) => {
      console.log('DesktopAdapter: Received delegated click', data);
      // For now, single clicks might select the note
      // This could be enhanced based on requirements
    });

    // The delegated double-click is already handled via note.requestEdit event
    // which is emitted by EventDelegationManager and listened to by EditModeController
    console.log('DesktopAdapter: Delegated event listeners configured');
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
   * MM-168: Edit mode now handled by handleClick method
   */
  handleNoteInteraction(event, note) {
    const target = event.target;
    const isSelected = note.classList.contains('selected');

    // MM-168: Skip note-content clicks - let handleClick manage edit mode
    if (target.classList.contains('note-content')) {
      return; // Edit mode handled by handleClick method
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
   * Handle click events for edit mode (MM-168)
   */
  handleClick(event) {
    const target = event.target;

    console.log('🔥 DesktopAdapter: Click detected', {
      target: target.tagName,
      targetClass: target.className,
      targetText: target.textContent?.substring(0, 20),
      capturePhase: false,
    });

    // Check if clicking on note-content that's actually a textarea (our new approach)
    // Since textarea has class 'note-content', all existing checks will work
    if (
      target.tagName === 'TEXTAREA' &&
      target.classList.contains('note-content')
    ) {
      console.log(
        'DesktopAdapter: Click on textarea note-content, allowing native behavior',
      );
      // Don't interfere with textarea clicks - let them work normally
      return;
    }

    // Check if clicking on a note
    const note = target.classList.contains('note')
      ? target
      : target.closest('.note');

    // Check if the click is inside note-content (target itself or parent)
    // Fixed: Use closest() for both direct clicks and bubbled clicks from styled elements
    const noteContent = target.closest('.note-content');

    if (note && noteContent) {
      // Check if we're already editing this specific note
      const isAlreadyEditing = this.editingNote === note;

      console.log('DesktopAdapter: Click debug:', {
        isAlreadyEditing,
        editingNoteId: this.editingNote?.id,
        clickedNoteId: note.id,
        targetClasses: target.className,
        noteContentClasses: noteContent.className,
        targetTag: target.tagName,
        editingNoteRef: this.editingNote,
        clickedNoteRef: note,
        refsEqual: this.editingNote === note,
      });

      if (isAlreadyEditing) {
        // Already editing this note - allow normal textarea interaction
        console.log(
          'DesktopAdapter: Click on note already being edited, allowing interaction',
        );
        event.stopPropagation();
        return;
      }

      // Note is in view mode - enter edit mode
      console.log(
        'DesktopAdapter: Click on note-content detected, emitting edit request',
        note.id,
      );
      event.preventDefault();
      event.stopPropagation();

      // Emit edit mode request via EventBus
      this.emit('note.requestEdit', {
        noteId: note.id,
        noteElement: note,
        trigger: 'click',
      });

      // Track editing note for click-outside handling
      console.log('DesktopAdapter: Setting editingNote to:', note.id);
      this.editingNote = note;
      return;
    }

    // Handle click-outside for edit mode exit
    // Use the existing isEditingNoteContent method which properly handles textareas
    const isEditingClick = this.isEditingNoteContent(target);
    const isInsideNote = target.closest('.note');

    if (this.editingNote) {
      console.log('DesktopAdapter: Click-outside check:', {
        editingNoteId: this.editingNote.id,
        targetTag: target.tagName,
        targetClass: target.className,
        isEditingClick,
        isInsideNote: !!isInsideNote,
        target: target,
      });
    }

    if (this.editingNote && !isInsideNote && !isEditingClick) {
      console.log(
        'DesktopAdapter: Click outside detected, clearing editingNote:',
        this.editingNote.id,
      );
      this.emit('note.requestView', {
        noteId: this.editingNote.id,
        noteElement: this.editingNote,
        trigger: 'clickOutside',
      });
      this.editingNote = null;
    }
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
    console.log('🔥 DesktopAdapter: Double-click detected', {
      target: event.target.tagName,
      targetClass: event.target.className,
      targetText: event.target.textContent?.substring(0, 20),
      isClickOnCanvas: this.isClickOnCanvas(event.target),
      capturePhase: false,
    });

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
    }
    // Note: Desktop wheel without modifier keys should not pan
    // Pan functionality is available via right-click drag in zoomManager
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event) {
    const isEditingNote = this.isEditingNoteContent(event.target);

    // Handle Enter key - priority over kebab menu
    if (event.key === 'Enter') {
      // Allow color picker to handle Enter on swatches
      if (event.target.matches('.color-swatch')) {
        return;
      }

      // Don't interfere with Enter in edit mode (allows newlines)
      if (!isEditingNote) {
        const focusedNote = this.getFocusedNote();
        if (focusedNote) {
          // Enter on focused note - enter edit mode
          event.preventDefault();
          event.stopPropagation();
          this.emit('note.requestEdit', {
            noteId: focusedNote.id,
            noteElement: focusedNote,
            trigger: 'keyboard',
          });
          this.editingNote = focusedNote;
          return;
        }
      }
      // In edit mode, allow default Enter behavior for newlines
      return;
    }

    // Handle Space key for color picker accessibility
    if (event.key === ' ') {
      // Allow color picker to handle Space on swatches
      if (event.target.matches('.color-swatch')) {
        return;
      }
      // Otherwise, ignore Space key (prevent page scroll)
      return;
    }

    // Handle Escape key
    if (event.key === 'Escape') {
      if (isEditingNote) {
        // Exit edit mode
        event.preventDefault();
        if (this.editingNote) {
          this.emit('note.requestView', {
            noteId: this.editingNote.id,
            noteElement: this.editingNote,
            trigger: 'keyboard',
          });
          this.editingNote = null;
        }
      } else {
        // Deselect all notes
        const selectedNotes = noteManager.getSelectedNotes();
        if (selectedNotes.length > 0) {
          event.preventDefault();
          noteManager.clearSelections();
        }
      }
      return;
    }

    // Handle Ctrl+Enter in edit mode (already working, but documenting)
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      if (isEditingNote) {
        event.preventDefault();
        if (this.editingNote) {
          this.emit('note.requestView', {
            noteId: this.editingNote.id,
            noteElement: this.editingNote,
            trigger: 'keyboard',
          });
          this.editingNote = null;
        }
      }
      return;
    }

    // Handle Delete/Backspace
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
      }
      // If editing (regardless of content), allow default behavior
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
   * Check if content is empty (works with both textarea and contentEditable)
   * @param {HTMLElement} element - The target element
   * @returns {boolean} True if content is empty
   */
  isContentEmpty(element) {
    if (element.tagName === 'TEXTAREA') {
      return element.value.length === 0;
    }

    // For contentEditable or note-content containers
    const textarea = element.querySelector('textarea.edit-textarea');
    if (textarea) {
      return textarea.value.length === 0;
    }

    return element.textContent.length === 0;
  }

  /**
   * Check if currently editing note content
   */
  isEditingNoteContent(element) {
    // Check if element is a textarea in edit mode
    if (
      element.tagName === 'TEXTAREA' &&
      element.classList.contains('edit-textarea')
    ) {
      return true;
    }

    // Check if element is contentEditable note-content
    if (
      element.classList.contains('note-content') &&
      element.isContentEditable
    ) {
      return document.activeElement === element;
    }

    // Check if we're inside a note-content that contains an active textarea
    // Ensure element is a DOM element with closest method
    if (element && typeof element.closest === 'function') {
      const noteContent = element.closest('.note-content');
      if (noteContent) {
        const textarea = noteContent.querySelector('textarea.edit-textarea');
        return textarea && document.activeElement === textarea;
      }
    }

    return false;
  }

  /**
   * Get the currently focused note (selected note with keyboard focus)
   * Returns the note that should respond to Enter key for edit mode
   */
  getFocusedNote() {
    // Check if we have a focused note-content element
    const activeElement = document.activeElement;

    if (activeElement && activeElement.classList.contains('note-content')) {
      return activeElement.closest('.note');
    }

    // Check if active element is within a note
    if (activeElement && activeElement.closest) {
      const parentNote = activeElement.closest('.note');
      if (parentNote) {
        return parentNote;
      }
    }

    // Fallback: if no specific focus, use the first selected note
    const selectedNotes = noteManager.getSelectedNotes();
    if (selectedNotes.length === 1) {
      return selectedNotes[0];
    }

    // If multiple selected or none, no focused note for edit mode
    return null;
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
