// tests/unit/interactions/InputController.test.js

describe('InputController', () => {
  let InputController;
  let inputController;
  let mockEventBus;
  let mockCapabilityDetector;
  let mockDesktopAdapter;
  let mockTouchAdapter;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mocks
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    mockCapabilityDetector = {
      getOptimalInputMode: jest.fn().mockReturnValue('desktop'),
      getCapabilities: jest.fn().mockReturnValue({
        isTouchFirst: false,
        optimalInputMode: 'desktop',
        supportedModes: ['desktop'],
      }),
    };

    mockDesktopAdapter = {
      init: jest.fn(),
      destroy: jest.fn(),
      getName: jest.fn().mockReturnValue('desktop'),
    };

    mockTouchAdapter = {
      init: jest.fn(),
      destroy: jest.fn(),
      getName: jest.fn().mockReturnValue('touch'),
    };

    // Import the module to test
    const module = await import(
      '../../../src/js/interactions/InputController.js'
    );
    InputController = module.InputController;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with event bus and capability detector', () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      expect(inputController.eventBus).toBe(mockEventBus);
      expect(inputController.capabilityDetector).toBe(mockCapabilityDetector);
      expect(inputController.currentAdapter).toBeNull();
    });

    it('should detect optimal input mode during initialization', async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Mock the internal _loadAdapter method to avoid dynamic imports in tests
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockDesktopAdapter);

      await inputController.initialize();

      expect(mockCapabilityDetector.getOptimalInputMode).toHaveBeenCalled();
    });

    it('should load appropriate adapter based on capability detection', async () => {
      mockCapabilityDetector.getOptimalInputMode.mockReturnValue('desktop');
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Mock the internal _loadAdapter method
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockDesktopAdapter);

      await inputController.initialize();

      expect(inputController._loadAdapter).toHaveBeenCalledWith('desktop');
      expect(mockDesktopAdapter.init).toHaveBeenCalledWith(mockEventBus);
    });

    it('should load touch adapter for touch-first devices', async () => {
      mockCapabilityDetector.getOptimalInputMode.mockReturnValue('touch');
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Mock the internal _loadAdapter method
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockTouchAdapter);

      await inputController.initialize();

      expect(inputController._loadAdapter).toHaveBeenCalledWith('touch');
      expect(mockTouchAdapter.init).toHaveBeenCalledWith(mockEventBus);
    });
  });

  describe('Adapter Management', () => {
    beforeEach(async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Mock _loadAdapter to return appropriate mock adapters
      inputController._loadAdapter = jest
        .fn()
        .mockImplementation(async (mode) => {
          return mode === 'desktop' ? mockDesktopAdapter : mockTouchAdapter;
        });

      await inputController.initialize();
    });

    it('should switch adapters when mode changes', async () => {
      // Start with desktop adapter
      expect(inputController.currentAdapter).toBe(mockDesktopAdapter);

      // Switch to touch
      await inputController.switchToMode('touch');

      expect(mockDesktopAdapter.destroy).toHaveBeenCalled();
      expect(inputController.currentAdapter).toBe(mockTouchAdapter);
      expect(mockTouchAdapter.init).toHaveBeenCalledWith(mockEventBus);
    });

    it('should emit mode change events', async () => {
      await inputController.switchToMode('touch');

      expect(mockEventBus.emit).toHaveBeenCalledWith('input.modeChanged', {
        from: 'desktop',
        to: 'touch',
        timestamp: expect.any(Number),
      });
    });

    it('should not switch to the same mode', async () => {
      const initialAdapter = inputController.currentAdapter;

      await inputController.switchToMode('desktop'); // Same mode

      expect(initialAdapter.destroy).not.toHaveBeenCalled();
      expect(inputController.currentAdapter).toBe(initialAdapter);
    });

    it('should validate mode before switching', async () => {
      await expect(inputController.switchToMode('invalid')).rejects.toThrow(
        'Unsupported input mode: invalid',
      );

      expect(mockDesktopAdapter.destroy).not.toHaveBeenCalled();
      expect(inputController.currentAdapter).toBe(mockDesktopAdapter);
    });
  });

  describe('Dynamic Import System', () => {
    it('should handle import failures gracefully', async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Mock the _loadAdapter method to throw an error
      inputController._loadAdapter = jest
        .fn()
        .mockRejectedValue(new Error('Module not found'));

      await expect(inputController.switchToMode('touch')).rejects.toThrow(
        'Failed to switch to touch mode: Module not found',
      );
    });

    it('should cache loaded adapters for performance', async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Mock _loadAdapter to track calls and return our mock adapters
      inputController._loadAdapter = jest
        .fn()
        .mockImplementation(async (mode) => {
          return mode === 'desktop' ? mockDesktopAdapter : mockTouchAdapter;
        });

      await inputController.initialize();

      // Switch to touch and back to desktop
      await inputController.switchToMode('touch');
      await inputController.switchToMode('desktop');

      // _loadAdapter should have been called 3 times total (initial + touch + desktop)
      expect(inputController._loadAdapter).toHaveBeenCalledTimes(3);
      expect(mockDesktopAdapter.init).toHaveBeenCalledTimes(2); // Initial + second load
    });
  });

  describe('Event Bus Integration', () => {
    beforeEach(async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Mock _loadAdapter to return mock adapter
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockDesktopAdapter);

      await inputController.initialize();
    });

    it('should proxy adapter events through event bus', () => {
      // Simulate adapter emitting an event
      const eventData = { x: 100, y: 200, type: 'tap' };

      // This would normally be called by the adapter
      inputController.handleAdapterEvent('gesture.detected', eventData);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'gesture.detected',
        eventData,
      );
    });

    it('should handle adapter lifecycle events', async () => {
      // Override the mock to return touch adapter for this test
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockTouchAdapter);

      await inputController.switchToMode('touch');

      expect(mockEventBus.emit).toHaveBeenCalledWith('input.adapterLoaded', {
        mode: 'touch',
        adapter: mockTouchAdapter,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle adapter initialization failures', async () => {
      mockDesktopAdapter.init.mockRejectedValue(new Error('Init failed'));
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Mock _loadAdapter to return the failing mock adapter
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockDesktopAdapter);

      await expect(inputController.initialize()).rejects.toThrow(
        'Failed to initialize desktop adapter: Init failed',
      );
    });

    it('should cleanup on errors during adapter switch', async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Set up successful desktop initialization
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockDesktopAdapter);
      await inputController.initialize();

      // Now set up touch adapter to fail during init
      mockTouchAdapter.init.mockRejectedValue(new Error('Touch init failed'));
      inputController._loadAdapter = jest
        .fn()
        .mockImplementation(async (mode) => {
          return mode === 'touch' ? mockTouchAdapter : mockDesktopAdapter;
        });

      await expect(inputController.switchToMode('touch')).rejects.toThrow(
        'Failed to initialize touch adapter: Touch init failed',
      );

      // Should maintain current adapter on failure
      expect(inputController.currentAdapter).toBe(mockDesktopAdapter);
    });
  });

  describe('Capability Queries', () => {
    beforeEach(async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Mock _loadAdapter to return mock adapter
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockDesktopAdapter);

      await inputController.initialize();
    });

    it('should provide current mode information', () => {
      const info = inputController.getCurrentModeInfo();

      expect(info).toEqual({
        mode: 'desktop',
        adapter: mockDesktopAdapter,
        capabilities: expect.any(Object),
      });
    });

    it('should list available modes', () => {
      mockCapabilityDetector.getCapabilities.mockReturnValue({
        supportedModes: ['desktop', 'touch'],
      });

      const modes = inputController.getAvailableModes();

      expect(modes).toEqual(['desktop', 'touch']);
    });
  });
});
