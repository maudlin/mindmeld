// tests/unit/services/canvasStateService.test.js

describe('CanvasStateService', () => {
  let CanvasStateService;
  let mockEventBus;
  let mockAppState;
  let mockCanvasManager;
  let mockConfig;

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

    mockCanvasManager = {
      setCurrentModule: jest.fn(),
      getCurrentModule: jest.fn(() => ({ name: 'Standard Canvas' })),
      switchBackgroundLayout: jest.fn(),
    };

    mockConfig = {
      defaultCanvasType: 'Standard Canvas',
      canvasTypes: {
        standardCanvas: { name: 'Standard Canvas' },
        herosJourney: { name: "Hero's Journey" },
        nowNextFuture: { name: 'Now/Next/Future' },
        wardleyMap: { name: 'Wardley Map' },
      },
    };

    // Mock dependencies before importing
    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/data/observableState.js', () => ({
      appState: mockAppState,
    }));

    jest.doMock('../../../src/js/core/canvasManager.js', () => ({
      canvasManager: mockCanvasManager,
    }));

    jest.doMock('../../../src/js/core/config.js', () => mockConfig);

    jest.doMock('../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
    }));

    // Import the module to test
    const module = await import(
      '../../../src/js/services/canvasStateService.js'
    );
    CanvasStateService = module.CanvasStateService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('VALID_CANVAS_TYPES', () => {
    it('should contain expected canvas types', () => {
      expect(CanvasStateService.VALID_CANVAS_TYPES).toEqual([
        'Standard Canvas',
        "Hero's Journey",
        'Now/Next/Future',
        'Wardley Map',
      ]);
    });
  });

  describe('isValidCanvasType', () => {
    it('should return true for valid canvas types', () => {
      expect(CanvasStateService.isValidCanvasType('Standard Canvas')).toBe(
        true,
      );
      expect(CanvasStateService.isValidCanvasType("Hero's Journey")).toBe(true);
      expect(CanvasStateService.isValidCanvasType('Now/Next/Future')).toBe(
        true,
      );
      expect(CanvasStateService.isValidCanvasType('Wardley Map')).toBe(true);
    });

    it('should return false for invalid canvas types', () => {
      expect(CanvasStateService.isValidCanvasType('Invalid Canvas')).toBe(
        false,
      );
      expect(CanvasStateService.isValidCanvasType('')).toBe(false);
      expect(CanvasStateService.isValidCanvasType(null)).toBe(false);
      expect(CanvasStateService.isValidCanvasType(undefined)).toBe(false);
    });
  });

  describe('setCanvasType', () => {
    beforeEach(() => {
      mockAppState.getState.mockReturnValue({
        canvasType: 'Standard Canvas',
      });
    });

    it('should set valid canvas type and emit event', async () => {
      const mockCanvas = document.createElement('canvas');
      const result = await CanvasStateService.setCanvasType(
        "Hero's Journey",
        mockCanvas,
      );

      expect(result).toBe(true);
      expect(mockAppState.setState).toHaveBeenCalledWith({
        canvasType: "Hero's Journey",
      });
      expect(mockCanvasManager.switchBackgroundLayout).toHaveBeenCalledWith(
        "Hero's Journey",
        mockCanvas,
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas.type.changed', {
        canvasType: "Hero's Journey",
      });
    });

    it('should reject invalid canvas types', async () => {
      const result = await CanvasStateService.setCanvasType('Invalid Canvas');

      expect(result).toBe(false);
      expect(mockAppState.setState).not.toHaveBeenCalled();
      expect(mockCanvasManager.switchBackgroundLayout).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should work without canvas element', async () => {
      const result = await CanvasStateService.setCanvasType("Hero's Journey");

      expect(result).toBe(true);
      expect(mockAppState.setState).toHaveBeenCalledWith({
        canvasType: "Hero's Journey",
      });
      expect(mockCanvasManager.switchBackgroundLayout).not.toHaveBeenCalled();
    });
  });

  describe('getCanvasType', () => {
    it('should return canvas type from state', () => {
      mockAppState.getState.mockReturnValue({
        canvasType: "Hero's Journey",
      });

      const result = CanvasStateService.getCanvasType();
      expect(result).toBe("Hero's Journey");
    });

    it('should return default canvas type if not in state', () => {
      mockAppState.getState.mockReturnValue({});

      const result = CanvasStateService.getCanvasType();
      expect(result).toBe('Standard Canvas');
    });
  });

  describe('restoreCanvasType', () => {
    it('should restore canvas type from state to canvasManager', async () => {
      mockAppState.getState.mockReturnValue({
        canvasType: "Hero's Journey",
      });
      const mockCanvas = document.createElement('canvas');

      await CanvasStateService.restoreCanvasType(mockCanvas);

      expect(mockCanvasManager.switchBackgroundLayout).toHaveBeenCalledWith(
        "Hero's Journey",
        mockCanvas,
      );
    });

    it('should restore default canvas type if none in state', async () => {
      mockAppState.getState.mockReturnValue({});
      const mockCanvas = document.createElement('canvas');

      await CanvasStateService.restoreCanvasType(mockCanvas);

      expect(mockCanvasManager.switchBackgroundLayout).toHaveBeenCalledWith(
        'Standard Canvas',
        mockCanvas,
      );
    });
  });

  describe('initialize', () => {
    it('should set up canvas change event listener', () => {
      CanvasStateService.initialize();

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'canvas.switch',
        expect.any(Function),
      );
    });

    it('should handle canvas change events', async () => {
      CanvasStateService.initialize();
      const canvasChangeHandler = mockEventBus.on.mock.calls[0][1];

      const mockCanvas = document.createElement('canvas');
      await canvasChangeHandler({
        canvasType: "Hero's Journey",
        canvas: mockCanvas,
      });

      expect(mockAppState.setState).toHaveBeenCalledWith({
        canvasType: "Hero's Journey",
      });
      expect(mockCanvasManager.switchBackgroundLayout).toHaveBeenCalledWith(
        "Hero's Journey",
        mockCanvas,
      );
    });
  });

  describe('getCanvasTypeKey', () => {
    it('should return canvas type key for given name', () => {
      expect(CanvasStateService.getCanvasTypeKey('Standard Canvas')).toBe(
        'standardCanvas',
      );
      expect(CanvasStateService.getCanvasTypeKey("Hero's Journey")).toBe(
        'herosJourney',
      );
      expect(CanvasStateService.getCanvasTypeKey('Now/Next/Future')).toBe(
        'nowNextFuture',
      );
      expect(CanvasStateService.getCanvasTypeKey('Wardley Map')).toBe(
        'wardleyMap',
      );
    });

    it('should return null for unknown canvas type', () => {
      expect(CanvasStateService.getCanvasTypeKey('Unknown Canvas')).toBe(null);
    });
  });
});
