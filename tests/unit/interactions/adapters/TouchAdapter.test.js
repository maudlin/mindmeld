/**
 * TouchAdapter Unit Tests
 *
 * Tests the native touch gesture detection system that replaces GestureRecognizer.
 * Focus on gesture detection accuracy, timing, and clean behavior delegation.
 */

// Helper functions for creating mock touch events
const createMockTouch = (id, x, y, target = null) => ({
  identifier: id,
  clientX: x,
  clientY: y,
  target: target,
  screenX: x,
  screenY: y,
  pageX: x,
  pageY: y,
});

const createTouchEvent = (type, touches) => ({
  type,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  changedTouches: touches,
  touches,
  targetTouches: touches,
});

const createMockNoteElement = (id = 'test-note') => ({
  id,
  tagName: 'DIV',
  classList: {
    contains: jest.fn(() => false),
    add: jest.fn(),
    remove: jest.fn(),
  },
  closest: jest.fn((selector) => {
    if (selector === '.note') return this;
    return null;
  }),
  getBoundingClientRect: jest.fn(() => ({
    left: 100,
    top: 100,
    width: 200,
    height: 100,
  })),
});

describe('TouchAdapter - Native Gesture Detection', () => {
  let TouchAdapter;
  let touchAdapter;
  let mockEventBus;
  let mockCanvas;
  let mockInteractionController;
  let mockBehaviors;

  beforeEach(async () => {
    // Reset modules and timers
    jest.resetModules();
    jest.useFakeTimers();

    // Create mock canvas (following DesktopAdapter pattern)
    mockCanvas = {
      id: 'canvas',
      tagName: 'CANVAS',
      classList: {
        contains: jest.fn(() => false),
      },
      closest: jest.fn((selector) => {
        if (selector === '#canvas') return mockCanvas;
        return null;
      }),
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 800,
      })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
    };

    // Mock behaviors
    mockBehaviors = {
      noteBehavior: {
        handleNoteDoubleClick: jest.fn(),
        handleNoteSelection: jest.fn(),
      },
      canvasBehavior: {
        handleCanvasDoubleClick: jest.fn(),
      },
      dragBehavior: {
        startDrag: jest.fn(),
        updateDrag: jest.fn(),
        endDrag: jest.fn(),
        isDragging: false,
      },
      selectionBoxBehavior: {
        startSelectionBox: jest.fn(),
        updateSelectionBox: jest.fn(),
        endSelectionBox: jest.fn(),
        isDrawingSelectionBox: false,
      },
    };

    // Mock interaction controller
    mockInteractionController = {
      getBehavior: jest.fn((name) => mockBehaviors[`${name}Behavior`]),
    };

    // Mock document.getElementById (following DesktopAdapter pattern)
    const originalGetElementById = global.document?.getElementById;
    global.document = global.document || {};
    global.document.getElementById = jest.fn((id) => {
      if (id === 'canvas') return mockCanvas;
      return null;
    });
    global.document.addEventListener = jest.fn();
    global.document.removeEventListener = jest.fn();

    // TouchAdapter needs document.createElement and document.head.appendChild for styles
    global.document.createElement = jest.fn((tagName) => ({
      tagName: tagName.toUpperCase(),
      id: 'test-element',
      style: {},
      textContent: '',
      remove: jest.fn(),
      setAttribute: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(() => false),
      },
    }));

    // Mock document.head for style injection (read-only property needs Object.defineProperty)
    Object.defineProperty(global.document, 'head', {
      value: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
      configurable: true,
      writable: true,
    });

    // Mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Mock Date.now for consistent timing tests
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    // Import TouchAdapter after setting up mocks (following DesktopAdapter pattern)
    const module = await import(
      '../../../../src/js/interactions/adapters/TouchAdapter.js'
    );
    TouchAdapter = module.TouchAdapter;

    // Create TouchAdapter instance (don't initialize in beforeEach)
    touchAdapter = new TouchAdapter(mockInteractionController);

    // Store original for cleanup
    global.originalGetElementById = originalGetElementById;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();

    // Restore document.getElementById if it existed
    if (global.originalGetElementById) {
      global.document.getElementById = global.originalGetElementById;
    }
  });

  describe('Constructor', () => {
    test('should initialize with touch adapter name', () => {
      expect(touchAdapter.name).toBe('touch');
      expect(touchAdapter.isInitialized).toBe(false);
    });

    test('should have native gesture detection thresholds', () => {
      expect(touchAdapter.dragThreshold).toBe(15);
      expect(touchAdapter.longPressThreshold).toBe(500);
    });
  });

  describe('Initialization', () => {
    test('should initialize with native touch handlers', async () => {
      await touchAdapter.initialize(mockEventBus);

      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: false },
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        { passive: false },
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        { passive: false },
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'touchcancel',
        expect.any(Function),
        { passive: false },
      );
    });

    test('should get behavior references from interaction controller', async () => {
      await touchAdapter.initialize(mockEventBus);

      expect(mockInteractionController.getBehavior).toHaveBeenCalledWith(
        'note',
      );
      expect(mockInteractionController.getBehavior).toHaveBeenCalledWith(
        'drag',
      );
      expect(mockInteractionController.getBehavior).toHaveBeenCalledWith(
        'canvas',
      );
      expect(mockInteractionController.getBehavior).toHaveBeenCalledWith(
        'selectionBox',
      );
    });
  });

  describe('Native Double-tap Detection', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should detect double-tap when taps are close in time and space', () => {
      const mockNote = createMockNoteElement();
      mockNote.closest = jest.fn((selector) => {
        if (selector === '.note') return mockNote;
        return null;
      });

      const touch1 = createMockTouch(1, 150, 150, mockNote);
      const touch2 = createMockTouch(2, 152, 148, mockNote); // Close in space

      // First tap
      Date.now.mockReturnValue(1000);
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      touchAdapter.boundHandlers.touchEnd(
        createTouchEvent('touchend', [touch1]),
      );

      // Second tap within 300ms
      Date.now.mockReturnValue(1250); // 250ms later
      const touchStartEvent2 = createTouchEvent('touchstart', [touch2]);
      touchAdapter.boundHandlers.touchStart(touchStartEvent2);

      // Should detect double-tap and delegate to NoteBehavior
      expect(
        mockBehaviors.noteBehavior.handleNoteDoubleClick,
      ).toHaveBeenCalledWith(mockNote, touch2, 'touch');
      expect(touchStartEvent2.preventDefault).toHaveBeenCalled();
    });

    test('should detect double-tap on canvas and delegate to CanvasBehavior', () => {
      const touch1 = createMockTouch(1, 150, 150, mockCanvas);
      const touch2 = createMockTouch(2, 152, 148, mockCanvas);

      // First tap
      Date.now.mockReturnValue(1000);
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      touchAdapter.boundHandlers.touchEnd(
        createTouchEvent('touchend', [touch1]),
      );

      // Second tap within timing
      Date.now.mockReturnValue(1200);
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch2]),
      );

      expect(
        mockBehaviors.canvasBehavior.handleCanvasDoubleClick,
      ).toHaveBeenCalledWith(touch2, 'touch');
    });

    test('should fallback when taps are too far apart in distance', () => {
      const touch1 = createMockTouch(1, 150, 150, mockCanvas);
      const touch2 = createMockTouch(2, 200, 200, mockCanvas); // 70px away > 30px threshold

      Date.now.mockReturnValue(1000);
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      touchAdapter.boundHandlers.touchEnd(
        createTouchEvent('touchend', [touch1]),
      );

      Date.now.mockReturnValue(1200);
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch2]),
      );

      // Should not detect double-tap
      expect(
        mockBehaviors.canvasBehavior.handleCanvasDoubleClick,
      ).not.toHaveBeenCalled();
    });

    test('should fallback when taps are too far apart in time', () => {
      const touch1 = createMockTouch(1, 150, 150, mockCanvas);
      const touch2 = createMockTouch(2, 152, 148, mockCanvas);

      Date.now.mockReturnValue(1000);
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      touchAdapter.boundHandlers.touchEnd(
        createTouchEvent('touchend', [touch1]),
      );

      Date.now.mockReturnValue(1400); // 400ms later > 300ms threshold
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch2]),
      );

      expect(
        mockBehaviors.canvasBehavior.handleCanvasDoubleClick,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Native Long Press Detection', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should start long press timer on touch start', () => {
      const touch = createMockTouch(1, 150, 150, mockCanvas);

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch]),
      );

      expect(touchAdapter.longPressTimer).not.toBeNull();
    });

    test('should cancel long press timer on movement beyond threshold', () => {
      const touch = createMockTouch(1, 150, 150, mockCanvas);

      // Start touch
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch]),
      );
      expect(touchAdapter.longPressTimer).not.toBeNull();

      // Move beyond 15px threshold
      const movedTouch = createMockTouch(1, 170, 170, mockCanvas);
      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [movedTouch]),
      );

      // Long press timer should be cleared
      expect(touchAdapter.longPressTimer).toBeNull();
    });
  });

  describe('Native Drag Detection', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should detect drag when movement exceeds threshold', () => {
      const mockNote = createMockNoteElement();
      mockNote.closest = jest.fn((selector) => {
        if (selector === '.note') return mockNote;
        return null;
      });

      const startTouch = createMockTouch(1, 150, 150, mockNote);

      // Start touch
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [startTouch]),
      );

      // Move beyond 15px threshold
      const movedTouch = createMockTouch(1, 170, 170, mockNote);
      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [movedTouch]),
      );

      // Should start drag and delegate to DragBehavior
      expect(mockBehaviors.dragBehavior.startDrag).toHaveBeenCalledWith(
        mockNote,
        startTouch,
        'touch',
      );
      expect(touchAdapter.currentGesture).toBe('drag');
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should prevent double-tap processing during double-tap', () => {
      const touch = createMockTouch(1, 150, 150, mockCanvas);

      // Simulate double-tap in progress
      touchAdapter.isDoubleTapInProgress = true;

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch]),
      );

      // Should return early and not process anything
      expect(touchAdapter.longPressTimer).toBeNull();
    });

    test('should clean up timers on touch cancel', () => {
      const touch = createMockTouch(1, 150, 150, mockCanvas);

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch]),
      );
      expect(touchAdapter.longPressTimer).not.toBeNull();

      touchAdapter.boundHandlers.touchCancel(
        createTouchEvent('touchcancel', [touch]),
      );

      expect(touchAdapter.longPressTimer).toBeNull();
      expect(touchAdapter.currentGesture).toBeNull();
    });

    test('should reset gesture state on touch end', () => {
      // Setup some state
      touchAdapter.currentGesture = 'drag';

      const touch = createMockTouch(1, 150, 150, mockCanvas);
      touchAdapter.boundHandlers.touchEnd(
        createTouchEvent('touchend', [touch]),
      );

      expect(touchAdapter.currentGesture).toBeNull();
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should remove event listeners on destroy', async () => {
      await touchAdapter.destroyEventListeners();

      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
      );
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
      );
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
      );
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        'touchcancel',
        expect.any(Function),
      );
    });

    test('should clear timers on destroy', async () => {
      // Setup timer
      const touch = createMockTouch(1, 150, 150, mockCanvas);
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch]),
      );

      await touchAdapter.destroyEventListeners();

      expect(touchAdapter.longPressTimer).toBeNull();
      expect(touchAdapter.lastTap).toBeNull();
    });
  });

  // MM-212: Multi-touch Gesture Detection Tests (RED Phase)
  describe('Multi-touch Pinch Gesture Detection', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should detect pinch-out (zoom in) when fingers move apart by >10%', () => {
      const touch1Start = createMockTouch(1, 400, 300, mockCanvas);
      const touch2Start = createMockTouch(2, 500, 300, mockCanvas);
      const touch1End = createMockTouch(1, 380, 300, mockCanvas);
      const touch2End = createMockTouch(2, 520, 300, mockCanvas);

      // Start two-finger touch
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1Start, touch2Start]),
      );

      // Move fingers apart (100px → 140px = 40% increase > 10%)
      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [touch1End, touch2End]),
      );

      // Should emit zoom event with scale factor > 1
      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas.zoom', {
        scale: expect.any(Number),
        centerX: expect.any(Number),
        centerY: expect.any(Number),
      });

      const zoomCall = mockEventBus.emit.mock.calls.find(
        (call) => call[0] === 'canvas.zoom',
      );
      expect(zoomCall[1].scale).toBeGreaterThan(1);
    });

    test('should detect pinch-in (zoom out) when fingers move together by >10%', () => {
      const touch1Start = createMockTouch(1, 350, 300, mockCanvas);
      const touch2Start = createMockTouch(2, 550, 300, mockCanvas);
      const touch1End = createMockTouch(1, 420, 300, mockCanvas);
      const touch2End = createMockTouch(2, 480, 300, mockCanvas);

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1Start, touch2Start]),
      );

      // Move fingers together (200px → 60px = 70% decrease > 10%)
      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [touch1End, touch2End]),
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas.zoom', {
        scale: expect.any(Number),
        centerX: expect.any(Number),
        centerY: expect.any(Number),
      });

      const zoomCall = mockEventBus.emit.mock.calls.find(
        (call) => call[0] === 'canvas.zoom',
      );
      expect(zoomCall[1].scale).toBeLessThan(1);
    });

    test('should calculate accurate center point between two fingers', () => {
      const touch1 = createMockTouch(1, 300, 200, mockCanvas);
      const touch2 = createMockTouch(2, 500, 400, mockCanvas);

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1, touch2]),
      );

      // Move fingers to trigger pinch detection
      const touch1Moved = createMockTouch(1, 280, 200, mockCanvas);
      const touch2Moved = createMockTouch(2, 520, 400, mockCanvas);

      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [touch1Moved, touch2Moved]),
      );

      // Should emit zoom event with correct center point
      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas.zoom', {
        scale: expect.any(Number),
        centerX: 400, // (300+500)/2 = 400
        centerY: 300, // (200+400)/2 = 300
      });
    });

    test('should ignore pinch gestures with <10% distance change', () => {
      const touch1Start = createMockTouch(1, 400, 300, mockCanvas);
      const touch2Start = createMockTouch(2, 500, 300, mockCanvas);
      const touch1End = createMockTouch(1, 395, 300, mockCanvas);
      const touch2End = createMockTouch(2, 505, 300, mockCanvas);

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1Start, touch2Start]),
      );

      // Small movement (100px → 110px = 10% change, should be ignored)
      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [touch1End, touch2End]),
      );

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'canvas.zoom',
        expect.anything(),
      );
    });
  });

  describe('Two-finger Pan Detection', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should detect two-finger pan when fingers move in parallel', () => {
      const touch1Start = createMockTouch(1, 300, 200, mockCanvas);
      const touch2Start = createMockTouch(2, 500, 400, mockCanvas);
      const touch1End = createMockTouch(1, 350, 250, mockCanvas);
      const touch2End = createMockTouch(2, 550, 450, mockCanvas);

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1Start, touch2Start]),
      );

      // Move both fingers by same delta (50, 50)
      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [touch1End, touch2End]),
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas.pan', {
        deltaX: 50,
        deltaY: 50,
      });
    });

    test('should calculate pan delta from average finger movement', () => {
      const touch1Start = createMockTouch(1, 300, 200, mockCanvas);
      const touch2Start = createMockTouch(2, 500, 400, mockCanvas);
      const touch1End = createMockTouch(1, 330, 240, mockCanvas); // +30, +40
      const touch2End = createMockTouch(2, 570, 460, mockCanvas); // +70, +60

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1Start, touch2Start]),
      );

      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [touch1End, touch2End]),
      );

      // Average delta: (30+70)/2 = 50, (40+60)/2 = 50
      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas.pan', {
        deltaX: 50,
        deltaY: 50,
      });
    });

    test('should distinguish pan from pinch (parallel vs convergent movement)', () => {
      // Test parallel movement (should be pan)
      const touch1Start = createMockTouch(1, 300, 300, mockCanvas);
      const touch2Start = createMockTouch(2, 500, 300, mockCanvas);
      const touch1Parallel = createMockTouch(1, 350, 350, mockCanvas);
      const touch2Parallel = createMockTouch(2, 550, 350, mockCanvas);

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1Start, touch2Start]),
      );

      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [touch1Parallel, touch2Parallel]),
      );

      // Should detect pan, not pinch (distance unchanged: 200px → 200px)
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'canvas.pan',
        expect.anything(),
      );
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'canvas.zoom',
        expect.anything(),
      );
    });
  });

  describe('Multi-touch State Management', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should track two-finger gesture state separately from single-finger', () => {
      const touch1 = createMockTouch(1, 300, 300, mockCanvas);
      const touch2 = createMockTouch(2, 500, 300, mockCanvas);

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1, touch2]),
      );

      // Should not interfere with single-finger gesture state
      expect(touchAdapter.currentGesture).toBeNull(); // Single-finger state unchanged
      expect(touchAdapter.multiTouchState).toBeDefined();
      expect(touchAdapter.multiTouchState.fingers.size).toBe(2);
    });

    test('should clean up multi-touch state on finger lift', () => {
      const touch1 = createMockTouch(1, 300, 300, mockCanvas);
      const touch2 = createMockTouch(2, 500, 300, mockCanvas);

      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1, touch2]),
      );

      // Lift one finger
      touchAdapter.boundHandlers.touchEnd(
        createTouchEvent('touchend', [touch1]),
      );

      expect(touchAdapter.multiTouchState.fingers.size).toBe(1);

      // Lift remaining finger
      touchAdapter.boundHandlers.touchEnd(
        createTouchEvent('touchend', [touch2]),
      );

      expect(touchAdapter.multiTouchState.fingers.size).toBe(0);
    });

    test('should prevent single-finger gestures during multi-touch', () => {
      const touch1 = createMockTouch(1, 300, 300, mockCanvas);
      const touch2 = createMockTouch(2, 500, 300, mockCanvas);

      // Start multi-touch
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1, touch2]),
      );

      // Try to trigger single-finger drag
      const touch1Moved = createMockTouch(1, 350, 350, mockCanvas);
      touchAdapter.boundHandlers.touchMove(
        createTouchEvent('touchmove', [touch1Moved, touch2]),
      );

      // Should not start single-finger drag behavior
      expect(mockBehaviors.dragBehavior.startDrag).not.toHaveBeenCalled();
    });
  });

  describe('Multi-touch Integration Tests', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should handle mixed single and multi-touch scenarios', () => {
      const touch1 = createMockTouch(1, 300, 300, mockCanvas);

      // Start with single touch
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1]),
      );

      // Add second finger
      const touch2 = createMockTouch(2, 500, 300, mockCanvas);
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1, touch2]),
      );

      // Should transition to multi-touch mode
      expect(touchAdapter.multiTouchState.fingers.size).toBe(2);

      // Remove one finger, back to single touch
      touchAdapter.boundHandlers.touchEnd(
        createTouchEvent('touchend', [touch2]),
      );

      expect(touchAdapter.multiTouchState.fingers.size).toBe(1);
    });

    test('should handle rapid touch addition/removal', () => {
      const touch1 = createMockTouch(1, 300, 300, mockCanvas);
      const touch2 = createMockTouch(2, 500, 300, mockCanvas);
      const touch3 = createMockTouch(3, 400, 400, mockCanvas);

      // Add touches rapidly
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1]),
      );
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1, touch2]),
      );
      touchAdapter.boundHandlers.touchStart(
        createTouchEvent('touchstart', [touch1, touch2, touch3]),
      );

      // Should handle >2 fingers gracefully (ignore third finger)
      expect(touchAdapter.multiTouchState.fingers.size).toBe(2);

      // Remove all touches
      touchAdapter.boundHandlers.touchEnd(
        createTouchEvent('touchend', [touch1, touch2, touch3]),
      );

      expect(touchAdapter.multiTouchState.fingers.size).toBe(0);
    });
  });
});
