// src/js/interactions/gestures/GestureRecognizer.js

import { TouchState } from './TouchState.js';

/**
 * Core gesture recognition system with state machine
 * Maps multi-touch interactions to MindMeld's event bus system
 */
export class GestureRecognizer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.touchState = new TouchState();

    // Gesture timing constants
    this.DOUBLE_TAP_MAX_DELAY = 300; // ms between taps
    this.LONG_PRESS_THRESHOLD = 500; // ms to trigger long press
    this.TAP_MAX_MOVEMENT = 10; // pixels
    this.DRAG_MIN_MOVEMENT = 15; // pixels to start drag
    this.PINCH_MIN_DISTANCE_CHANGE = 20; // pixels to detect pinch

    // State machine states
    this.STATES = {
      IDLE: 'idle',
      SINGLE_TOUCH: 'singleTouch',
      POTENTIAL_TAP: 'potentialTap',
      POTENTIAL_DOUBLE_TAP: 'potentialDoubleTap',
      DRAGGING: 'dragging',
      MULTI_TOUCH: 'multiTouch',
      PINCHING: 'pinching',
      LONG_PRESSING: 'longPressing',
    };

    this.currentState = this.STATES.IDLE;

    // Double tap detection - separate tracking for different target types
    this.lastNoteTapTime = 0;
    this.lastNoteTapPosition = null;
    this.lastCanvasTapTime = 0;
    this.lastCanvasTapPosition = null;
    this.longPressTimer = null;
    this.initialPinchDistance = 0;

    // Bind methods for event listeners
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchCancel.bind(this);
  }

  /**
   * Initialize gesture recognition on target element
   * @param {HTMLElement} element - Target element to attach listeners
   */
  initialize(element) {
    this.element = element;

    // Add touch event listeners
    element.addEventListener('touchstart', this.handleTouchStart, {
      passive: false,
    });
    element.addEventListener('touchmove', this.handleTouchMove, {
      passive: false,
    });
    element.addEventListener('touchend', this.handleTouchEnd, {
      passive: false,
    });
    element.addEventListener('touchcancel', this.handleTouchCancel, {
      passive: false,
    });
  }

  /**
   * Clean up gesture recognition
   */
  destroy() {
    if (this.element) {
      this.element.removeEventListener('touchstart', this.handleTouchStart);
      this.element.removeEventListener('touchmove', this.handleTouchMove);
      this.element.removeEventListener('touchend', this.handleTouchEnd);
      this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    }

    this.clearLongPressTimer();
    this.touchState.reset();
    this.currentState = this.STATES.IDLE;
  }

  /**
   * Handle touch start events
   * @param {TouchEvent} event - Touch event
   */
  handleTouchStart(event) {
    // Don't prevent default for delete buttons - they need to work normally
    if (
      event.target &&
      event.target.closest &&
      event.target.closest('.shared-delete-button--note')
    ) {
      return;
    }

    // Prevent default browser behaviors for our custom gestures
    event.preventDefault();

    // Add all new touches to state
    for (let i = 0; i < event.changedTouches.length; i++) {
      this.touchState.addTouch(event.changedTouches[i], event.target);
    }

    this.updateStateMachine();
  }

  /**
   * Handle touch move events
   * @param {TouchEvent} event - Touch event
   */
  handleTouchMove(event) {
    event.preventDefault();

    // Update all moved touches in state
    for (let i = 0; i < event.changedTouches.length; i++) {
      this.touchState.updateTouch(event.changedTouches[i]);
    }

    this.updateStateMachine();
  }

  /**
   * Handle touch end events
   * @param {TouchEvent} event - Touch event
   */
  handleTouchEnd(event) {
    event.preventDefault();
    console.log(
      'GestureRecognizer: handleTouchEnd called with',
      event.changedTouches?.length,
      'changed touches',
    );

    // Store touch data before removing from state
    const endedTouches = [];
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touchId = event.changedTouches[i].identifier;
      const touchData = this.touchState.getTouch(touchId);
      if (touchData) {
        endedTouches.push(touchData);
      }
    }

    // Remove ended touches from state
    for (let i = 0; i < event.changedTouches.length; i++) {
      this.touchState.removeTouch(event.changedTouches[i].identifier);
    }

    // Store ended touches for state machine processing
    this._endedTouches = endedTouches;

    this.updateStateMachine();

    // Clean up ended touches reference
    this._endedTouches = null;
  }

  /**
   * Handle touch cancel events
   * @param {TouchEvent} event - Touch event
   */
  handleTouchCancel(event) {
    // Cancel is treated same as end
    this.handleTouchEnd(event);
  }

  /**
   * Update the gesture recognition state machine
   */
  updateStateMachine() {
    const touchCount = this.touchState.getTouchCount();
    const primary = this.touchState.getPrimaryTouch();
    console.log(
      `GestureRecognizer: updateStateMachine called - state: ${this.currentState}, touchCount: ${touchCount}`,
    );

    switch (this.currentState) {
      case this.STATES.IDLE:
        this.handleIdleState(touchCount);
        break;

      case this.STATES.SINGLE_TOUCH:
        this.handleSingleTouchState(touchCount, primary);
        break;

      case this.STATES.POTENTIAL_TAP:
        this.handlePotentialTapState(touchCount, primary);
        break;

      case this.STATES.POTENTIAL_DOUBLE_TAP:
        this.handlePotentialDoubleTapState(touchCount);
        break;

      case this.STATES.DRAGGING:
        this.handleDraggingState(touchCount, primary);
        break;

      case this.STATES.MULTI_TOUCH:
        this.handleMultiTouchState(touchCount);
        break;

      case this.STATES.PINCHING:
        this.handlePinchingState(touchCount);
        break;

      case this.STATES.LONG_PRESSING:
        this.handleLongPressingState(touchCount, primary);
        break;
    }
  }

  /**
   * Handle idle state
   */
  handleIdleState(touchCount) {
    if (touchCount === 1) {
      this.transitionTo(this.STATES.SINGLE_TOUCH);
      this.startLongPressTimer();
    } else if (touchCount > 1) {
      this.transitionTo(this.STATES.MULTI_TOUCH);
      // Initialize pinch distance when entering multi-touch
      if (touchCount === 2) {
        this.initialPinchDistance = this.touchState.getTouchDistance();
      }
    }
  }

  /**
   * Handle single touch state
   */
  handleSingleTouchState(touchCount, primary) {
    if (touchCount === 0) {
      // Touch ended - potential tap
      this.clearLongPressTimer();

      if (this.touchState.isLikelyTap(this.TAP_MAX_MOVEMENT)) {
        this.transitionTo(this.STATES.POTENTIAL_TAP);
        // Use the ended touch data that was stored
        const touchData =
          this._endedTouches && this._endedTouches[0]
            ? this._endedTouches[0]
            : primary;
        this.processPotentialTap(touchData);
      } else {
        this.transitionTo(this.STATES.IDLE);
        this.touchState.reset();
      }
    } else if (touchCount > 1) {
      this.clearLongPressTimer();
      this.transitionTo(this.STATES.MULTI_TOUCH);
    } else if (
      primary &&
      this.touchState.getTotalMovement() >= this.DRAG_MIN_MOVEMENT
    ) {
      this.clearLongPressTimer();
      this.transitionTo(this.STATES.DRAGGING);
      this.emitDragStart(primary);
    }
  }

  /**
   * Handle potential tap state
   */
  handlePotentialTapState(touchCount) {
    if (touchCount === 1) {
      // New touch started - potential double tap
      this.transitionTo(this.STATES.POTENTIAL_DOUBLE_TAP);
      this.startLongPressTimer();
    } else if (touchCount === 0) {
      // Wait briefly for potential second tap
      setTimeout(() => {
        if (this.currentState === this.STATES.POTENTIAL_TAP) {
          this.transitionTo(this.STATES.IDLE);
          this.touchState.reset();
        }
      }, this.DOUBLE_TAP_MAX_DELAY);
    }
  }

  /**
   * Handle potential double tap state
   */
  handlePotentialDoubleTapState(touchCount) {
    console.log(
      'GestureRecognizer: handlePotentialDoubleTapState called with touchCount:',
      touchCount,
    );
    if (touchCount === 0) {
      this.clearLongPressTimer();

      if (this.touchState.isLikelyTap(this.TAP_MAX_MOVEMENT)) {
        // Use the ended touch data that was stored
        const touchData =
          this._endedTouches && this._endedTouches[0]
            ? this._endedTouches[0]
            : this.touchState.getPrimaryTouch();

        // Check if this tap is close enough to the last tap for double tap
        const tapPosition = { x: touchData.currentX, y: touchData.currentY };
        const now = Date.now();

        // Determine target type and get appropriate timing data
        const target = touchData.target;
        const isNoteTarget =
          target &&
          (target.closest('.note') ||
            target.classList?.contains('note-content') ||
            target.tagName === 'H1' ||
            target.tagName === 'P');

        const isCanvasTarget =
          target &&
          (target.id === 'canvas' ||
            target.closest('#canvas') ||
            target.classList?.contains('background-layout'));

        let lastTapTime, lastTapPosition;
        if (isNoteTarget) {
          lastTapTime = this.lastNoteTapTime;
          lastTapPosition = this.lastNoteTapPosition;
        } else if (isCanvasTarget) {
          lastTapTime = this.lastCanvasTapTime;
          lastTapPosition = this.lastCanvasTapPosition;
        } else {
          lastTapTime = 0; // Unknown target, no double-tap
          lastTapPosition = null;
        }

        const timeDiff = lastTapTime ? now - lastTapTime : 0;
        const distance = lastTapPosition
          ? this.calculateDistance(tapPosition, lastTapPosition)
          : 0;

        console.log(
          `GestureRecognizer: Tap analysis - target: ${isNoteTarget ? 'note' : isCanvasTarget ? 'canvas' : 'other'}, timeDiff: ${timeDiff}ms, distance: ${distance}px, hasLastTap: ${!!lastTapTime}`,
        );

        if (
          lastTapTime &&
          now - lastTapTime <= this.DOUBLE_TAP_MAX_DELAY &&
          lastTapPosition &&
          this.calculateDistance(tapPosition, lastTapPosition) <=
            this.TAP_MAX_MOVEMENT
        ) {
          console.log('GestureRecognizer: Double-tap detected!');
          this.emitDoubleTap(touchData);

          // Clear the appropriate timing data
          if (isNoteTarget) {
            this.lastNoteTapTime = 0;
            this.lastNoteTapPosition = null;
          } else if (isCanvasTarget) {
            this.lastCanvasTapTime = 0;
            this.lastCanvasTapPosition = null;
          }

          // IMPORTANT: Transition to IDLE to prevent processing more touchend events for this gesture
          this.transitionTo(this.STATES.IDLE);
        } else {
          // Emit single tap and store timing for appropriate target type
          this.emitTap(touchData);

          if (isNoteTarget) {
            console.log(
              'GestureRecognizer: Single tap on note - storing for potential double-tap',
            );
            this.lastNoteTapTime = Date.now();
            this.lastNoteTapPosition = tapPosition;
          } else if (isCanvasTarget) {
            console.log(
              'GestureRecognizer: Single tap on canvas - storing for potential double-tap',
            );
            this.lastCanvasTapTime = Date.now();
            this.lastCanvasTapPosition = tapPosition;
          } else {
            console.log(
              'GestureRecognizer: Single tap on other target - not storing timing data',
            );
          }
        }
      }

      this.transitionTo(this.STATES.IDLE);
      this.touchState.reset();
    }
  }

  /**
   * Handle dragging state
   */
  handleDraggingState(touchCount, primary) {
    if (touchCount === 0) {
      // Use the ended touch data that was stored
      const touchData =
        this._endedTouches && this._endedTouches[0]
          ? this._endedTouches[0]
          : primary;
      this.emitDragEnd(touchData);
      this.transitionTo(this.STATES.IDLE);
      this.touchState.reset();
    } else if (primary) {
      this.emitDragMove(primary);
    }
  }

  /**
   * Handle multi-touch state
   */
  handleMultiTouchState(touchCount) {
    if (touchCount < 2) {
      this.transitionTo(this.STATES.IDLE);
      this.touchState.reset();
      this.initialPinchDistance = 0;
    } else if (touchCount === 2) {
      // Check for pinch gesture
      const currentDistance = this.touchState.getTouchDistance();
      if (currentDistance !== null && this.initialPinchDistance > 0) {
        if (
          Math.abs(currentDistance - this.initialPinchDistance) >=
          this.PINCH_MIN_DISTANCE_CHANGE
        ) {
          this.transitionTo(this.STATES.PINCHING);
          this.emitPinchStart();
        }
      }
    }
  }

  /**
   * Handle pinching state
   */
  handlePinchingState(touchCount) {
    if (touchCount < 2) {
      this.emitPinchEnd();
      this.transitionTo(this.STATES.IDLE);
      this.touchState.reset();
      this.initialPinchDistance = 0;
    } else {
      this.emitPinchMove();
    }
  }

  /**
   * Handle long pressing state
   */
  handleLongPressingState(touchCount, primary) {
    if (touchCount === 0) {
      this.transitionTo(this.STATES.IDLE);
      this.touchState.reset();
    } else if (
      primary &&
      this.touchState.getTotalMovement() >= this.TAP_MAX_MOVEMENT
    ) {
      // Movement detected, cancel long press
      this.transitionTo(this.STATES.DRAGGING);
      this.emitDragStart(primary);
    }
  }

  /**
   * Transition to new state
   */
  transitionTo(newState) {
    this.currentState = newState;
  }

  /**
   * Start long press timer
   */
  startLongPressTimer() {
    this.clearLongPressTimer();

    this.longPressTimer = setTimeout(() => {
      if (
        this.currentState === this.STATES.SINGLE_TOUCH ||
        this.currentState === this.STATES.POTENTIAL_DOUBLE_TAP
      ) {
        this.transitionTo(this.STATES.LONG_PRESSING);
        this.emitLongPress(this.touchState.getPrimaryTouch());
      }
    }, this.LONG_PRESS_THRESHOLD);
  }

  /**
   * Clear long press timer
   */
  clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Process potential tap and check for double tap
   */
  processPotentialTap(touch) {
    const now = Date.now();
    const tapPosition = { x: touch.currentX, y: touch.currentY };

    // Determine target type and get appropriate timing data
    const target = touch.target;
    const isNoteTarget =
      target &&
      (target.closest('.note') ||
        target.classList?.contains('note-content') ||
        target.tagName === 'H1' ||
        target.tagName === 'P');

    const isCanvasTarget =
      target &&
      (target.id === 'canvas' ||
        target.closest('#canvas') ||
        target.classList?.contains('background-layout'));

    let lastTapTime, lastTapPosition;
    if (isNoteTarget) {
      lastTapTime = this.lastNoteTapTime;
      lastTapPosition = this.lastNoteTapPosition;
    } else if (isCanvasTarget) {
      lastTapTime = this.lastCanvasTapTime;
      lastTapPosition = this.lastCanvasTapPosition;
    } else {
      lastTapTime = 0; // Unknown target, no double-tap
      lastTapPosition = null;
    }

    // Check if this could be a double tap
    if (
      lastTapTime &&
      now - lastTapTime <= this.DOUBLE_TAP_MAX_DELAY &&
      lastTapPosition &&
      this.calculateDistance(tapPosition, lastTapPosition) <=
        this.TAP_MAX_MOVEMENT
    ) {
      // This is a double tap - don't emit single tap, reset appropriate tap tracking
      if (isNoteTarget) {
        this.lastNoteTapTime = 0;
        this.lastNoteTapPosition = null;
      } else if (isCanvasTarget) {
        this.lastCanvasTapTime = 0;
        this.lastCanvasTapPosition = null;
      }
    } else {
      // Single tap
      this.emitTap(touch);

      // Store timing for appropriate target type
      if (isNoteTarget) {
        this.lastNoteTapTime = now;
        this.lastNoteTapPosition = tapPosition;
      } else if (isCanvasTarget) {
        this.lastCanvasTapTime = now;
        this.lastCanvasTapPosition = tapPosition;
      }
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Event emission methods - Pure gesture detection only (no business logic)

  /**
   * Emit single tap gesture detection → gesture.tap
   */
  emitTap(touch) {
    this.eventBus.emit('gesture.tap', {
      touch: {
        target: touch.target,
        clientX: touch.currentX,
        clientY: touch.currentY,
        type: 'tap',
      },
      _gesture: 'tap',
    });
  }

  /**
   * Emit double tap gesture detection → gesture.doubletap
   */
  emitDoubleTap(touch) {
    console.log(
      'GestureRecognizer: emitDoubleTap called for target:',
      touch.target?.tagName || touch.target?.className,
    );
    this.eventBus.emit('gesture.doubletap', {
      touch: {
        target: touch.target,
        clientX: touch.currentX,
        clientY: touch.currentY,
        type: 'doubletap',
      },
      _gesture: 'doubletap',
    });
  }

  /**
   * Emit long press gesture detection → gesture.longpress
   */
  emitLongPress(touch) {
    this.eventBus.emit('gesture.longpress', {
      touch: {
        target: touch.target,
        clientX: touch.currentX,
        clientY: touch.currentY,
        type: 'longpress',
      },
      _gesture: 'longpress',
    });
  }

  /**
   * Emit drag start gesture detection → gesture.dragstart
   */
  emitDragStart(touch) {
    this.eventBus.emit('gesture.dragstart', {
      touch: {
        target: touch.target,
        clientX: touch.currentX,
        clientY: touch.currentY,
        startX: touch.startX,
        startY: touch.startY,
        type: 'dragstart',
      },
      _gesture: 'drag',
    });
  }

  /**
   * Emit drag move gesture detection → gesture.dragmove
   */
  emitDragMove(touch) {
    this.eventBus.emit('gesture.dragmove', {
      touch: {
        target: touch.target,
        clientX: touch.currentX,
        clientY: touch.currentY,
        deltaX: touch.currentX - touch.lastX,
        deltaY: touch.currentY - touch.lastY,
        type: 'dragmove',
      },
      _gesture: 'drag',
    });
  }

  /**
   * Emit drag end gesture detection → gesture.dragend
   */
  emitDragEnd(touch) {
    this.eventBus.emit('gesture.dragend', {
      touch: {
        target: touch.target,
        clientX: touch.currentX,
        clientY: touch.currentY,
        endX: touch.currentX,
        endY: touch.currentY,
        type: 'dragend',
      },
      _gesture: 'drag',
    });
  }

  /**
   * Emit pinch start event → zoom.start
   */
  emitPinchStart() {
    const center = this.touchState.getCenterPoint();
    this.eventBus.emit('zoom.start', {
      centerX: center.x,
      centerY: center.y,
      _gesture: 'pinch',
    });
  }

  /**
   * Emit pinch move event → zoom.change
   */
  emitPinchMove() {
    const currentDistance = this.touchState.getTouchDistance();
    const scale = currentDistance / this.initialPinchDistance;
    const center = this.touchState.getCenterPoint();

    this.eventBus.emit('zoom.change', {
      direction: scale > 1 ? 'in' : 'out',
      scale: scale,
      centerX: center.x,
      centerY: center.y,
      _gesture: 'pinch',
    });
  }

  /**
   * Emit pinch end event → zoom.end
   */
  emitPinchEnd() {
    const center = this.touchState.getCenterPoint();
    this.eventBus.emit('zoom.end', {
      centerX: center.x,
      centerY: center.y,
      _gesture: 'pinch',
    });
  }
}
