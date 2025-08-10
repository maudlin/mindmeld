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
      expect(typeof desktopAdapter.boundHandlers.doubleClick).toBe('function');
      expect(typeof desktopAdapter.boundHandlers.wheel).toBe('function');
      expect(typeof desktopAdapter.boundHandlers.keyDown).toBe('function');
    });
  });

  describe('Initialization', () => {
    it('should initialize and register event listeners', async () => {
      await desktopAdapter.init(mockEventBus);

      expect(desktopAdapter.isInitialized).toBe(true);
      expect(desktopAdapter.canvas).toBe(mockCanvas);

      // Check canvas event listeners
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'pointerdown',
        desktopAdapter.boundHandlers.pointerDown,
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'dblclick',
        desktopAdapter.boundHandlers.doubleClick,
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
      );
    });

    it('should throw error if canvas not found', async () => {
      global.document.getElementById.mockReturnValue(null);

      await expect(desktopAdapter.init(mockEventBus)).rejects.toThrow(
        'Canvas element not found',
      );
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await desktopAdapter.init(mockEventBus);
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
      await desktopAdapter.init(mockEventBus);
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

      desktopAdapter.isClickOnCanvas = jest.fn(() => true);

      desktopAdapter.handlePointerDown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle double click for note creation', () => {
      const mockEvent = {
        target: mockCanvas,
        clientX: 100,
        clientY: 200,
      };

      desktopAdapter.isClickOnCanvas = jest.fn(() => true);

      desktopAdapter.handleDoubleClick(mockEvent);

      // Should call throttled version, so we need to check if emit was called
      // The throttling means we need to wait or trigger it directly
      desktopAdapter.handleDoubleClickInternal(mockEvent);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'note.createAtPosition',
        expect.objectContaining({
          canvas: mockCanvas,
          event: mockEvent,
          _adapter: 'desktop',
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
        'zoom.change',
        expect.objectContaining({
          direction: 'in',
          centerX: 300,
          centerY: 200,
          _adapter: 'desktop',
        }),
      );
    });

    it('should handle keyboard delete events', () => {
      const mockEvent = {
        key: 'Delete',
        target: { classList: { contains: () => false } },
        preventDefault: jest.fn(),
      };

      // Mock selected notes
      document.querySelectorAll = jest.fn(() => []);

      desktopAdapter.handleKeyDown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'state.save',
        expect.objectContaining({
          _adapter: 'desktop',
        }),
      );
    });
  });

  describe('Helper Methods', () => {
    it('should correctly identify canvas clicks', () => {
      const canvasTarget = { id: 'canvas' };
      const backgroundTarget = {
        classList: { contains: (c) => c === 'background-layout' },
      };
      const noteTarget = { classList: { contains: (c) => c === 'note' } };

      expect(desktopAdapter.isClickOnCanvas(canvasTarget)).toBe(true);
      expect(desktopAdapter.isClickOnCanvas(backgroundTarget)).toBe(true);
      expect(desktopAdapter.isClickOnCanvas(noteTarget)).toBe(false);
    });

    it('should correctly identify editing note content', () => {
      const editingElement = {
        classList: { contains: (c) => c === 'note-content' },
        isContentEditable: true,
      };
      const nonEditingElement = {
        classList: { contains: () => false },
        isContentEditable: false,
      };

      // Mock document.activeElement using Object.defineProperty
      const originalActiveElement = Object.getOwnPropertyDescriptor(
        document,
        'activeElement',
      );
      Object.defineProperty(global.document, 'activeElement', {
        value: editingElement,
        configurable: true,
      });

      expect(desktopAdapter.isEditingNoteContent(editingElement)).toBe(true);
      expect(desktopAdapter.isEditingNoteContent(nonEditingElement)).toBe(
        false,
      );

      // Test when element is not active
      Object.defineProperty(global.document, 'activeElement', {
        value: null,
        configurable: true,
      });
      expect(desktopAdapter.isEditingNoteContent(editingElement)).toBe(false);

      // Restore original descriptor
      if (originalActiveElement) {
        Object.defineProperty(
          global.document,
          'activeElement',
          originalActiveElement,
        );
      }
    });
  });
});
