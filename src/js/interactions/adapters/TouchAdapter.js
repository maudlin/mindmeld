// src/js/interactions/adapters/TouchAdapter.js

import { BaseAdapter } from './BaseAdapter.js';
import { GestureRecognizer } from '../gestures/GestureRecognizer.js';

/**
 * Touch input adapter for mobile and tablet interactions
 * Thin input layer that detects touch gestures and delegates to behaviors
 *
 * MM-204: Rebuilt as thin input layer with behavior delegation
 */
export class TouchAdapter extends BaseAdapter {
  constructor(interactionController) {
    super();
    this.name = 'touch';

    // Behavior references
    this.interactionController = interactionController;
    this.noteBehavior = null;
    this.dragBehavior = null;
    this.selectionBoxBehavior = null;

    // Core components
    this.gestureRecognizer = null;
    this.canvas = null;

    // Touch-specific settings
    this.HIT_TARGET_EXPANSION = 20; // pixels to expand hit targets for mobile

    // Touch-specific interaction state
    this.currentGesture = null;
    this.gestureStartTarget = null;
  }

  /**
   * Initialize adapter with behavior references and event listeners
   */
  async initialize() {
    await super.initialize();

    // Get behavior references from interaction controller
    if (this.interactionController) {
      this.noteBehavior = this.interactionController.getBehavior('note');
      this.dragBehavior = this.interactionController.getBehavior('drag');
      this.selectionBoxBehavior =
        this.interactionController.getBehavior('selectionBox');

      console.log('TouchAdapter: Behavior references initialized', {
        hasNoteBehavior: !!this.noteBehavior,
        hasDragBehavior: !!this.dragBehavior,
        hasSelectionBoxBehavior: !!this.selectionBoxBehavior,
      });
    }

    await this.initializeEventListeners();
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

    // Set up gesture detection with behavior delegation
    this.setupGestureDetection();

    // Set up touch-specific enhancements
    this.setupTouchEnhancements();

    console.log('TouchAdapter: Touch event listeners initialized successfully');
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

    // Reset state
    this.canvas = null;

    console.log('TouchAdapter: Touch event listeners destroyed');
  }

  /**
   * Set up gesture detection with behavior delegation
   */
  setupGestureDetection() {
    if (!this.gestureRecognizer) return;

    // Override gesture recognizer methods to delegate to behaviors
    const originalEmitTap = this.gestureRecognizer.emitTap.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitTap = (touch) => {
      console.log('TouchAdapter: Tap detected', {
        x: touch.clientX,
        y: touch.clientY,
        target: touch.target?.tagName,
      });

      // Detect interaction type and delegate to behavior
      this.handleTap(touch);

      // Still emit original event for any legacy listeners
      originalEmitTap(touch);
    };

    const originalEmitDoubleTap = this.gestureRecognizer.emitDoubleTap.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitDoubleTap = (touch) => {
      console.log('TouchAdapter: Double-tap detected', {
        x: touch.clientX,
        y: touch.clientY,
        target: touch.target?.tagName,
      });

      // Handle double-tap as note interaction (edit mode)
      this.handleDoubleTap(touch);

      // Still emit original event for any legacy listeners
      originalEmitDoubleTap(touch);
    };

    const originalEmitDragStart = this.gestureRecognizer.emitDragStart.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitDragStart = (touch) => {
      console.log('TouchAdapter: Drag start detected', {
        x: touch.clientX,
        y: touch.clientY,
        target: touch.target?.tagName,
      });

      // Handle drag start - delegate to appropriate behavior
      this.handleDragStart(touch);

      // Still emit original event for any legacy listeners
      originalEmitDragStart(touch);
    };

    const originalEmitDragMove = this.gestureRecognizer.emitDragMove.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitDragMove = (touch) => {
      // Handle drag move - delegate to active behavior
      this.handleDragMove(touch);

      // Still emit original event for any legacy listeners
      originalEmitDragMove(touch);
    };

    const originalEmitDragEnd = this.gestureRecognizer.emitDragEnd.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitDragEnd = (touch) => {
      console.log('TouchAdapter: Drag end detected');

      // Handle drag end - delegate to active behavior
      this.handleDragEnd(touch);

      // Still emit original event for any legacy listeners
      originalEmitDragEnd(touch);
    };

    const originalEmitPinchStart = this.gestureRecognizer.emitPinchStart.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitPinchStart = (touches) => {
      console.log('TouchAdapter: Pinch start detected');

      // Pinch is canvas-specific (zoom) - keep as direct event
      originalEmitPinchStart(touches);
    };

    console.log(
      'TouchAdapter: Gesture detection with behavior delegation configured',
    );
  }

