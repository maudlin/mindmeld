// src/js/interactions/adapters/TouchAdapter.js

import { BaseAdapter } from './BaseAdapter.js';
import { noteManager } from '../../services/noteManager.js';
import { CoordinateTransform } from '../../core/coordinates/CoordinateTransform.js';
import { getZoomLevel } from '../../features/zoom/viewportAdapter.js';

/**
 * Touch input adapter for mobile and tablet interactions
 * Thin input layer that detects touch gestures and delegates to behaviors
 *
 * MM-204: Rebuilt as thin input layer with behavior delegation
 */
export class TouchAdapter extends BaseAdapter {
  constructor(interactionController) {
    super();
    console.log('🏗️ TouchAdapter: constructor called - DIAGNOSTIC');
    this.name = 'touch';

    // Behavior references
    this.interactionController = interactionController;
    this.noteBehavior = null;
    this.dragBehavior = null;
    this.selectionBoxBehavior = null;
    this.canvasBehavior = null;
    this.connectionBehavior = null;
    this.viewportBehavior = null;

    // Core components
    this.canvas = null;
    this.coordinateTransform = null;

    // Touch-specific settings (hit target expansion now handled by CoordinateTransform)

    // Native gesture detection state
    this.currentGesture = null;
    this.gestureStartTarget = null;
    this.isDoubleTapInProgress = false; // Prevent duplicate processing (like desktop)
    this.dragThreshold = 15; // pixels to move before drag starts
    this.longPressThreshold = 500; // milliseconds for long press
    this.lastTap = null; // For double-tap detection
    this.longPressTimer = null; // For long press detection

    // MM-212: Multi-touch gesture state
    // MM-213: Enhanced with previousCenter for frame-to-frame delta calculation
    this.multiTouchState = {
      fingers: new Map(), // Track individual finger positions by identifier
      initialDistance: null, // Distance between fingers at start
      initialCenter: null, // Center point between fingers at start
      lastDistance: null, // Previous distance for pinch detection
      lastCenter: null, // Previous center for pan detection
      previousCenter: null, // MM-213: Previous frame center for delta-based pan
      pinchThreshold: 0.15, // MM-213: Increased from 10% to 15% for less sensitivity
    };
  }

  /**
   * Initialize adapter with behavior references and event listeners
   */
  async initialize(eventBus) {
    try {
      console.log('🔍 TouchAdapter: initialize() called - DIAGNOSTIC');
      await super.initialize(eventBus);

      // Get behavior references from interaction controller
      if (this.interactionController) {
        console.log('TouchAdapter: InteractionController state:', {
          isInitialized: this.interactionController.isInitialized,
          behaviorCount: this.interactionController.behaviors?.size,
          availableBehaviors: Array.from(
            this.interactionController.behaviors?.keys() || [],
          ),
        });

        this.noteBehavior = this.interactionController.getBehavior('note');
        this.dragBehavior = this.interactionController.getBehavior('drag');
        this.selectionBoxBehavior =
          this.interactionController.getBehavior('selectionBox');
        this.canvasBehavior = this.interactionController.getBehavior('canvas');
        this.connectionBehavior =
          this.interactionController.getBehavior('connection');
        this.viewportBehavior =
          this.interactionController.getBehavior('viewport');

        console.log('TouchAdapter: Behavior references initialized', {
          hasNoteBehavior: !!this.noteBehavior,
          hasDragBehavior: !!this.dragBehavior,
          hasSelectionBoxBehavior: !!this.selectionBoxBehavior,
          hasCanvasBehavior: !!this.canvasBehavior,
          hasConnectionBehavior: !!this.connectionBehavior,
          hasViewportBehavior: !!this.viewportBehavior,
        });
      } else {
        console.warn('TouchAdapter: InteractionController not available');
      }

      await this.initializeEventListeners();
    } catch (error) {
      console.error(
        '🔍 TouchAdapter: initialize() failed - DIAGNOSTIC:',
        error,
      );
      throw error;
    }
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

    // Initialize coordinate transform service
    const zoomProvider = { getZoomLevel: () => getZoomLevel() };
    this.coordinateTransform = new CoordinateTransform(this.canvas, zoomProvider);

    // Set up native touch handlers as single source of truth (like DesktopAdapter)
    this.setupNativeTouchHandlers();

    // Set up touch-specific enhancements
    this.setupTouchEnhancements();

    console.log('TouchAdapter: Touch event listeners initialized successfully');
  }

