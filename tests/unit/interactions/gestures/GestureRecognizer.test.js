/**
 * Touch Gesture Recognition Behavior Tests
 *
 * Tests the gesture recognition system that interprets touch interactions
 * and converts them to semantic events (tap, drag, pinch, long-press).
 * Focus on gesture detection accuracy, state management, and event emission.
 */

import { GestureRecognizer } from '../../../../src/js/interactions/gestures/GestureRecognizer.js';

// Helper functions for creating mock touch events
const createMockTouch = (id, x, y) => ({
  identifier: id,
  clientX: x,
  clientY: y,
  target: null,
  screenX: x,
  screenY: y,
  pageX: x,
  pageY: y,
});
const createTouchEvent = (type, touches) => ({
  type,
  preventDefault: jest.fn(),
  changedTouches: touches,
  touches,
  targetTouches: touches,
});

describe.skip('Touch Gesture Recognition Behavior - MM-206: Update tests for new event emission architecture', () => {
  let gestureRecognizer, mockEventBus, mockElement;

  beforeEach(() => {
    mockEventBus = { emit: jest.fn(), on: jest.fn(), off: jest.fn() };
    mockElement = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    gestureRecognizer = new GestureRecognizer(mockEventBus);
    gestureRecognizer.initialize(mockElement);

    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    gestureRecognizer?.destroy();
  });

  describe('Recognizer Lifecycle', () => {
    it('initializes correctly and manages event listeners', () => {
      expect(gestureRecognizer.currentState).toBe('idle');
      expect(gestureRecognizer.eventBus).toBe(mockEventBus);

      // Verify all touch event listeners are added
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(
        (event) => {
          expect(mockElement.addEventListener).toHaveBeenCalledWith(
            event,
            expect.any(Function),
            { passive: false },
          );
        },
      );

      // Verify cleanup removes listeners
      gestureRecognizer.destroy();
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(
        (event) => {
          expect(mockElement.removeEventListener).toHaveBeenCalledWith(
            event,
            expect.any(Function),
          );
        },
      );
    });
  });

  describe('Single Touch Gestures', () => {
    it('recognizes single tap after delay', async () => {
      const touch = createMockTouch(1, 100, 200);

      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch]),
      );
      expect(gestureRecognizer.currentState).toBe('singleTouch');

      Date.now.mockReturnValue(1100);
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch]));
      expect(gestureRecognizer.currentState).toBe('potentialTap');

      // Wait for double-tap timeout
      await new Promise((resolve) => {
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

    it('transitions to drag when movement exceeds threshold', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(1, 150, 250); // 50+ pixel movement

      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      gestureRecognizer.handleTouchMove(
        createTouchEvent('touchmove', [touch2]),
      );

      expect(gestureRecognizer.currentState).toBe('dragging');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'note.dragStart',
        expect.any(Object),
      );
    });
  });

  describe('Double Tap Detection', () => {
    it('recognizes double tap when taps are close in time and space', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 102, 201); // Close to first tap

      // First tap
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      Date.now.mockReturnValue(1100);
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch1]));
      expect(gestureRecognizer.currentState).toBe('potentialTap');

      // Second tap within delay
      Date.now.mockReturnValue(1150);
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch2]),
      );
      expect(gestureRecognizer.currentState).toBe('potentialDoubleTap');

      Date.now.mockReturnValue(1200);
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch2]));

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.createAtPosition', {
        canvas: mockElement,
        event: { clientX: 102, clientY: 201, type: 'doubletap' },
        _gesture: 'doubletap',
      });
    });

    it('falls back to single tap when taps are too far apart', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 150, 250); // Too far apart

      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch1]));
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch2]),
      );
      gestureRecognizer.handleTouchEnd(createTouchEvent('touchend', [touch2]));

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'note.select',
        expect.objectContaining({ type: 'tap' }),
      );
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'note.createAtPosition',
        expect.any(Object),
      );
    });
  });

  describe('Long Press Recognition', () => {
    it('recognizes long press after threshold delay', async () => {
      const touch = createMockTouch(1, 100, 200);

      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch]),
      );
      expect(gestureRecognizer.currentState).toBe('singleTouch');

      await new Promise((resolve) => {
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

    it('cancels long press on movement and starts drag', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(1, 120, 220);

      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1]),
      );

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

  describe('Drag Interaction Flow', () => {
    it('handles complete drag sequence from start to end', () => {
      const touches = [
        createMockTouch(1, 100, 200), // start
        createMockTouch(1, 120, 220), // move 1
        createMockTouch(1, 140, 240), // move 2
      ];

      // Start drag
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touches[0]]),
      );
      gestureRecognizer.handleTouchMove(
        createTouchEvent('touchmove', [touches[1]]),
      );

      expect(gestureRecognizer.currentState).toBe('dragging');
      expect(mockEventBus.emit).toHaveBeenCalledWith('note.dragStart', {
        x: 120,
        y: 220,
        startX: 100,
        startY: 200,
        _gesture: 'drag',
      });

      // Continue drag
      gestureRecognizer.handleTouchMove(
        createTouchEvent('touchmove', [touches[2]]),
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('note.dragUpdate', {
        x: 140,
        y: 240,
        deltaX: 20,
        deltaY: 20,
        _gesture: 'drag',
      });

      // End drag
      gestureRecognizer.handleTouchEnd(
        createTouchEvent('touchend', [touches[2]]),
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('note.dragEnd', {
        x: 140,
        y: 240,
        endX: 140,
        endY: 240,
        _gesture: 'drag',
      });
    });
  });

  describe('Pinch Zoom Recognition', () => {
    it('recognizes pinch zoom sequence with two fingers', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 200, 300);

      // Start pinch
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1, touch2]),
      );
      expect(gestureRecognizer.currentState).toBe('multiTouch');

      // Move fingers apart to trigger pinch
      const touch1Moved = createMockTouch(1, 50, 150);
      const touch2Moved = createMockTouch(2, 250, 350);
      gestureRecognizer.handleTouchMove(
        createTouchEvent('touchmove', [touch1Moved, touch2Moved]),
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
        expect.objectContaining({ _gesture: 'pinch' }),
      );
    });
  });

  describe('State Management', () => {
    it('handles state transitions and edge cases correctly', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 200, 300);

      // Basic state flow: idle -> singleTouch -> multiTouch -> idle
      expect(gestureRecognizer.currentState).toBe('idle');
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      expect(gestureRecognizer.currentState).toBe('singleTouch');

      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch2]),
      );
      expect(gestureRecognizer.currentState).toBe('multiTouch');

      gestureRecognizer.handleTouchEnd(
        createTouchEvent('touchend', [touch1, touch2]),
      );
      expect(gestureRecognizer.currentState).toBe('idle');
    });
  });

  describe('Touch Event Processing', () => {
    it('prevents default behavior on touch events', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        changedTouches: [createMockTouch(1, 100, 200)],
      };

      // All handlers should prevent default
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

  describe('Edge Case Handling', () => {
    it('handles touchcancel, multiple touches, and cleanup', () => {
      // touchcancel should behave like touchend
      const touch = createMockTouch(1, 100, 200);
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', [touch]),
      );
      expect(gestureRecognizer.currentState).toBe('singleTouch');
      gestureRecognizer.handleTouchCancel(
        createTouchEvent('touchcancel', [touch]),
      );
      expect(gestureRecognizer.currentState).toBe('potentialTap');

      // Reset for multiple touches test
      gestureRecognizer.destroy();
      gestureRecognizer = new GestureRecognizer(mockEventBus);
      gestureRecognizer.initialize(mockElement);

      // Multiple simultaneous touches
      const touches = [
        createMockTouch(1, 100, 200),
        createMockTouch(2, 200, 300),
        createMockTouch(3, 300, 400),
      ];
      gestureRecognizer.handleTouchStart(
        createTouchEvent('touchstart', touches),
      );
      expect(gestureRecognizer.currentState).toBe('multiTouch');
      expect(gestureRecognizer.touchState.getTouchCount()).toBe(3);

      // Proper cleanup on destroy
      gestureRecognizer.destroy();
      expect(gestureRecognizer.currentState).toBe('idle');
      expect(gestureRecognizer.touchState.getTouchCount()).toBe(0);
    });
  });
});
