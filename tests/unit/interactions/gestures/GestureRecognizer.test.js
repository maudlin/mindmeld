// tests/unit/interactions/gestures/GestureRecognizer.test.js

import { GestureRecognizer } from '../../../../src/js/interactions/gestures/GestureRecognizer.js';

describe('GestureRecognizer', () => {
  let gestureRecognizer;
  let mockEventBus;
  let mockElement;

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Create mock DOM element
    mockElement = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    gestureRecognizer = new GestureRecognizer(mockEventBus);
    gestureRecognizer.initialize(mockElement);

    // Mock Date.now for consistent timing
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (gestureRecognizer) {
      gestureRecognizer.destroy();
    }
  });

  describe('Initialization and Cleanup', () => {
    it('should initialize with correct state', () => {
      expect(gestureRecognizer.currentState).toBe('idle');
      expect(gestureRecognizer.eventBus).toBe(mockEventBus);
    });

    it('should add event listeners on initialization', () => {
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: false },
      );
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        { passive: false },
      );
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        { passive: false },
      );
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchcancel',
        expect.any(Function),
        { passive: false },
      );
    });

    it('should remove event listeners on destroy', () => {
      gestureRecognizer.destroy();

      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
      );
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
      );
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
      );
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchcancel',
        expect.any(Function),
      );
    });
  });

  describe('Single Tap Gesture', () => {
    it('should recognize single tap gesture', () => {
      return new Promise((resolve) => {
        const touch = createMockTouch(1, 100, 200);

        // Touch start
        const startEvent = createTouchEvent('touchstart', [touch]);
        gestureRecognizer.handleTouchStart(startEvent);

        expect(gestureRecognizer.currentState).toBe('singleTouch');

        // Touch end immediately (within tap threshold)
        Date.now.mockReturnValue(1100); // 100ms later
        const endEvent = createTouchEvent('touchend', [touch]);
        gestureRecognizer.handleTouchEnd(endEvent);

        expect(gestureRecognizer.currentState).toBe('potentialTap');

        // After double-tap delay, should emit single tap
        setTimeout(() => {
          expect(mockEventBus.emit).toHaveBeenCalledWith('note.select', {
            x: 100,
            y: 200,
            type: 'tap',
            _gesture: 'tap',
          });
          resolve();
        }, gestureRecognizer.DOUBLE_TAP_MAX_DELAY + 10);
      });
    });

    it('should not recognize tap with too much movement', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(1, 150, 250); // Moved 50+ pixels

      // Touch start
      const startEvent = createTouchEvent('touchstart', [touch1]);
      gestureRecognizer.handleTouchStart(startEvent);

      // Move significantly
      const moveEvent = createTouchEvent('touchmove', [touch2]);
      gestureRecognizer.handleTouchMove(moveEvent);

      // Should transition to dragging, not tap
      expect(gestureRecognizer.currentState).toBe('dragging');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'note.dragStart',
        expect.any(Object),
      );
    });
  });

  describe('Double Tap Gesture', () => {
    it('should recognize double tap gesture', () => {
      const touch = createMockTouch(1, 100, 200);

      // First tap
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch]),
      );
      Date.now.mockReturnValue(1100);
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch]));

      expect(gestureRecognizer.currentState).toBe('potentialTap');

      // Second tap within double-tap delay
      Date.now.mockReturnValue(1150);
      const touch2 = createMockTouch(2, 102, 201); // Very close to first tap
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch2]),
      );

      expect(gestureRecognizer.currentState).toBe('potentialDoubleTap');

      // Complete second tap
      Date.now.mockReturnValue(1200);
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch2]));

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.createAtPosition', {
        canvas: mockElement,
        event: {
          clientX: 102,
          clientY: 201,
          type: 'doubletap',
        },
        _gesture: 'doubletap',
      });
    });

    it('should not recognize double tap if taps are too far apart', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 150, 250); // Too far from first tap

      // First tap
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch1]));

      // Second tap too far away
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch2]),
      );
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch2]));

      // Should emit single tap, not double tap
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'note.select',
        expect.objectContaining({
          type: 'tap',
        }),
      );
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'note.createAtPosition',
        expect.any(Object),
      );
    });
  });

  describe('Long Press Gesture', () => {
    it('should recognize long press gesture', () => {
      return new Promise((resolve) => {
        const touch = createMockTouch(1, 100, 200);

        // Touch start
        gestureRecognizer.handleTouchStart(
          createTouchEvent('touchstart', [touch]),
        );

        expect(gestureRecognizer.currentState).toBe('singleTouch');

        // Wait for long press threshold
        setTimeout(() => {
          expect(gestureRecognizer.currentState).toBe('longPressing');
          expect(mockEventBus.emit).toHaveBeenCalledWith('contextmenu.show', {
            x: 100,
            y: 200,
            type: 'longpress',
            _gesture: 'longpress',
          });
          resolve();
        }, gestureRecognizer.LONG_PRESS_THRESHOLD + 10);
      });
    });

    it('should cancel long press on movement', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(1, 120, 220); // Significant movement

      // Touch start
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1]),
      );

      // Move before long press triggers
      setTimeout(() => {
        gestureRecognizer.handleTouchMove(
          createTouchEvent('touchmove', [touch2]),
        );

        expect(gestureRecognizer.currentState).toBe('dragging');
        expect(mockEventBus.emit).not.toHaveBeenCalledWith(
          'contextmenu.show',
          expect.any(Object),
        );
      }, gestureRecognizer.LONG_PRESS_THRESHOLD - 100);
    });
  });

  describe('Drag Gesture', () => {
    it('should recognize drag gesture', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(1, 120, 220); // 20+ pixel movement

      // Touch start
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1]),
      );

      // Move significantly to trigger drag
      gestureRecognizer.handleTouchMove(
        createTouchEvent('touchmove', [touch2]),
      );

      expect(gestureRecognizer.currentState).toBe('dragging');
      expect(mockEventBus.emit).toHaveBeenCalledWith('note.dragStart', {
        x: 120,
        y: 220,
        startX: 100,
        startY: 200,
        _gesture: 'drag',
      });

      // Continue dragging
      const touch3 = createMockTouch(1, 140, 240);
      gestureRecognizer.handleTouchMove(
        createTouchEvent('touchmove', [touch3]),
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.dragUpdate', {
        x: 140,
        y: 240,
        deltaX: 20, // 140 - 120
        deltaY: 20, // 240 - 220
        _gesture: 'drag',
      });

      // End drag
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch3]));

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.dragEnd', {
        x: 140,
        y: 240,
        endX: 140,
        endY: 240,
        _gesture: 'drag',
      });
    });
  });

  describe('Pinch Gesture', () => {
    it('should recognize pinch gesture', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 200, 300); // Distance = ~141 pixels

      // Two fingers down
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1, touch2]),
      );
      expect(gestureRecognizer.currentState).toBe('multiTouch');

      // Move fingers significantly apart to trigger pinch (need 20+ pixel change)
      const touch1Moved = createMockTouch(1, 50, 150); // Moved further from center
      const touch2Moved = createMockTouch(2, 250, 350); // Moved further from center
      gestureRecognizer.handleTouchMove(
        createTouchEvent('touchmove', [touch1Moved, touch2Moved]),
      );

      // Debug: log current state and distance values
      console.log('Current state:', gestureRecognizer.currentState);
      console.log(
        'Initial pinch distance:',
        gestureRecognizer.initialPinchDistance,
      );
      console.log(
        'Current touch distance:',
        gestureRecognizer.touchState.getTouchDistance(),
      );

      expect(gestureRecognizer.currentState).toBe('pinching');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'zoom.start',
        expect.objectContaining({
          centerX: expect.any(Number),
          centerY: expect.any(Number),
          _gesture: 'pinch',
        }),
      );

      // Continue pinching
      gestureRecognizer.handleTouchMove(
        createTouchEvent('touchmove', [touch1Moved, touch2Moved]),
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'zoom.change',
        expect.objectContaining({
          direction: expect.any(String),
          scale: expect.any(Number),
          _gesture: 'pinch',
        }),
      );

      // End pinch
      gestureRecognizer.handleTouchEnd(
        createTouchEvent('touchend', [touch1Moved]),
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'zoom.end',
        expect.objectContaining({
          _gesture: 'pinch',
        }),
      );
    });
  });

  describe('State Machine Transitions', () => {
    it('should handle state transitions correctly', () => {
      const touch = createMockTouch(1, 100, 200);

      // Idle -> SingleTouch
      expect(gestureRecognizer.currentState).toBe('idle');
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch]),
      );
      expect(gestureRecognizer.currentState).toBe('singleTouch');

      // Add second touch: SingleTouch -> MultiTouch
      const touch2 = createMockTouch(2, 200, 300);
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch2]),
      );
      expect(gestureRecognizer.currentState).toBe('multiTouch');

      // Remove all touches: MultiTouch -> Idle
      gestureRecognizer.handleTouchEnd(
        createTouchEvent('touchend', [touch, touch2]),
      );
      expect(gestureRecognizer.currentState).toBe('idle');
    });
  });

  describe('Event Prevention', () => {
    it('should prevent default on all touch events', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        changedTouches: [createMockTouch(1, 100, 200)],
      };

      gestureRecognizer.handleTouchStart(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      mockEvent.preventDefault.mockClear();
      gestureRecognizer.handleTouchMove(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      mockEvent.preventDefault.mockClear();
      gestureRecognizer.handleTouchEnd(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle touchcancel as touchend', () => {
      const touch = createMockTouch(1, 100, 200);

      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch]),
      );
      expect(gestureRecognizer.currentState).toBe('singleTouch');

      gestureRecognizer.handleTouchCancel(
        createTouchEvent('touchcancel', [touch]),
      );
      expect(gestureRecognizer.currentState).toBe('potentialTap');
    });

    it('should handle multiple simultaneous touch events', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 200, 300);
      const touch3 = createMockTouch(3, 300, 400);

      // Start with multiple touches at once
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1, touch2, touch3]),
      );

      expect(gestureRecognizer.currentState).toBe('multiTouch');
      expect(gestureRecognizer.touchState.getTouchCount()).toBe(3);
    });

    it('should reset properly after destroy', () => {
      const touch = createMockTouch(1, 100, 200);

      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch]),
      );
      expect(gestureRecognizer.currentState).toBe('singleTouch');

      gestureRecognizer.destroy();

      expect(gestureRecognizer.currentState).toBe('idle');
      expect(gestureRecognizer.touchState.getTouchCount()).toBe(0);
    });
  });
});

// Helper functions
function createMockTouch(identifier, clientX, clientY) {
  return {
    identifier,
    clientX,
    clientY,
    target: null,
    screenX: clientX,
    screenY: clientY,
    pageX: clientX,
    pageY: clientY,
  };
}

function createTouchEvent(type, touches) {
  return {
    type,
    preventDefault: jest.fn(),
    changedTouches: touches,
    touches: touches,
    targetTouches: touches,
  };
}