  /**
   * Clean up touch event listeners
   */
  async destroyEventListeners() {
    // Clean up native touch handlers
    if (this.canvas && this.boundHandlers) {
      this.canvas.removeEventListener(
        'touchstart',
        this.boundHandlers.touchStart,
      );
      this.canvas.removeEventListener(
        'touchmove',
        this.boundHandlers.touchMove,
      );
      this.canvas.removeEventListener('touchend', this.boundHandlers.touchEnd);
      this.canvas.removeEventListener(
        'touchcancel',
        this.boundHandlers.touchCancel,
      );
    }

    // Clear any active timers
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Reset state
    this.canvas = null;
    this.boundHandlers = null;
    this.lastTap = null;
    this.currentGesture = null;

    console.log('TouchAdapter: Touch event listeners destroyed');
  }

  /**
   * Set up native touch handlers as single source of truth (like DesktopAdapter)
   */
  setupNativeTouchHandlers() {
    // Touch state for gesture detection
    let touchStartData = null;
    const doubleTapMaxDelay = 300; // milliseconds
    const doubleTapMaxDistance = 30; // pixels

    // Bound event handlers for proper cleanup
    this.boundHandlers = {
      touchStart: (event) => {
        // Clear any existing long press timer
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }

        // Skip if double-tap processing in progress (like desktop approach)
        if (this.isDoubleTapInProgress) {
          return;
        }

        // MM-212: Handle multi-touch gestures
        if (event.touches.length === 2) {
          // Prevent browser default zoom behavior immediately
          event.preventDefault();

          // Two-finger touch - initialize multi-touch state
          this.updateMultiTouchState(event.touches);
          return;
        }

        // Handle single finger touches
        if (event.touches.length === 1) {
          const touch = event.touches[0];
          const now = Date.now();

          // Store touch start data for gesture detection
          touchStartData = {
            touch,
            startTime: now,
            startX: touch.clientX,
            startY: touch.clientY,
            moved: false,
          };

          // Check for double-tap
          if (
            this.lastTap &&
            now - this.lastTap.time <= doubleTapMaxDelay &&
            Math.abs(touch.clientX - this.lastTap.x) <= doubleTapMaxDistance &&
            Math.abs(touch.clientY - this.lastTap.y) <= doubleTapMaxDistance
          ) {
            // Double-tap detected! Immediately prevent interference
            event.preventDefault();
            this.isDoubleTapInProgress = true;

            this.handleDoubleTap(touch);
            this.lastTap = null; // Reset to prevent triple-tap
            touchStartData = null; // Clear touch data

            // Clear flag after processing complete
            setTimeout(() => {
              this.isDoubleTapInProgress = false;
            }, 100);
            return;
          }

          // Start long press timer
          this.longPressTimer = setTimeout(() => {
            if (touchStartData && !touchStartData.moved) {
              this.handleLongPress(touchStartData.touch);
            }
          }, this.longPressThreshold);
        }
      },

      touchMove: (event) => {
        // MM-212: Handle multi-touch gestures
        if (event.touches.length === 2) {
          // Prevent browser default zoom behavior immediately
          event.preventDefault();

          this.updateMultiTouchState(event.touches);

          // Google Maps approach: Detect both gestures and handle simultaneously
          const pinchGesture = this.detectPinchGesture(event.touches);
          const panGesture = this.detectTwoFingerPan(event.touches);

          if (!this.viewportBehavior) {
            console.warn(
              'TouchAdapter: ViewportBehavior not available for gestures',
            );
            return;
          }

          // Handle simultaneous pan and zoom (Google Maps style)
          if (pinchGesture && panGesture) {
            this.viewportBehavior.handleSimultaneousPanZoom(
              panGesture.deltaX,
              panGesture.deltaY,
              pinchGesture.scaleDelta,
              pinchGesture.centerX,
              pinchGesture.centerY,
              'touch',
            );
            return;
          }

          // Handle individual gestures
          if (pinchGesture) {
            this.viewportBehavior.handlePinchZoom(
              pinchGesture.scaleDelta,
              pinchGesture.centerX,
              pinchGesture.centerY,
              'touch',
            );
            return;
          }

          if (panGesture) {
            this.viewportBehavior.handlePan(
              panGesture.deltaX,
              panGesture.deltaY,
              'touch',
            );
            return;
          }
          return;
        }

        // Handle single-finger gestures
        if (!touchStartData || event.touches.length !== 1) return;

        const touch = event.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartData.startX);
        const deltaY = Math.abs(touch.clientY - touchStartData.startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.dragThreshold) {
          touchStartData.moved = true;

          // Clear long press timer - we're now dragging
          if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }

          // Start drag if not already dragging
          if (!this.currentGesture) {
            this.handleDragStart(touchStartData.touch);
          } else if (this.currentGesture === 'drag') {
            this.handleDragMove(touch);
          }
        }
      },

      touchEnd: (event) => {
        // Clear long press timer
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }

        // Handle end of current gesture if we have touch data
        if (touchStartData) {
          if (this.currentGesture === 'drag') {
            this.handleDragEnd(touchStartData.touch);
          } else if (!touchStartData.moved) {
            // Single tap (not moved, not double-tap)
            this.handleTap(touchStartData.touch);

            // Store for potential double-tap
            this.lastTap = {
              time: Date.now(),
              x: touchStartData.startX,
              y: touchStartData.startY,
              target: touchStartData.touch.target,
            };
          }

          // Reset touch data
          touchStartData = null;
        }

        // Always reset gesture state on touch end (even without touchStartData)
        this.currentGesture = null;

        // MM-212: Clean up multi-touch state when touches end
        if (!event || !event.touches || event.touches.length === 0) {
          // No touches remaining - clean up everything
          this.cleanupMultiTouchState();
        } else {
          // Remove ended touches from multi-touch state
          if (event.changedTouches) {
            // Remove each ended touch from the fingers Map
            for (let i = 0; i < event.changedTouches.length; i++) {
              const endedTouch = event.changedTouches[i];
              this.multiTouchState.fingers.delete(endedTouch.identifier);
            }
          }
        }
      },

      touchCancel: () => {
        // Clear timers and reset state on cancellation
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }

        touchStartData = null;
        this.currentGesture = null;

        // MM-212: Clean up multi-touch state on cancel
        this.cleanupMultiTouchState();
      },
    };

    // Add native touch listeners to canvas
    this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart, {
      passive: false,
    });
    this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove, {
      passive: false,
    });
    this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd, {
      passive: false,
    });
    this.canvas.addEventListener(
      'touchcancel',
      this.boundHandlers.touchCancel,
      { passive: false },
    );

    console.log(
      'TouchAdapter: Native touch handlers setup complete (single source of truth)',
    );
  }

  /**
   * Handle double-tap detection (mirrors desktop double-click)
   */
  handleDoubleTap(touch) {
    console.log('TouchAdapter: Native double-tap detected', {
      x: touch.clientX,
      y: touch.clientY,
      target: touch.target?.tagName,
    });

    // Direct delegation like desktop approach - no event bus complexity
    const noteElement = touch.target.closest('.note');
    if (noteElement) {
      // Note double-tap → NoteBehavior for edit mode
      if (this.noteBehavior) {
        console.log(
          'TouchAdapter: Note double-tap, delegating to NoteBehavior',
        );
        this.noteBehavior.handleNoteDoubleClick(noteElement, touch, 'touch');
      }
    } else if (
      touch.target === this.canvas ||
      touch.target.closest('#canvas')
    ) {
      // Canvas double-tap → CanvasBehavior for note creation
      if (this.canvasBehavior) {
        console.log(
          'TouchAdapter: Canvas double-tap, delegating to CanvasBehavior',
        );
        this.canvasBehavior.handleCanvasDoubleClick(touch, 'touch');
      }
    }
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

      // Single tap on canvas - clear note selections and exit edit mode
      console.log(
        'TouchAdapter: Canvas tap detected - clearing selections and exiting edit mode',
      );
      noteManager.clearSelections();
      this.emit('canvas.clicked');
      return;
    }

    console.log('TouchAdapter: No recognized tap target');
  }

  /**
   * Handle drag start - detect what's being dragged
   */
  handleDragStart(touch) {
    if (!touch) return;

    // Set gesture state
    this.currentGesture = 'drag';

    const target = this.expandTouchTarget(touch);
    this.gestureStartTarget = target;

    console.log('TouchAdapter: Drag start detected', {
      target: target.tagName,
      x: touch.clientX,
      y: touch.clientY,
    });

    // Check for note drag
    const noteElement = target.closest('.note');
    if (noteElement) {
      this.handleNoteDragStart(noteElement, touch);
      return;
    }

    // Check for canvas selection box (drag from canvas)
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

    console.log('TouchAdapter: Drag end detected');

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

    // Reset gesture state (handled by touchEnd in native handlers)
    this.gestureStartTarget = null;
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
   * Handle note drag start - delegate to DragBehavior
   */
  handleNoteDragStart(noteElement, touch) {
    if (!this.dragBehavior) {
      console.warn('TouchAdapter: DragBehavior not available');
      return;
    }

    console.log('TouchAdapter: Note drag detected, delegating to DragBehavior');
    // Keep consistent with handleDragStart - use 'drag' not 'note-drag'
    this.dragBehavior.startDrag(noteElement, touch, 'touch');
  }

  /**
   * Handle long press gesture - add jiggle animation to notes
   */
  handleLongPress(touch) {
    if (!touch) return;

    console.log('TouchAdapter: Long press detected', {
      target: touch.target?.tagName,
      x: touch.clientX,
      y: touch.clientY,
    });

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
    // Keep consistent with handleDragStart - use 'drag' not 'selection-box'
    this.selectionBoxBehavior.startSelectionBox(touch, 'touch');
  }

  /**
   * Expand touch target for better touch interaction (using CoordinateTransform service)
   */
  expandTouchTarget(touch) {
    if (!touch || !this.coordinateTransform) {
      return touch?.target || document.body;
    }

    // Use CoordinateTransform service for clean hit target expansion (uses config default)
    return this.coordinateTransform.expandHitTarget(touch);
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

  // MM-212: Multi-touch gesture detection methods

  /**
   * Calculate distance between two touch points
   */
  calculateDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate center point between two touch points
   * Returns viewport-relative coordinates for proper touch handling
   */
  calculateCenter(touch1, touch2) {
    // Calculate center in viewport coordinates
    const viewportCenterX = (touch1.clientX + touch2.clientX) / 2;
    const viewportCenterY = (touch1.clientY + touch2.clientY) / 2;

    return {
      x: viewportCenterX,
      y: viewportCenterY,
    };
  }

  /**
   * Update multi-touch state with current finger positions
   * MM-213: Enhanced with previousCenter tracking for smooth delta calculation
   */
  updateMultiTouchState(touches) {
    // Update finger positions
    this.multiTouchState.fingers.clear();
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      this.multiTouchState.fingers.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        touch: touch,
      });
    }

    // Handle two-finger gestures
    if (touches.length === 2) {
      const touch1 = touches[0];
      const touch2 = touches[1];
      const currentDistance = this.calculateDistance(touch1, touch2);
      const currentCenter = this.calculateCenter(touch1, touch2);

      // Initialize on first two-finger touch
      if (this.multiTouchState.initialDistance === null) {
        this.multiTouchState.initialDistance = currentDistance;
        this.multiTouchState.initialCenter = currentCenter;
        this.multiTouchState.lastDistance = currentDistance;
        this.multiTouchState.lastCenter = currentCenter;
        this.multiTouchState.previousCenter = null; // Will be set on next frame for delta calculation
        return;
      }

      // MM-213: Store previous center before updating current
      this.multiTouchState.previousCenter = this.multiTouchState.lastCenter;

      // Update current state
      this.multiTouchState.lastDistance = currentDistance;
      this.multiTouchState.lastCenter = currentCenter;
    }
  }

  /**
   * Detect pinch gesture (zoom)
   * Thin adapter: Extract scale ratio and let ViewportBehavior handle the logic
   */
  detectPinchGesture(touches) {
    if (touches.length !== 2 || !this.multiTouchState.initialDistance) {
      return null;
    }

    const currentDistance = this.multiTouchState.lastDistance;
    const initialDistance = this.multiTouchState.initialDistance;
    const distanceChange =
      Math.abs(currentDistance - initialDistance) / initialDistance;

    // Only trigger if change > 10%
    if (distanceChange > this.multiTouchState.pinchThreshold) {
      const scaleRatio = currentDistance / initialDistance;
      const center = this.multiTouchState.lastCenter;

      return {
        type: 'pinch',
        scaleDelta: scaleRatio, // Send scale ratio - let ViewportBehavior convert to zoom delta
        centerX: center.x, // Canvas-relative coordinates
        centerY: center.y,
      };
    }

    return null;
  }

  /**
   * Detect two-finger pan gesture
   * Google Maps style: Immediate 1:1 response, no thresholds or damping
   */
  detectTwoFingerPan(touches) {
    if (touches.length !== 2 || !this.multiTouchState.lastCenter) {
      return null;
    }

    // Handle first touchmove after initialization (previousCenter is null)
    if (!this.multiTouchState.previousCenter) {
      // No delta possible yet, but set up for next frame
      return null;
    }

    const currentCenter = this.multiTouchState.lastCenter;
    const previousCenter = this.multiTouchState.previousCenter;

    // Frame-to-frame delta for smooth movement
    const deltaX = currentCenter.x - previousCenter.x;
    const deltaY = currentCenter.y - previousCenter.y;

    // Google Maps approach: No threshold, immediate response, 1:1 movement
    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      return {
        type: 'pan',
        deltaX: deltaX, // No damping - direct 1:1 finger tracking
        deltaY: deltaY, // No damping - direct 1:1 finger tracking
      };
    }

    return null;
  }

  /**
   * Clean up multi-touch state
   * MM-213: Enhanced to clean up previousCenter tracking
   */
  cleanupMultiTouchState() {
    this.multiTouchState.fingers.clear();
    this.multiTouchState.initialDistance = null;
    this.multiTouchState.initialCenter = null;
    this.multiTouchState.lastDistance = null;
    this.multiTouchState.lastCenter = null;
    this.multiTouchState.previousCenter = null; // MM-213: Clean up previous center
  }
}
