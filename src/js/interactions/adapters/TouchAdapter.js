// src/js/interactions/adapters/TouchAdapter.js

import { BaseAdapter } from './BaseAdapter.js';
import { GestureRecognizer } from '../gestures/GestureRecognizer.js';
import { throttle, calculateOffsetPosition } from '../../utils/utils.js';
import { NoteManager } from '../../core/event.js';
import { getZoomLevel } from '../../features/zoom/zoomManager.js';
import { connectionManager } from '../../features/connection/connectionManager.js';
import { appState } from '../../data/observableState.js';

/**
 * Touch input adapter for mobile and tablet interactions
 * Integrates GestureRecognizer with MindMeld's event-driven architecture
 */
export class TouchAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = 'touch';

    // Core components
    this.gestureRecognizer = null;
    this.canvas = null;

    // Touch interaction state
    this.isDragging = false;
    this.dragState = null;
    this.selectedNotesOffsets = [];
    this.hasStateChanged = false;

    // Connection creation state
    this.selectedConnector = null;
    this.isConnectionMode = false;

    // Multi-select lasso state (MM-145)
    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;
    this.selectionBox = null;

    // Two-finger gesture state
    this.lastPinchCenter = null;

    // Touch-specific settings
    this.HIT_TARGET_EXPANSION = 20; // pixels to expand hit targets

    // Throttled functions for performance
    this.throttledUpdateConnections = throttle(
      (noteOrGroup) => connectionManager.updateConnections(noteOrGroup),
      16,
    );
    this.throttledUpdateSelectionBox = throttle(
      this.updateSelectionBox.bind(this),
      16,
    ); // ~60fps
  }

  /**
   * Initialize touch-specific event listeners
   */
  async initializeEventListeners() {
    // Ensure eventBus is available
    if (!this.eventBus) {
      throw new Error('EventBus not initialized - call init() first');
    }

    // Get canvas element
    this.canvas = document.getElementById('canvas');
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    // Initialize gesture recognizer
    this.gestureRecognizer = new GestureRecognizer(this.eventBus);
    this.gestureRecognizer.initialize(this.canvas);

    // Set up gesture event handling
    this.setupGestureHandling();

    // Set up touch-specific enhancements
    this.setupTouchEnhancements();
  }

  /**
   * Clean up touch event listeners
   */
  async destroyEventListeners() {
    // Clean up gesture recognizer
    if (this.gestureRecognizer) {
      this.gestureRecognizer.destroy();
      this.gestureRecognizer = null;
    }

    // Clean up event listeners
    this.cleanupGestureHandling();

    // Reset state
    this.canvas = null;
    this.isDragging = false;
    this.dragState = null;
    this.selectedNotesOffsets = [];
    this.hasStateChanged = false;

    // Clear connection state
    this.clearConnectionMode();
  }

  /**
   * Set up gesture event handling by overriding GestureRecognizer events
   */
  setupGestureHandling() {
    if (!this.gestureRecognizer) return;

    // Override gesture recognizer methods to handle events through TouchAdapter
    const originalEmitTap = this.gestureRecognizer.emitTap.bind(
      this.gestureRecognizer,
    );
    const originalEmitDoubleTap = this.gestureRecognizer.emitDoubleTap.bind(
      this.gestureRecognizer,
    );
    const originalEmitLongPress = this.gestureRecognizer.emitLongPress.bind(
      this.gestureRecognizer,
    );
    const originalEmitDragStart = this.gestureRecognizer.emitDragStart.bind(
      this.gestureRecognizer,
    );
    const originalEmitDragMove = this.gestureRecognizer.emitDragMove.bind(
      this.gestureRecognizer,
    );
    const originalEmitDragEnd = this.gestureRecognizer.emitDragEnd.bind(
      this.gestureRecognizer,
    );
    const originalEmitPinchStart = this.gestureRecognizer.emitPinchStart.bind(
      this.gestureRecognizer,
    );
    const originalEmitPinchMove = this.gestureRecognizer.emitPinchMove.bind(
      this.gestureRecognizer,
    );
    const originalEmitPinchEnd = this.gestureRecognizer.emitPinchEnd.bind(
      this.gestureRecognizer,
    );

    // Override with TouchAdapter handling
    this.gestureRecognizer.emitTap = (touch) => this.handleTap(touch);
    this.gestureRecognizer.emitDoubleTap = (touch) =>
      this.handleDoubleTap(touch);
    this.gestureRecognizer.emitLongPress = (touch) =>
      this.handleLongPress(touch);
    this.gestureRecognizer.emitDragStart = (touch) =>
      this.handleDragStart(touch);
    this.gestureRecognizer.emitDragMove = (touch) => this.handleDragMove(touch);
    this.gestureRecognizer.emitDragEnd = (touch) => this.handleDragEnd(touch);
    this.gestureRecognizer.emitPinchStart = () => this.handlePinchStart();
    this.gestureRecognizer.emitPinchMove = () => this.handlePinchMove();
    this.gestureRecognizer.emitPinchEnd = () => this.handlePinchEnd();

    // Store original methods for cleanup
    this._originalGestureMethods = {
      emitTap: originalEmitTap,
      emitDoubleTap: originalEmitDoubleTap,
      emitLongPress: originalEmitLongPress,
      emitDragStart: originalEmitDragStart,
      emitDragMove: originalEmitDragMove,
      emitDragEnd: originalEmitDragEnd,
      emitPinchStart: originalEmitPinchStart,
      emitPinchMove: originalEmitPinchMove,
      emitPinchEnd: originalEmitPinchEnd,
    };
  }

  /**
   * Clean up gesture handling
   */
  cleanupGestureHandling() {
    if (this.gestureRecognizer && this._originalGestureMethods) {
      // Restore original methods
      Object.assign(this.gestureRecognizer, this._originalGestureMethods);
      this._originalGestureMethods = null;
    }
  }

  /**
   * Set up touch-specific enhancements
   */
  setupTouchEnhancements() {
    // Add visual feedback for touch interactions
    this.addTouchFeedbackStyles();

    // Enhance hit targets for touch
    this.enhanceHitTargets();
  }

  /**
   * Add CSS for touch-specific visual feedback
   */
  addTouchFeedbackStyles() {
    const styleId = 'touch-adapter-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Touch-specific enhancements */
      .note.touch-active {
        transform: scale(1.05);
        transition: transform 0.1s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      
      /* Ghost connectors use desktop styling for now - 10px for all devices */
      
      @media (pointer: coarse) {
        .note {
          min-width: 44px;
          min-height: 44px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Enhance hit targets for touch interactions
   */
  enhanceHitTargets() {
    // This will be used to expand touch hit areas
    // Implementation depends on specific UI elements
  }

  // Gesture Event Handlers

  /**
   * Handle tap gesture - maps to note selection and canvas interaction
   */
  handleTap(touch) {
    const { target } = this.getTouchTarget(touch.currentX, touch.currentY);

    // Check if tapping on a ghost connector
    if (target.classList.contains('ghost-connector')) {
      this.handleGhostConnectorTap(target);
      return;
    }

    // Check if tapping on a note
    const note = target.classList.contains('note')
      ? target
      : target.closest('.note');

    if (note) {
      this.handleNoteSelection(note);
    } else if (this.isClickOnCanvas(target)) {
      // Tap on canvas - clear selections and cancel operations (MM-145 refined)
      this.clearAllJiggleAnimations();
      this.clearConnectionMode();
      NoteManager.clearSelections();
      this.emit('note.selection.changed');

      // Exit any editing mode
      const activeElement = document.activeElement;
      if (activeElement && activeElement.classList.contains('note-content')) {
        activeElement.blur();
        this.emit('note.editMode.exit', {
          content: activeElement,
          _gesture: 'tap',
        });
      }

      // Clear any other active states
      this.emit('interaction.cancel', { _gesture: 'tap' });
    }
  }

  /**
   * Handle double-tap gesture - maps to note creation or note editing
   */
  handleDoubleTap(touch) {
    const { target } = this.getTouchTarget(touch.currentX, touch.currentY);

    // Check if double-tapping on a note - enter edit mode (MM-145 refined)
    const note = target.classList.contains('note')
      ? target
      : target.closest('.note');

    if (note) {
      // Find the note content element for editing
      const noteContent = note.querySelector('.note-content');
      if (noteContent) {
        // Enter edit mode by focusing the content
        noteContent.focus();

        // Ensure note is selected
        if (!note.classList.contains('selected')) {
          NoteManager.clearSelections();
          NoteManager.selectNote(note);
          this.emit('note.selection.changed');
        }

        this.emit('note.editMode.enter', {
          note: note,
          content: noteContent,
          _gesture: 'doubletap',
        });
      }
      return;
    }

    // Double-tap on canvas creates new note
    if (this.isClickOnCanvas(target)) {
      this.emit('note.createAtPosition', {
        canvas: this.canvas,
        event: {
          clientX: touch.currentX,
          clientY: touch.currentY,
          type: 'doubletap',
        },
        _gesture: 'doubletap',
      });

      this.emit('state.save');
    }
  }

  /**
   * Handle long press gesture - maps to note movement or context menu
   */
  handleLongPress(touch) {
    const { target } = this.getTouchTarget(touch.currentX, touch.currentY);

    // Check if long-pressing on a note - indicate ready to move (MM-145 refined)
    const note = target.classList.contains('note')
      ? target
      : target.closest('.note');

    if (note && !target.classList.contains('ghost-connector')) {
      // Don't start drag on note content (for editing)
      if (target.classList.contains('note-content')) {
        return;
      }

      // Ensure note is selected before indicating ready to move
      if (!note.classList.contains('selected')) {
        NoteManager.clearSelections();
        NoteManager.selectNote(note);
        this.emit('note.selection.changed');
      }

      // Add jiggle animation to indicate note is ready to move (mobile only)
      this.addJiggleAnimation(note);

      // Note: The gesture recognizer will transition to dragging state on movement
      return;
    }

    // Original context menu behavior for other elements (ghost connectors, etc.)
    if (!this.isClickOnCanvas(target)) {
      this.emit('contextmenu.show', {
        x: touch.currentX,
        y: touch.currentY,
        target: target,
        type: 'longpress',
        _gesture: 'longpress',
      });
    }

    // Long press on empty canvas does nothing in refined model
  }

  /**
   * Handle drag start - begins note movement or selection box
   */
  handleDragStart(touch) {
    const { target } = this.getTouchTarget(touch.startX, touch.startY);

    // Check if dragging a note (from press-hold or direct drag)
    const note = target.classList.contains('note')
      ? target
      : target.closest('.note');

    if (note && !target.classList.contains('ghost-connector')) {
      // Don't start drag on note content (for editing)
      if (target.classList.contains('note-content')) {
        return;
      }

      this.startNoteDrag(touch, note, target);
    } else if (this.isClickOnCanvas(target)) {
      // Single finger drag on canvas = multi-select lasso (MM-145 refined)
      this.startSelectionBox(touch);
    }
  }

  /**
   * Handle drag move - continues dragging operation
   */
  handleDragMove(touch) {
    if (this.isDragging && this.dragState) {
      if (this.dragState.type === 'note') {
        this.handleNoteDrag(touch);
      }
      // Canvas panning removed - now handled by two-finger gestures
    } else if (this.isDrawingSelectionBox && this.selectionBoxState) {
      // Handle multi-select lasso dragging (MM-145)
      this.handleSelectionBoxDrag(touch);
    }
  }

  /**
   * Handle drag end - finishes dragging operation
   */
  handleDragEnd(touch) {
    if (this.isDragging && this.dragState) {
      if (this.dragState.type === 'note') {
        this.endNoteDrag(touch);
      }
      // Canvas panning removed - now handled by two-finger gestures
    } else if (this.isDrawingSelectionBox) {
      // Complete multi-select lasso (MM-145)
      this.endSelectionBox(touch);
    }
  }

  /**
   * Handle pinch start - begins zoom or pan operation
   */
  handlePinchStart() {
    const center = this.gestureRecognizer.touchState.getCenterPoint();
    this.lastPinchCenter = center;

    this.emit('zoom.start', {
      centerX: center.x,
      centerY: center.y,
      _gesture: 'pinch',
    });
  }

  /**
   * Handle pinch move - continues zoom or pan operation
   */
  handlePinchMove() {
    const currentDistance =
      this.gestureRecognizer.touchState.getTouchDistance();
    const center = this.gestureRecognizer.touchState.getCenterPoint();

    // Calculate scale change for zoom detection
    const scale = currentDistance / this.gestureRecognizer.initialPinchDistance;
    const scaleChange = Math.abs(scale - 1.0);

    // If there's significant scaling, handle as zoom
    if (scaleChange > 0.05) {
      // 5% threshold
      this.emit('zoom.change', {
        direction: scale > 1 ? 'in' : 'out',
        scale: scale,
        centerX: center.x,
        centerY: center.y,
        _gesture: 'pinch',
      });
    } else if (this.lastPinchCenter) {
      // If no significant scaling, handle as two-finger pan
      const deltaX = center.x - this.lastPinchCenter.x;
      const deltaY = center.y - this.lastPinchCenter.y;

      // Only pan if there's meaningful movement
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        this.emit('canvas.pan', {
          deltaX: deltaX,
          deltaY: deltaY,
          _gesture: 'two-finger-pan',
        });
      }
    }

    // Store center for next comparison
    this.lastPinchCenter = center;
  }

  /**
   * Handle pinch end - finishes zoom or pan operation
   */
  handlePinchEnd() {
    const center = this.gestureRecognizer.touchState.getCenterPoint();
    this.lastPinchCenter = null; // Reset for next pinch

    this.emit('zoom.end', {
      centerX: center.x,
      centerY: center.y,
      _gesture: 'pinch',
    });
  }

  // Touch-specific interaction methods

  /**
   * Get touch target with hit area expansion
   */
  getTouchTarget(x, y) {
    // First try exact hit
    const exactTarget = document.elementFromPoint(x, y);

    // For small UI elements, expand hit area
    const expandedTarget = this.findExpandedTarget(x, y);

    return {
      target: exactTarget,
      expandedTarget: expandedTarget || exactTarget,
    };
  }

  /**
   * Find target with expanded hit area for small elements
   */
  findExpandedTarget(x, y) {
    const expansion = this.HIT_TARGET_EXPANSION;

    // Check for small interactive elements within expansion radius
    const elements = document.querySelectorAll('.ghost-connector, .note');

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const expandedRect = {
        left: rect.left - expansion,
        top: rect.top - expansion,
        right: rect.right + expansion,
        bottom: rect.bottom + expansion,
      };

      if (
        x >= expandedRect.left &&
        x <= expandedRect.right &&
        y >= expandedRect.top &&
        y <= expandedRect.bottom
      ) {
        return element;
      }
    }

    return null;
  }

  /**
   * Handle note selection for touch
   */
  handleNoteSelection(note) {
    const isSelected = note.classList.contains('selected');

    // Add touch feedback
    note.classList.add('touch-active');
    setTimeout(() => note.classList.remove('touch-active'), 150);

    // Handle selection (touch doesn't support shift-select)
    if (!isSelected) {
      NoteManager.clearSelections();
      NoteManager.selectNote(note);
    }

    this.emit('note.selection.changed');
  }

  /**
   * Add jiggle animation to selected note to indicate ready-to-drag state
   */
  addJiggleAnimation(note) {
    // Remove any existing jiggle class first
    note.classList.remove('jiggle');

    // Add jiggle with a small delay for better UX
    setTimeout(() => {
      if (note.classList.contains('selected')) {
        note.classList.add('jiggle');

        // Remove jiggle class after animation completes (2 cycles * 0.3s = 0.6s)
        setTimeout(() => {
          note.classList.remove('jiggle');
        }, 600);
      }
    }, 100);
  }

  /**
   * Remove jiggle animation from note
   */
  removeJiggleAnimation(note) {
    note.classList.remove('jiggle');
  }

  /**
   * Clear jiggle animations from all notes
   */
  clearAllJiggleAnimations() {
    const jiggleNotes = document.querySelectorAll('.note.jiggle');
    jiggleNotes.forEach((note) => {
      note.classList.remove('jiggle');
    });
  }

  /**
   * Handle ghost connector tap for touch connection creation
   */
  handleGhostConnectorTap(connector) {
    // If we're already in connection mode and tapping a different connector
    if (this.isConnectionMode && this.selectedConnector !== connector) {
      this.completeConnection(connector);
      return;
    }

    // If tapping the same connector, deselect it
    if (this.selectedConnector === connector) {
      this.clearConnectionMode();
      return;
    }

    // Start new connection mode
    this.startConnectionMode(connector);
  }

  /**
   * Start connection creation mode with selected connector
   */
  startConnectionMode(connector) {
    // Clear any existing connection mode
    this.clearConnectionMode();

    // Set up new connection mode
    this.selectedConnector = connector;
    this.isConnectionMode = true;

    // Add visual feedback
    connector.classList.add('connector-selected');

    // Emit connection mode started event
    this.emit('connection.modeStarted', {
      connector: connector,
      note: connector.closest('.note'),
      _gesture: 'tap',
    });
  }

  /**
   * Complete connection between selected connector and target connector
   */
  completeConnection(targetConnector) {
    if (!this.selectedConnector || !this.isConnectionMode) return;

    const sourceNote = this.selectedConnector.closest('.note');
    const targetNote = targetConnector.closest('.note');

    // Don't allow self-connections
    if (sourceNote === targetNote) {
      this.clearConnectionMode();
      return;
    }

    // Emit connection creation event
    this.emit('connection.create', {
      sourceConnector: this.selectedConnector,
      targetConnector: targetConnector,
      sourceNote: sourceNote,
      targetNote: targetNote,
      _gesture: 'tap',
    });

    // Clear connection mode
    this.clearConnectionMode();
  }

  /**
   * Clear connection creation mode
   */
  clearConnectionMode() {
    if (this.selectedConnector) {
      this.selectedConnector.classList.remove('connector-selected');
      this.selectedConnector = null;
    }

    if (this.isConnectionMode) {
      this.isConnectionMode = false;
      this.emit('connection.modeCancelled', { _gesture: 'tap' });
    }
  }

  /**
   * Start note dragging operation
   */
  startNoteDrag(touch, note, target) {
    // Don't start drag on note content (for editing)
    if (target.classList.contains('note-content')) {
      return;
    }

    // Remove jiggle animation when drag starts
    this.removeJiggleAnimation(note);

    // Clear connection mode when starting to drag notes
    this.clearConnectionMode();

    this.isDragging = true;

    // Enable drag-optimized connection updates
    connectionManager.setDragState(true);

    this.dragState = {
      type: 'note',
      note: note,
      startX: touch.startX,
      startY: touch.startY,
    };

    // Calculate movement offsets (similar to DesktopAdapter)
    const selectedNotes = NoteManager.getSelectedNotes();
    const zoomLevel = getZoomLevel();
    const scale = zoomLevel / 5;

    const canvasRect = this.canvas.getBoundingClientRect();
    const noteRect = note.getBoundingClientRect();

    this.shiftX =
      (touch.startX - canvasRect.left) / scale -
      (noteRect.left - canvasRect.left) / scale;
    this.shiftY =
      (touch.startY - canvasRect.top) / scale -
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
   * Handle note dragging
   */
  handleNoteDrag(touch) {
    if (!this.dragState?.note) return;

    const zoomLevel = getZoomLevel();
    const scale = zoomLevel / 5;

    const canvasRect = this.canvas.getBoundingClientRect();

    const canvasX = (touch.currentX - canvasRect.left) / scale;
    const canvasY = (touch.currentY - canvasRect.top) / scale;

    const offsetX = canvasX - this.shiftX;
    const offsetY = canvasY - this.shiftY;

    this.selectedNotesOffsets.forEach(
      ({ note, offsetX: relativeX, offsetY: relativeY }) => {
        const noteShiftX = offsetX + relativeX;
        const noteShiftY = offsetY + relativeY;
        note.style.left = `${noteShiftX}px`;
        note.style.top = `${noteShiftY}px`;

        // Update data store via event bus
        this.emit('note.updated', {
          id: note.id,
          left: note.style.left,
          top: note.style.top,
        });
      },
    );

    // Update connections for smooth movement
    this.selectedNotesOffsets.forEach(({ note }) => {
      connectionManager.updateConnections(note);
    });

    this.hasStateChanged = true;

    this.emit('note.dragUpdate', {
      note: this.dragState.note,
      clientX: touch.currentX,
      clientY: touch.currentY,
      _gesture: 'drag',
    });
  }

  /**
   * End note dragging operation
   */
  endNoteDrag(touch) {
    // Disable drag-optimized connection updates
    connectionManager.setDragState(false);

    if (this.dragState?.note) {
      // Final connection update for all moved notes
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
      endX: touch.currentX,
      endY: touch.currentY,
      _gesture: 'drag',
    });

    // Reset state
    this.isDragging = false;
    this.dragState = null;
    this.hasStateChanged = false;
    this.selectedNotesOffsets = [];
  }

  /**
   * Start multi-select lasso box drawing (MM-145)
   */
  startSelectionBox(touch) {
    this.isDrawingSelectionBox = true;

    // Prevent text selection during drag operations
    document.body.classList.add('dragging');

    const { left: startX, top: startY } = calculateOffsetPosition(this.canvas, {
      clientX: touch.currentX,
      clientY: touch.currentY,
    });

    this.selectionBoxState = {
      startX: startX,
      startY: startY,
      touchId: touch.identifier,
    };

    // Clear existing selections and create visual selection box
    NoteManager.clearSelections();
    this.createSelectionBoxElement(startX, startY);

    this.emit('selection.boxStart', {
      startX: startX,
      startY: startY,
      _gesture: 'longpress-drag',
    });
  }

  /**
   * Handle selection box drag update
   */
  handleSelectionBoxDrag(touch) {
    const { left: currentX, top: currentY } = calculateOffsetPosition(
      this.canvas,
      { clientX: touch.currentX, clientY: touch.currentY },
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
      _gesture: 'longpress-drag',
    });

    // Select notes within the selection box
    this.selectNotesWithinBox();
  }

  /**
   * End selection box operation
   */
  endSelectionBox() {
    // Remove dragging class to re-enable text selection
    document.body.classList.remove('dragging');

    // Perform final selection before clearing the box
    this.selectNotesWithinBox();

    // Emit selection changed event
    this.emit('note.selection.changed');

    this.emit('selection.boxEnd', { _gesture: 'longpress-drag' });
    this.clearSelectionBox();

    this.isDrawingSelectionBox = false;
    this.selectionBoxState = null;
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
      border: '2px dashed rgba(102, 102, 240, 0.8)', // Touch-friendly thicker border
      backgroundColor: 'rgba(102, 102, 240, 0.1)',
      left: `${startX}px`,
      top: `${startY}px`,
      width: '0px',
      height: '0px',
      pointerEvents: 'none', // Don't interfere with touch events
      borderRadius: '4px', // Slightly rounded for mobile aesthetic
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

      // Use intersection-based selection (touch-friendly)
      // Both rectangles are in viewport coordinates
      const intersects =
        noteRect.left < boxRect.right &&
        noteRect.right > boxRect.left &&
        noteRect.top < boxRect.bottom &&
        noteRect.bottom > boxRect.top;

      if (intersects) {
        NoteManager.selectNote(note);
      } else {
        NoteManager.deselectNote(note);
      }
    });
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
}
