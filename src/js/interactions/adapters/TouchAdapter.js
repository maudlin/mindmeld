// src/js/interactions/adapters/TouchAdapter.js

import { BaseAdapter } from './BaseAdapter.js';
import { GestureRecognizer } from '../gestures/GestureRecognizer.js';
import { noteManager } from '../../services/noteManager.js';

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
    this.canvasBehavior = null;
    this.connectionBehavior = null;

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
  async initialize(eventBus) {
    await super.initialize(eventBus);

    // Get behavior references from interaction controller
    if (this.interactionController) {
      this.noteBehavior = this.interactionController.getBehavior('note');
      this.dragBehavior = this.interactionController.getBehavior('drag');
      this.selectionBoxBehavior =
        this.interactionController.getBehavior('selectionBox');
      this.canvasBehavior = this.interactionController.getBehavior('canvas');
      this.connectionBehavior =
        this.interactionController.getBehavior('connection');

      console.log('TouchAdapter: Behavior references initialized', {
        hasNoteBehavior: !!this.noteBehavior,
        hasDragBehavior: !!this.dragBehavior,
        hasSelectionBoxBehavior: !!this.selectionBoxBehavior,
        hasCanvasBehavior: !!this.canvasBehavior,
        hasConnectionBehavior: !!this.connectionBehavior,
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

    // Listen to pure gesture detection events
    this.eventBus.on('gesture.tap', (event) => {
      console.log('TouchAdapter: Gesture tap detected', event.touch);
      this.handleTap(event.touch);
    });

    this.eventBus.on('gesture.doubletap', (event) => {
      const touch = event.touch;
      console.log('TouchAdapter: Gesture doubletap detected', {
        x: touch.clientX,
        y: touch.clientY,
        target: touch.target?.tagName,
      });

      // Determine interaction type and delegate to behaviors
      const target = this.expandTouchTarget(touch);
      const noteElement = target.closest('.note');

      if (noteElement) {
        // Note double-tap → NoteBehavior for edit mode
        this.handleNoteDoubleTap(noteElement);
      } else {
        // Canvas double-tap → CanvasBehavior for note creation
        this.handleCanvasDoubleTap(touch);
      }
    });

    this.eventBus.on('gesture.dragstart', (event) => {
      console.log('TouchAdapter: Gesture drag start detected', event.touch);
      this.handleDragStart(event.touch);
    });

    this.eventBus.on('gesture.dragmove', (event) => {
      this.handleDragMove(event.touch);
    });

    this.eventBus.on('gesture.dragend', (event) => {
      console.log('TouchAdapter: Gesture drag end detected');
      this.handleDragEnd(event.touch);
    });

    this.eventBus.on('gesture.longpress', (event) => {
      console.log('TouchAdapter: Gesture long press detected', event.touch);
      this.handleLongPress(event.touch);
    });

    console.log('TouchAdapter: Pure gesture event listeners configured');
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
        
        /* Remove min-height from note-content to prevent double-height appearance */
        /* The parent .note min-height is sufficient for touch targets */
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

    // Check for ghost connector interaction
    if (target.classList.contains('ghost-connector')) {
      this.handleGhostConnectorTap(touch, target);
      return;
    }

    // Check for note interaction
    const noteElement = target.closest('.note');
    if (noteElement) {
      this.handleNoteTap(noteElement);
      return;
    }

    // Check for canvas interaction
    if (target.id === 'canvas' || target.closest('#canvas')) {
      // Check if we're in connection mode - cancel it
      if (this.connectionBehavior && this.connectionBehavior.isConnecting) {
        console.log(
          'TouchAdapter: Canvas tap during connection mode - cancelling connection',
        );
        this.connectionBehavior.cancel();
        return;
      }

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
      this.handleNoteDoubleTap(noteElement);
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
   * Handle ghost connector tap - delegate to ConnectionBehavior
   */
  handleGhostConnectorTap(touch, target) {
    console.log(
      'TouchAdapter: Ghost connector tap detected - delegating to ConnectionBehavior',
    );

    if (!this.connectionBehavior) {
      console.warn('TouchAdapter: ConnectionBehavior not available');
      return;
    }

    const sourceNote = target.closest('.note');
    if (!sourceNote) {
      console.warn('TouchAdapter: No source note found for ghost connector');
      return;
    }

    // Convert touch to event-like object for ConnectionBehavior
    const touchEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      touches: [touch],
      target: target,
      clientX: touch.clientX,
      clientY: touch.clientY,
    };

    // Delegate to ConnectionBehavior for unified touch connection handling
    this.connectionBehavior.startTouchDrag(sourceNote, touchEvent, 'touch');
  }

  /**
   * Handle note tap - check for connection mode first, then delegate to NoteBehavior
   */
  handleNoteTap(noteElement) {
    // Check if we're in connection mode first
    if (this.connectionBehavior && this.connectionBehavior.isConnecting) {
      console.log(
        'TouchAdapter: Note tap during connection mode - completing connection',
      );
      const connectionHandled =
        this.connectionBehavior.handleTouchNoteTap(noteElement);
      if (connectionHandled) {
        return; // Connection was completed or cancelled
      }
    }

    if (!this.noteBehavior) {
      console.warn('TouchAdapter: NoteBehavior not available');
      return;
    }

    console.log(
      'TouchAdapter: Note tap detected, delegating to NoteBehavior for selection',
    );
    // Single tap should select the note, not enter edit mode
    this.noteBehavior.handleNoteSelection(noteElement, false);
  }

  /**
   * Handle note double-tap - enter edit mode if note is selected, otherwise select first
   */
  handleNoteDoubleTap(noteElement) {
    if (!this.noteBehavior) {
      console.warn('TouchAdapter: NoteBehavior not available');
      return;
    }

    console.log('TouchAdapter: Note double-tap detected', {
      noteElementId: noteElement?.id,
      noteElementClasses: noteElement?.className,
      isSelected: noteElement?.classList.contains('selected'),
    });

    // Double-tap on note should ALWAYS enter edit mode
    // Use direct approach like old TouchAdapter for reliability
    console.log(
      'TouchAdapter: Double-tap on note, ensuring selection and entering edit mode',
    );

    // Select the note first if not already selected (using NoteManager directly)
    if (!noteElement.classList.contains('selected')) {
      if (this.noteBehavior) {
        this.noteBehavior.handleNoteSelection(noteElement, false);
      }
    }

    // Directly emit edit request (like old TouchAdapter) to bypass target validation issues
    this.eventBus.emit('note.requestEdit', {
      noteId: noteElement.id,
      noteElement: noteElement,
      _gesture: 'doubletap',
      inputType: 'touch',
    });

    console.log('TouchAdapter: Edit request emitted for note:', noteElement.id);
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
   * Handle long press gesture - add jiggle animation to notes
   */
  handleLongPress(touch) {
    if (!touch) return;

    // Check if long press is on a note
    const noteElement = touch.target?.closest('.note');
    if (noteElement) {
      console.log('TouchAdapter: Long press on note, adding jiggle animation');

      // Ensure note is selected
      if (!noteElement.classList.contains('selected')) {
        noteManager.clearSelections();
        noteManager.selectNote(noteElement);
      }

      // Add jiggle animation class
      noteElement.classList.add('jiggle');

      // Remove jiggle class after animation completes
      setTimeout(() => {
        noteElement.classList.remove('jiggle');
      }, 300); // 0.15s * 2 iterations = 0.3s

      return;
    }

    // Future: Handle long press for context menu on other elements
    console.log('TouchAdapter: Long press on non-note element');
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
   * Handle canvas double-tap - delegate to CanvasBehavior for note creation
   */
  handleCanvasDoubleTap(touch) {
    if (!this.canvasBehavior) {
      console.warn('TouchAdapter: CanvasBehavior not available');
      return;
    }

    console.log(
      'TouchAdapter: Canvas double-tap detected, delegating to CanvasBehavior for note creation',
    );

    // Create event-like object for CanvasBehavior
    const event = this.createEventFromTouch(touch);
    this.canvasBehavior.handleCanvasDoubleClick(event, 'touch');
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
   * Convert touch object to event-like object for NoteBehavior compatibility
   */
  createEventFromTouch(touch) {
    if (!touch) {
      return null;
    }

    // Create an event-like object with the target property that NoteBehavior expects
    return {
      target: touch.target,
      clientX: touch.clientX,
      clientY: touch.clientY,
      type: 'touchend', // Indicate this was converted from touch
      preventDefault: () => {}, // Stub method
      stopPropagation: () => {}, // Stub method
    };
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
