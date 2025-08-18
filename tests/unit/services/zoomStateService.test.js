// tests/unit/services/zoomStateService.test.js

describe('ZoomStateService', () => {
  let ZoomStateService;
  let mockEventBus;
  let mockAppState;
  let mockZoomManager;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    mockAppState = {
      getState: jest.fn(),
      setState: jest.fn(),
    };

    mockZoomManager = {
      setZoomLevel: jest.fn(),
      getZoomLevel: jest.fn(),
    };

    // Mock dependencies before importing
    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/data/observableState.js', () => ({
      appState: mockAppState,
    }));

    jest.doMock(
      '../../../src/js/features/zoom/zoomManager.js',
      () => mockZoomManager,
    );

    jest.doMock('../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
    }));

    // Import the module to test
    const module = await import('../../../src/js/services/zoomStateService.js');
    ZoomStateService = module.ZoomStateService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setZoomLevel', () => {
    beforeEach(() => {
      mockAppState.getState.mockReturnValue({
        zoomLevel: 5,
      });
    });

    it('should set zoom level in state and zoomManager', () => {
      const result = ZoomStateService.setZoomLevel(3);

      expect(result).toBe(true);
      expect(mockAppState.setState).toHaveBeenCalledWith({
        zoomLevel: 3,
      });
      expect(mockZoomManager.setZoomLevel).toHaveBeenCalledWith(3);
      expect(mockEventBus.emit).toHaveBeenCalledWith('zoom.level.changed', {
        zoomLevel: 3,
      });
    });

    it('should reject invalid zoom levels', () => {
      const result = ZoomStateService.setZoomLevel(null);

      expect(result).toBe(false);
      expect(mockAppState.setState).not.toHaveBeenCalled();
      expect(mockZoomManager.setZoomLevel).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should reject zoom levels outside bounds', () => {
      const result = ZoomStateService.setZoomLevel(10);

      expect(result).toBe(false);
      expect(mockAppState.setState).not.toHaveBeenCalled();
    });
  });

  describe('getZoomLevel', () => {
    it('should return zoom level from state', () => {
      mockAppState.getState.mockReturnValue({
        zoomLevel: 4,
      });

      const result = ZoomStateService.getZoomLevel();
      expect(result).toBe(4);
    });

    it('should return default zoom level if not in state', () => {
      mockAppState.getState.mockReturnValue({});

      const result = ZoomStateService.getZoomLevel();
      expect(result).toBe(5);
    });
  });

  describe('restoreZoomLevel', () => {
    it('should restore zoom level from state to zoomManager', () => {
      mockAppState.getState.mockReturnValue({
        zoomLevel: 2,
      });

      ZoomStateService.restoreZoomLevel();

      expect(mockZoomManager.setZoomLevel).toHaveBeenCalledWith(2);
    });

    it('should restore default zoom level if none in state', () => {
      mockAppState.getState.mockReturnValue({});

      ZoomStateService.restoreZoomLevel();

      expect(mockZoomManager.setZoomLevel).toHaveBeenCalledWith(5);
    });
  });

  describe('initialize', () => {
    it('should set up zoom change event listener', () => {
      ZoomStateService.initialize();

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'zoom.change',
        expect.any(Function),
      );
    });

    it('should handle zoom change events', () => {
      ZoomStateService.initialize();
      const zoomChangeHandler = mockEventBus.on.mock.calls[0][1];

      mockZoomManager.getZoomLevel.mockReturnValue(3);

      zoomChangeHandler({ zoomLevel: 3 });

      expect(mockAppState.setState).toHaveBeenCalledWith({
        zoomLevel: 3,
      });
    });
  });
});
