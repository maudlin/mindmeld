// tests/unit/interactions/adapters/DesktopAdapter.simple.test.js

describe('DesktopAdapter - Unit Tests', () => {
  let DesktopAdapter;
  let desktopAdapter;
  let mockEventBus;
  let mockCanvas;
  let mockCanvasContainer;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Mock canvas container first
    mockCanvasContainer = {
      id: 'canvas-container',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      })),
    };

    // Create mock canvas
    mockCanvas = {
      id: 'canvas',
      classList: {
        contains: jest.fn(() => false),
      },
      closest: jest.fn(() => null),
      contains: jest.fn((target) => target === mockCanvas),
      parentElement: mockCanvasContainer,
      clientWidth: 1000,
      clientHeight: 800,
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 800,
      })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      setPointerCapture: jest.fn(),
      releasePointerCapture: jest.fn(),
    };

    // Mock document.getElementById to return our canvas and container
    const originalGetElementById = global.document?.getElementById;
    global.document = global.document || {};
    global.document.getElementById = jest.fn((id) => {
      if (id === 'canvas') return mockCanvas;
      if (id === 'canvas-container') return mockCanvasContainer;
      return null;
    });
    global.document.addEventListener = jest.fn();
    global.document.removeEventListener = jest.fn();
    global.document.createElement = jest.fn(() => ({
      id: 'test-element',
      style: {},
      remove: jest.fn(),
    }));

    // Create mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Mock ViewportBehavior
    const mockViewportBehavior = {
      handleWheelZoom: jest.fn(),
      handlePinchZoom: jest.fn(),
      handlePan: jest.fn(),
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      resetZoom: jest.fn(),
    };

    // Mock ToolbarBehavior
    const mockToolbarBehavior = {
      handleColorSelection: jest.fn(),
      handleDeleteAction: jest.fn(),
      handleConnectorTypeSwitch: jest.fn(),
      isInitialized: true,
    };

    // Mock InteractionController
    const mockInteractionController = {
      getBehavior: jest.fn((name) => {
        if (name === 'viewport') return mockViewportBehavior;
        if (name === 'toolbar') return mockToolbarBehavior;
        return null;
      }),
    };

    // Import the module to test
    const module = await import(
      '../../../../src/js/interactions/adapters/DesktopAdapter.js'
    );
    DesktopAdapter = module.DesktopAdapter;

    // Create fresh adapter instance for each test
    desktopAdapter = new DesktopAdapter(mockInteractionController);

    // Store mocks for test access
    desktopAdapter._mockViewportBehavior = mockViewportBehavior;
    desktopAdapter._mockToolbarBehavior = mockToolbarBehavior;

    // Store original for cleanup
    global.originalGetElementById = originalGetElementById;
  });

  afterEach(() => {
    // Restore document.getElementById if it existed
    if (global.originalGetElementById) {
      global.document.getElementById = global.originalGetElementById;
    }
  });

  describe('Constructor', () => {
    it('should initialize with desktop adapter name', () => {
      expect(desktopAdapter.name).toBe('desktop');
      expect(desktopAdapter.isInitialized).toBe(false);
    });

    it('should create bound event handlers', () => {
      expect(typeof desktopAdapter.boundHandlers.pointerDown).toBe('function');
      expect(typeof desktopAdapter.boundHandlers.pointerMove).toBe('function');
      expect(typeof desktopAdapter.boundHandlers.pointerUp).toBe('function');
      expect(typeof desktopAdapter.boundHandlers.dblclick).toBe('function');
      expect(typeof desktopAdapter.boundHandlers.wheel).toBe('function');
      expect(typeof desktopAdapter.boundHandlers.keyDown).toBe('function');
    });
  });

  describe('Initialization', () => {
    it('should initialize and register event listeners', async () => {
      await desktopAdapter.initialize(mockEventBus);

      expect(desktopAdapter.isInitialized).toBe(true);
      expect(desktopAdapter.canvas).toBe(mockCanvas);

      // Check container event listeners (pointerdown moved to container after refactor)
      expect(mockCanvasContainer.addEventListener).toHaveBeenCalledWith(
        'pointerdown',
        desktopAdapter.boundHandlers.pointerDown,
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'dblclick',
        desktopAdapter.boundHandlers.dblclick,
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'wheel',
        desktopAdapter.boundHandlers.wheel,
      );

      // Check document event listeners
      expect(global.document.addEventListener).toHaveBeenCalledWith(
        'pointermove',
        desktopAdapter.boundHandlers.pointerMove,
      );
      expect(global.document.addEventListener).toHaveBeenCalledWith(
        'pointerup',
        desktopAdapter.boundHandlers.pointerUp,
      );
      expect(global.document.addEventListener).toHaveBeenCalledWith(
        'keydown',
        desktopAdapter.boundHandlers.keyDown,
        true,
      );
    });

    it('should throw error if canvas not found', async () => {
      global.document.getElementById.mockReturnValue(null);

      await expect(desktopAdapter.initialize(mockEventBus)).rejects.toThrow(
        'Canvas or canvas-container element not found',
      );
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await desktopAdapter.initialize(mockEventBus);
    });

    it('should remove event listeners on destroy', async () => {
      await desktopAdapter.destroy();

      expect(mockCanvasContainer.removeEventListener).toHaveBeenCalledWith(
        'pointerdown',
        desktopAdapter.boundHandlers.pointerDown,
      );
      expect(global.document.removeEventListener).toHaveBeenCalledWith(
        'pointermove',
        desktopAdapter.boundHandlers.pointerMove,
      );
      expect(desktopAdapter.isInitialized).toBe(false);
    });
  });

  describe('Event Handler Logic', () => {
    beforeEach(async () => {
      await desktopAdapter.initialize(mockEventBus);
    });

    it('should handle pointer down on canvas', () => {
      const mockEvent = {
        button: 0,
        target: mockCanvas,
        pointerId: 1,
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      desktopAdapter.handlePointerDown(mockEvent);

      // Verify pointer state is set
      expect(desktopAdapter.isPointerDown).toBe(true);
      expect(desktopAdapter.pointerDownTarget).toBe(mockCanvas);
      expect(desktopAdapter.pointerDownPosition).toEqual({ x: 100, y: 200 });
    });

    it('should handle double click for note creation', () => {
      const mockEvent = {
        target: mockCanvas,
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
        closest: jest.fn(() => null),
      };

      // Mock CanvasBehavior
      const mockCanvasBehavior = {
        handleCanvasDoubleClick: jest.fn(),
      };
      desktopAdapter.canvasBehavior = mockCanvasBehavior;

      desktopAdapter.handleDoubleClick(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCanvasBehavior.handleCanvasDoubleClick).toHaveBeenCalledWith(
        mockEvent,
        'desktop',
      );
    });

    it('should delegate wheel events to ViewportBehavior', async () => {
      // Create a fresh adapter for this test to avoid initialization conflicts
      const mockViewportBehavior = {
        handleWheelZoom: jest.fn(),
        handlePinchZoom: jest.fn(),
        handlePan: jest.fn(),
        zoomIn: jest.fn(),
        zoomOut: jest.fn(),
        resetZoom: jest.fn(),
      };

      const mockInteractionController = {
        getBehavior: jest.fn((name) => {
          if (name === 'viewport') return mockViewportBehavior;
          return null;
        }),
      };

      const testAdapter = new DesktopAdapter(mockInteractionController);
      testAdapter._mockViewportBehavior = mockViewportBehavior;

      await testAdapter.initialize(mockEventBus);

      const mockEvent = {
        deltaY: -100, // Negative = zoom in
        clientX: 300,
        clientY: 200,
        preventDefault: jest.fn(),
      };

      testAdapter.handleWheel(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      // Should delegate to ViewportBehavior instead of emitting EventBus events
      expect(
        testAdapter._mockViewportBehavior.handleWheelZoom,
      ).toHaveBeenCalledWith(
        'in', // direction
        300, // x
        200, // y
        'desktop', // inputType
      );
    });

    it('should handle wheel zoom out correctly', async () => {
      // Create a fresh adapter for this test to avoid initialization conflicts
      const mockViewportBehavior = {
        handleWheelZoom: jest.fn(),
        handlePinchZoom: jest.fn(),
        handlePan: jest.fn(),
        zoomIn: jest.fn(),
        zoomOut: jest.fn(),
        resetZoom: jest.fn(),
      };

      const mockInteractionController = {
        getBehavior: jest.fn((name) => {
          if (name === 'viewport') return mockViewportBehavior;
          return null;
        }),
      };

      const testAdapter = new DesktopAdapter(mockInteractionController);
      testAdapter._mockViewportBehavior = mockViewportBehavior;

      await testAdapter.initialize(mockEventBus);

      const mockEvent = {
        deltaY: 100, // Positive = zoom out
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn(),
      };

      testAdapter.handleWheel(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      // Should delegate zoom out to ViewportBehavior
      expect(
        testAdapter._mockViewportBehavior.handleWheelZoom,
      ).toHaveBeenCalledWith(
        'out', // direction
        400, // x
        300, // y
        'desktop', // inputType
      );
    });

    it('should handle keyboard delete events', () => {
      const mockEvent = {
        key: 'Delete',
        target: { classList: { contains: () => false } },
        preventDefault: jest.fn(),
      };

      // Mock that no note is in edit mode
      global.document.querySelector = jest.fn(() => null);

      desktopAdapter.handleKeyDown(mockEvent);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'notes.deleteSelected',
        expect.anything(),
      );
    });

    it('should get ToolbarBehavior reference during initialization', async () => {
      // Create a fresh adapter for this test to avoid initialization conflicts
      const mockToolbarBehavior = {
        handleColorSelection: jest.fn(),
        handleDeleteAction: jest.fn(),
        handleConnectorTypeSwitch: jest.fn(),
        isInitialized: true,
      };

      const mockInteractionController = {
        getBehavior: jest.fn((name) => {
          if (name === 'toolbar') return mockToolbarBehavior;
          return null;
        }),
      };

      const testAdapter = new DesktopAdapter(mockInteractionController);
      await testAdapter.initialize(mockEventBus);

      expect(testAdapter.toolbarBehavior).toBeDefined();
      expect(testAdapter.toolbarBehavior).toBe(mockToolbarBehavior);
    });
  });

  describe('Helper Methods', () => {
    it('should correctly identify canvas clicks', async () => {
      // Initialize adapter to set canvas reference
      await desktopAdapter.initialize(mockEventBus);

      expect(desktopAdapter.isClickOnCanvas(mockCanvas)).toBe(true);

      const nonCanvasElement = { id: 'other' };
      expect(desktopAdapter.isClickOnCanvas(nonCanvasElement)).toBe(false);
    });

    // Note: isEditingNoteContent method removed in behavior-driven refactor
    // Edit mode detection is now handled by behaviors, not adapters
  });
});