  /**
   * Set up touch-specific UI enhancements (KEEP - this is platform-specific)
   */
  setupTouchEnhancements() {
    // Add touch-friendly feedback styles
    this.addTouchFeedbackStyles();

    // Enhance hit targets for touch
    this.enhanceHitTargets();

    // Disable text selection on touch devices
    document.body.style.webkitTouchCallout = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';
  }

  /**
   * Add CSS for touch feedback (KEEP - platform-specific)
   */
  addTouchFeedbackStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .touch-active {
        background-color: rgba(0, 0, 0, 0.1);
        transition: background-color 0.1s;
      }
      
      .note:active {
        transform: scale(0.98);
        transition: transform 0.1s;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Enhance hit targets for touch interaction (KEEP - platform-specific)
   */
  enhanceHitTargets() {
    const touchStyle = document.createElement('style');
    touchStyle.textContent = `
      @media (pointer: coarse) {
        .note {
          min-height: 44px; /* iOS minimum touch target */
          min-width: 44px;
        }
        
        .note-content {
          min-height: 44px;
        }
      }
    `;
    document.head.appendChild(touchStyle);
  }

  /**
   * Handle tap gesture - detect interaction type and delegate to behaviors
   */
  handleTap(touch) {
    if (!touch) return;

    const target = this.expandTouchTarget(touch);

    // Check for note interaction
    const noteElement = target.closest('.note');
    if (noteElement) {
      this.handleNoteTap(noteElement, touch);
      return;
    }

    // Check for canvas interaction (future: selection start on long press)
    if (target.id === 'canvas' || target.closest('#canvas')) {
      // Single tap on canvas - no action needed
      console.log('TouchAdapter: Canvas tap detected (no action)');
      return;
    }

    console.log('TouchAdapter: No recognized tap target');
  }

  /**
   * Handle double-tap gesture - primarily for edit mode
   */
  handleDoubleTap(touch) {
    if (!touch) return;

    const target = this.expandTouchTarget(touch);

    // Check for note interaction - double tap always tries to edit
    const noteElement = target.closest('.note');
    if (noteElement) {
      this.handleNoteDoubleTap(noteElement, touch);
      return;
    }

    console.log('TouchAdapter: Double-tap on non-note target');
  }

  /**
   * Handle drag start - detect what's being dragged
   */
  handleDragStart(touch) {
    if (!touch) return;

    const target = this.expandTouchTarget(touch);
    this.gestureStartTarget = target;

    // Check for note drag
    const noteElement = target.closest('.note');
    if (noteElement) {
      this.handleNoteDragStart(noteElement, touch);
      return;
    }

    // Check for canvas selection box (long press + drag)
    if (target.id === 'canvas' || target.closest('#canvas')) {
      this.handleSelectionBoxStart(touch);
      return;
    }

    console.log('TouchAdapter: Drag start on unrecognized target');
  }

  /**
   * Handle drag move - delegate to active behavior
   */
  handleDragMove(touch) {
    if (!touch) return;

    // Check if we have active interactions and delegate
    if (this.dragBehavior && this.dragBehavior.isDragging) {
      this.dragBehavior.updateDrag(touch, 'touch');
      return;
    }

    if (
      this.selectionBoxBehavior &&
      this.selectionBoxBehavior.isDrawingSelectionBox
    ) {
      this.selectionBoxBehavior.updateSelectionBox(touch, 'touch');
      return;
    }
  }

  /**
   * Handle drag end - delegate to active behavior
   */
  handleDragEnd(touch) {
    if (!touch) return;

    // Check if we have active interactions and delegate
    if (this.dragBehavior && this.dragBehavior.isDragging) {
      this.dragBehavior.endDrag(touch, 'touch');
    }

    if (
      this.selectionBoxBehavior &&
      this.selectionBoxBehavior.isDrawingSelectionBox
    ) {
      this.selectionBoxBehavior.endSelectionBox(touch, 'touch');
    }

    // Reset gesture state
    this.gestureStartTarget = null;
    this.currentGesture = null;
  }

  /**
   * Handle note tap - delegate to NoteBehavior
   */
  handleNoteTap(noteElement, touch) {
    if (!this.noteBehavior) {
      console.warn('TouchAdapter: NoteBehavior not available');
      return;
    }

    console.log('TouchAdapter: Note tap detected, delegating to NoteBehavior');
    this.noteBehavior.handleNoteClick(noteElement, touch, 'touch');
  }

  /**
   * Handle note double-tap - delegate to NoteBehavior for edit mode
   */
  handleNoteDoubleTap(noteElement, touch) {
    if (!this.noteBehavior) {
      console.warn('TouchAdapter: NoteBehavior not available');
      return;
    }

    console.log(
      'TouchAdapter: Note double-tap detected, delegating to NoteBehavior',
    );
    this.noteBehavior.handleNoteClick(noteElement, touch, 'touch');
  }

  /**
   * Handle note drag start - delegate to DragBehavior
   */
  handleNoteDragStart(noteElement, touch) {
    if (!this.dragBehavior) {
      console.warn('TouchAdapter: DragBehavior not available');
      return;
    }

    console.log('TouchAdapter: Note drag detected, delegating to DragBehavior');
    this.currentGesture = 'note-drag';
    this.dragBehavior.startDrag(noteElement, touch, 'touch');
  }

  /**
   * Handle selection box start - delegate to SelectionBoxBehavior
   */
  handleSelectionBoxStart(touch) {
    if (!this.selectionBoxBehavior) {
      console.warn('TouchAdapter: SelectionBoxBehavior not available');
      return;
    }

    console.log(
      'TouchAdapter: Selection box detected, delegating to SelectionBoxBehavior',
    );
    this.currentGesture = 'selection-box';
    this.selectionBoxBehavior.startSelectionBox(touch, 'touch');
  }

  /**
   * Expand touch target for better touch interaction (touch-specific enhancement)
   */
  expandTouchTarget(touch) {
    const originalTarget = touch?.target;

    // Handle null/undefined touch or target
    if (!originalTarget || typeof originalTarget.closest !== 'function') {
      return originalTarget || document.body;
    }

    // If we hit a note or its content, that's good enough
    if (originalTarget.closest('.note')) {
      return originalTarget;
    }

    // For other targets, check if there's a nearby note within hit expansion
    const notes = document.querySelectorAll('.note');
    for (const note of notes) {
      const noteRect = note.getBoundingClientRect();
      const expandedRect = {
        left: noteRect.left - this.HIT_TARGET_EXPANSION,
        top: noteRect.top - this.HIT_TARGET_EXPANSION,
        right: noteRect.right + this.HIT_TARGET_EXPANSION,
        bottom: noteRect.bottom + this.HIT_TARGET_EXPANSION,
      };

      if (
        touch.clientX >= expandedRect.left &&
        touch.clientX <= expandedRect.right &&
        touch.clientY >= expandedRect.top &&
        touch.clientY <= expandedRect.bottom
      ) {
        return note;
      }
    }

    return originalTarget;
  }

  /**
   * Clear any active connection mode state (UTILITY - keep)
   */
  clearConnectionMode() {
    this.isConnectionMode = false;
    this.selectedConnector = null;

    // Remove any visual connection indicators
    document.querySelectorAll('.connection-mode').forEach((element) => {
      element.classList.remove('connection-mode');
    });
  }
}
