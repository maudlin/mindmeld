/**
 * Input Controller Behavior Tests
 *
 * Tests the adaptive input system that dynamically switches between
 * desktop and touch input modes based on device capabilities.
 * Focus on adapter lifecycle, mode switching, and event integration.
 */

describe('Input Controller Behavior', () => {
  let InputController,
    inputController,
    mockEventBus,
    mockCapabilityDetector,
    mockDesktopAdapter,
    mockTouchAdapter;

  const setupMocks = () => {
    mockEventBus = { emit: jest.fn(), on: jest.fn(), off: jest.fn() };
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
  };

  beforeEach(async () => {
    jest.resetModules();
    setupMocks();
    const module = await import(
      '../../../src/js/interactions/InputController.js'
    );
    InputController = module.InputController;
  });

  afterEach(() => jest.clearAllMocks());

  describe('Controller Initialization', () => {
    it('initializes with correct properties and dependencies', () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      expect(inputController.eventBus).toBe(mockEventBus);
      expect(inputController.capabilityDetector).toBe(mockCapabilityDetector);
      expect(inputController.currentAdapter).toBeNull();
    });

    const initTestCases = [
      {
        mode: 'desktop',
        adapter: () => mockDesktopAdapter,
        description: 'desktop adapter based on capability detection',
      },
      {
        mode: 'touch',
        adapter: () => mockTouchAdapter,
        description: 'touch adapter for touch-first devices',
      },
    ];

    it.each(initTestCases)('loads $description', async ({ mode, adapter }) => {
      mockCapabilityDetector.getOptimalInputMode.mockReturnValue(mode);
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );
      inputController._loadAdapter = jest.fn().mockResolvedValue(adapter());

      await inputController.initialize();

      expect(mockCapabilityDetector.getOptimalInputMode).toHaveBeenCalled();
      expect(inputController._loadAdapter).toHaveBeenCalledWith(mode);
      expect(adapter().init).toHaveBeenCalledWith(mockEventBus);
    });
  });

  describe('Input Mode Management', () => {
    beforeEach(async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );
      inputController._loadAdapter = jest
        .fn()
        .mockImplementation(async (mode) =>
          mode === 'desktop' ? mockDesktopAdapter : mockTouchAdapter,
        );
      await inputController.initialize();
    });

    it('switches adapters correctly and emits events', async () => {
      expect(inputController.currentAdapter).toBe(mockDesktopAdapter);

      await inputController.switchToMode('touch');

      expect(mockDesktopAdapter.destroy).toHaveBeenCalled();
      expect(inputController.currentAdapter).toBe(mockTouchAdapter);
      expect(mockTouchAdapter.init).toHaveBeenCalledWith(mockEventBus);
      expect(mockEventBus.emit).toHaveBeenCalledWith('input.modeChanged', {
        from: 'desktop',
        to: 'touch',
        timestamp: expect.any(Number),
      });
    });

    it('handles edge cases in mode switching', async () => {
      const initialAdapter = inputController.currentAdapter;

      // Same mode - should not switch
      await inputController.switchToMode('desktop');
      expect(initialAdapter.destroy).not.toHaveBeenCalled();
      expect(inputController.currentAdapter).toBe(initialAdapter);

      // Invalid mode - should throw error
      await expect(inputController.switchToMode('invalid')).rejects.toThrow(
        'Unsupported input mode: invalid',
      );
      expect(inputController.currentAdapter).toBe(mockDesktopAdapter);
    });
  });

  describe('Dynamic Adapter Loading', () => {
    it('handles import failures and caches adapters for performance', async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );

      // Test import failure
      inputController._loadAdapter = jest
        .fn()
        .mockRejectedValue(new Error('Module not found'));
      await expect(inputController.switchToMode('touch')).rejects.toThrow(
        'Failed to switch to touch mode: Module not found',
      );

      // Test adapter caching
      inputController._loadAdapter = jest
        .fn()
        .mockImplementation(async (mode) =>
          mode === 'desktop' ? mockDesktopAdapter : mockTouchAdapter,
        );

      await inputController.initialize();
      await inputController.switchToMode('touch');
      await inputController.switchToMode('desktop');

      expect(inputController._loadAdapter).toHaveBeenCalledTimes(3);
      expect(mockDesktopAdapter.init).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Communication', () => {
    beforeEach(async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockDesktopAdapter);
      await inputController.initialize();
    });

    it('proxies adapter events and handles lifecycle events', async () => {
      // Test event proxying
      const eventData = { x: 100, y: 200, type: 'tap' };
      inputController.handleAdapterEvent('gesture.detected', eventData);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'gesture.detected',
        eventData,
      );

      // Test lifecycle event for adapter loading
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

  describe('Error Recovery', () => {
    it('handles initialization failures and cleans up during adapter switch errors', async () => {
      // Test initialization failure
      const failingDesktopAdapter = {
        ...mockDesktopAdapter,
        init: jest.fn().mockRejectedValue(new Error('Init failed')),
      };
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(failingDesktopAdapter);

      await expect(inputController.initialize()).rejects.toThrow(
        'Failed to initialize desktop adapter: Init failed',
      );

      // Test cleanup during adapter switch failure - create fresh controller
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockDesktopAdapter);
      await inputController.initialize();

      const failingTouchAdapter = {
        ...mockTouchAdapter,
        init: jest.fn().mockRejectedValue(new Error('Touch init failed')),
      };
      inputController._loadAdapter = jest
        .fn()
        .mockImplementation(async (mode) =>
          mode === 'touch' ? failingTouchAdapter : mockDesktopAdapter,
        );

      await expect(inputController.switchToMode('touch')).rejects.toThrow(
        'Failed to initialize touch adapter: Touch init failed',
      );
      expect(inputController.currentAdapter).toBe(mockDesktopAdapter);
    });
  });

  describe('Capability Information', () => {
    beforeEach(async () => {
      inputController = new InputController(
        mockEventBus,
        mockCapabilityDetector,
      );
      inputController._loadAdapter = jest
        .fn()
        .mockResolvedValue(mockDesktopAdapter);
      await inputController.initialize();
    });

    it('provides current mode information and lists available modes', () => {
      // Test current mode info
      const info = inputController.getCurrentModeInfo();
      expect(info).toEqual({
        mode: 'desktop',
        adapter: mockDesktopAdapter,
        capabilities: expect.any(Object),
      });

      // Test available modes
      mockCapabilityDetector.getCapabilities.mockReturnValue({
        supportedModes: ['desktop', 'touch'],
      });
      const modes = inputController.getAvailableModes();
      expect(modes).toEqual(['desktop', 'touch']);
    });
  });
});
