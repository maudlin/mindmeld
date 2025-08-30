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
});
