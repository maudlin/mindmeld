// tests/unit/interactions/adapters/DesktopAdapter.simple.test.js

describe('DesktopAdapter - Unit Tests', () => {
  let DesktopAdapter;
  let desktopAdapter;
  let mockEventBus;
  let mockCanvas;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock canvas
    mockCanvas = {
      id: 'canvas',
      classList: {
        contains: jest.fn(() => false),
      },
      closest: jest.fn(() => null),
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

    // Mock document.getElementById to return our canvas
    const originalGetElementById = global.document?.getElementById;
    global.document = global.document || {};
    global.document.getElementById = jest.fn((id) => {
      if (id === 'canvas') return mockCanvas;
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

    // Import the module to test
    const module = await import(
      '../../../../src/js/interactions/adapters/DesktopAdapter.js'
    );
    DesktopAdapter = module.DesktopAdapter;

    desktopAdapter = new DesktopAdapter();

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

      // Check canvas event listeners
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
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
        'Canvas element not found',
      );
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await desktopAdapter.initialize(mockEventBus);
    });

    it('should remove event listeners on destroy', async () => {
      await desktopAdapter.destroy();

      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
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
      };

      desktopAdapter.handleDoubleClick(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'note.createAtPosition',
        expect.objectContaining({
          canvas: mockCanvas,
          event: expect.objectContaining({
            clientX: 100,
            clientY: 200,
            type: 'dblclick',
          }),
        }),
      );
    });

    it('should handle wheel events for zoom', () => {
      const mockEvent = {
        deltaY: -100,
        ctrlKey: true,
        clientX: 300,
        clientY: 200,
        preventDefault: jest.fn(),
      };

      desktopAdapter.handleWheel(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'canvas.zoom',
        expect.objectContaining({
          direction: 'in',
          x: 300,
          y: 200,
        }),
      );
    });

    it('should NOT emit canvas.pan events for wheel without modifier keys', () => {
      const mockEvent = {
        deltaX: 50,
        deltaY: 30,
        ctrlKey: false,
        metaKey: false,
        preventDefault: jest.fn(),
      };

      desktopAdapter.handleWheel(mockEvent);

      // Should not emit canvas.pan events - wheel should only zoom, not pan on desktop
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'canvas.pan',
        expect.any(Object),
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
  });

  describe('Helper Methods', () => {
    it('should correctly identify canvas clicks', async () => {
      // Initialize adapter to set canvas reference
      await desktopAdapter.initialize(mockEventBus);

      expect(desktopAdapter.isClickOnCanvas(mockCanvas)).toBe(true);
      expect(desktopAdapter.isClickOnCanvas({ id: 'other' })).toBe(false);
    });

    // Note: isEditingNoteContent method removed in behavior-driven refactor
    // Edit mode detection is now handled by behaviors, not adapters
  });
});
