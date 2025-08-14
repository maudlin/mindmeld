// src/js/interactions/adapters/TouchAdapter.js

import { BaseAdapter } from './BaseAdapter.js';
import { GestureRecognizer } from '../gestures/GestureRecognizer.js';
import { throttle } from '../../utils/utils.js';
import { NoteManager } from '../../core/event.js';
import { getZoomLevel } from '../../features/zoom/zoomManager.js';
import { connectionManager } from '../../features/connection/connectionManager.js';
import { appState } from '../../data/observableState.js';
import { eventBus } from '../../core/eventBus.js';

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

    // Touch-specific settings
    this.HIT_TARGET_EXPANSION = 20; // pixels to expand hit targets
    this.MOMENTUM_DECAY = 0.95;
    this.MIN_MOMENTUM_VELOCITY = 0.5;

    // Movement tracking for momentum
    this.lastMoveTime = 0;
    this.lastVelocity = { x: 0, y: 0 };
    this.momentumAnimation = null;

    // Throttled functions for performance
    this.throttledUpdateConnections = throttle(
      (noteOrGroup) => connectionManager.updateConnections(noteOrGroup),
      16,
    );
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

    // Clean up momentum animation
    this.stopMomentum();

    // Clean up event listeners
    this.cleanupGestureHandling();

    // Reset state
    this.canvas = null;
    this.isDragging = false;
    this.dragState = null;
    this.selectedNotesOffsets = [];
    this.hasStateChanged = false;
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
      
      .ghost-connector {
        min-width: 44px;
        min-height: 44px;
      }
      
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
   * Handle tap gesture - maps to note selection
   */
  handleTap(touch) {
    const { target } = this.getTouchTarget(touch.currentX, touch.currentY);

    // Check if tapping on a note
    const note = target.classList.contains('note')
      ? target
      : target.closest('.note');

    if (note) {
      this.handleNoteSelection(note);
    } else if (this.isClickOnCanvas(target)) {
      // Tap on canvas - clear selections
      NoteManager.clearSelections();
      this.emit('note.selection.changed');
    }
  }

  /**
   * Handle double-tap gesture - maps to note creation
   */
  handleDoubleTap(touch) {
    const { target } = this.getTouchTarget(touch.currentX, touch.currentY);

    // Only create notes on canvas, not on existing notes
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
   * Handle long press gesture - maps to context menu
   */
  handleLongPress(touch) {
    const { target } = this.getTouchTarget(touch.currentX, touch.currentY);

    this.emit('contextmenu.show', {
      x: touch.currentX,
      y: touch.currentY,
      target: target,
      type: 'longpress',
      _gesture: 'longpress',
    });
  }

  /**
   * Handle drag start - begins note or canvas dragging
   */
  handleDragStart(touch) {
    const { target } = this.getTouchTarget(touch.startX, touch.startY);

    // Check if dragging a note
    const note = target.classList.contains('note')
      ? target
      : target.closest('.note');

    if (note && !target.classList.contains('ghost-connector')) {
      this.startNoteDrag(touch, note, target);
    } else if (this.isClickOnCanvas(target)) {
      this.startCanvasPan(touch);
    }
  }

  /**
   * Handle drag move - continues dragging operation
   */
  handleDragMove(touch) {
    if (this.isDragging && this.dragState) {
      if (this.dragState.type === 'note') {
        this.handleNoteDrag(touch);
      } else if (this.dragState.type === 'canvas') {
        this.handleCanvasPan(touch);
      }
    }

    // Track velocity for momentum
    this.updateVelocityTracking(touch);
  }

  /**
   * Handle drag end - finishes dragging operation
   */
  handleDragEnd(touch) {
    if (this.isDragging && this.dragState) {
      if (this.dragState.type === 'note') {
        this.endNoteDrag(touch);
      } else if (this.dragState.type === 'canvas') {
        this.endCanvasPan(touch);
      }
    }
  }

  /**
   * Handle pinch start - begins zoom operation
   */
  handlePinchStart() {
    const center = this.gestureRecognizer.touchState.getCenterPoint();
    this.emit('zoom.start', {
      centerX: center.x,
      centerY: center.y,
      _gesture: 'pinch',
    });
  }

  /**
   * Handle pinch move - continues zoom operation
   */
  handlePinchMove() {
    const currentDistance =
      this.gestureRecognizer.touchState.getTouchDistance();
    const scale = currentDistance / this.gestureRecognizer.initialPinchDistance;
    const center = this.gestureRecognizer.touchState.getCenterPoint();

    this.emit('zoom.change', {
      direction: scale > 1 ? 'in' : 'out',
      scale: scale,
      centerX: center.x,
      centerY: center.y,
      _gesture: 'pinch',
    });
  }

  /**
   * Handle pinch end - finishes zoom operation
   */
  handlePinchEnd() {
    const center = this.gestureRecognizer.touchState.getCenterPoint();
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
   * Start note dragging operation
   */
  startNoteDrag(touch, note, target) {
    // Don't start drag on note content (for editing)
    if (target.classList.contains('note-content')) {
      return;
    }

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
        eventBus.emit('note.updated', {
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
   * Start canvas panning
   */
  startCanvasPan(touch) {
    this.isDragging = true;

    this.dragState = {
      type: 'canvas',
      startX: touch.startX,
      startY: touch.startY,
      lastX: touch.startX,
      lastY: touch.startY,
    };
  }

  /**
   * Handle canvas panning
   */
  handleCanvasPan(touch) {
    if (!this.dragState) return;

    const deltaX = touch.currentX - this.dragState.lastX;
    const deltaY = touch.currentY - this.dragState.lastY;

    // Emit canvas pan event (maps to existing canvas pan handling)
    this.emit('canvas.pan', {
      deltaX: deltaX,
      deltaY: deltaY,
      _gesture: 'drag',
    });

    // Update tracking
    this.dragState.lastX = touch.currentX;
    this.dragState.lastY = touch.currentY;
  }

  /**
   * End canvas panning with momentum
   */
  endCanvasPan() {
    // Apply momentum if velocity is sufficient
    if (
      Math.abs(this.lastVelocity.x) > this.MIN_MOMENTUM_VELOCITY ||
      Math.abs(this.lastVelocity.y) > this.MIN_MOMENTUM_VELOCITY
    ) {
      this.startMomentum();
    }

    // Reset state
    this.isDragging = false;
    this.dragState = null;
  }

  /**
   * Update velocity tracking for momentum
   */
  updateVelocityTracking(touch) {
    const now = Date.now();
    const timeDelta = now - this.lastMoveTime;

    if (timeDelta > 0 && this.dragState) {
      const deltaX = touch.currentX - this.dragState.lastX;
      const deltaY = touch.currentY - this.dragState.lastY;

      this.lastVelocity = {
        x: deltaX / timeDelta,
        y: deltaY / timeDelta,
      };
    }

    this.lastMoveTime = now;
  }

  /**
   * Start momentum animation
   */
  startMomentum() {
    this.stopMomentum();

    const animateMomentum = () => {
      // Apply momentum decay
      this.lastVelocity.x *= this.MOMENTUM_DECAY;
      this.lastVelocity.y *= this.MOMENTUM_DECAY;

      // Continue if velocity is sufficient
      if (
        Math.abs(this.lastVelocity.x) > this.MIN_MOMENTUM_VELOCITY ||
        Math.abs(this.lastVelocity.y) > this.MIN_MOMENTUM_VELOCITY
      ) {
        // Apply momentum pan
        this.emit('canvas.pan', {
          deltaX: this.lastVelocity.x * 16, // Scale for frame time
          deltaY: this.lastVelocity.y * 16,
          _gesture: 'momentum',
        });

        this.momentumAnimation = requestAnimationFrame(animateMomentum);
      } else {
        this.stopMomentum();
      }
    };

    this.momentumAnimation = requestAnimationFrame(animateMomentum);
  }

  /**
   * Stop momentum animation
   */
  stopMomentum() {
    if (this.momentumAnimation) {
      cancelAnimationFrame(this.momentumAnimation);
      this.momentumAnimation = null;
    }
    this.lastVelocity = { x: 0, y: 0 };
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
