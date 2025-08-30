// tests/unit/data/exportImport.test.js

describe('JSON Export/Import with Canvas Type', () => {
  let exportToJSON, importFromJSON;
  let mockAppState;
  let mockColorService;
  let mockCanvasStateService;
  let mockNoteService;
  let mockConnectionService;
  let mockEventBus;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockAppState = {
      getState: jest.fn(),
      setState: jest.fn(),
    };

    mockColorService = {
      getAllNoteColors: jest.fn(() => ({})),
      isValidColor: jest.fn(() => true),
      setAllNoteColors: jest.fn(),
    };

    mockCanvasStateService = {
      isValidCanvasType: jest.fn(),
      setCanvasType: jest.fn(),
    };

    mockNoteService = {
      clearAllNotes: jest.fn(),
      createNoteFromData: jest.fn(),
    };

    mockConnectionService = {
      createConnection: jest.fn(),
      updateConnections: jest.fn(),
      initializeConnectionDrawing: jest.fn(),
    };

    mockEventBus = {
      emit: jest.fn(),
    };

    // Mock DOM methods
    global.document = {
      querySelectorAll: jest.fn(() => []),
      getElementById: jest.fn(() => ({ remove: jest.fn() })),
    };

    // Don't mock JSON - use native implementation

    // Mock utils
    const mockUtils = {
      truncateNoteContent: jest.fn((content) => content),
      log: jest.fn(),
      debounce: jest.fn((fn) => fn), // Return the function directly for testing
    };

    // Mock constants
    const mockConstants = {
      NOTE_CONTENT_LIMIT: 1000,
      CONNECTION_TYPE_MAP: { 'uni-forward': 1 },
      CONNECTION_TYPE_MAP_REVERSE: new Map([[1, 'uni-forward']]),
      CONNECTION_TYPES: { NONE: 'none' },
    };

    // Mock dependencies before importing
    jest.doMock('../../../src/js/data/observableState.js', () => ({
      appState: mockAppState,
    }));

    jest.doMock('../../../src/js/services/colorService.js', () => ({
      ColorService: mockColorService,
    }));

    jest.doMock('../../../src/js/services/canvasStateService.js', () => ({
      CanvasStateService: mockCanvasStateService,
    }));

    jest.doMock('../../../src/js/services/noteService.js', () => ({
      NoteService: mockNoteService,
    }));

    jest.doMock('../../../src/js/services/connectionService.js', () => ({
      ConnectionService: mockConnectionService,
    }));

    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/utils/utils.js', () => mockUtils);

    jest.doMock('../../../src/js/core/constants.js', () => mockConstants);

    // Import the module to test
    const module = await import('../../../src/js/data/dataStore.js');
    exportToJSON = module.exportToJSON;
    importFromJSON = module.importFromJSON;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportToJSON', () => {
    it('should export canvas type when not Standard Canvas', () => {
      mockAppState.getState.mockReturnValue({
        notes: [
          {
            id: '1',
            content: 'Test Note',
            left: '100px',
            top: '200px',
          },
        ],
        connections: [],
        canvasType: "Hero's Journey",
      });

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      expect(parsed.data.ct).toBe("Hero's Journey");
      expect(parsed.data.n).toHaveLength(1);
      expect(parsed.data.c).toHaveLength(0);
    });

    it('should not export canvas type when Standard Canvas (default)', () => {
      mockAppState.getState.mockReturnValue({
        notes: [],
        connections: [],
        canvasType: 'Standard Canvas',
      });

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      expect(parsed.data.ct).toBeUndefined();
    });

    it('should not export canvas type when undefined', () => {
      mockAppState.getState.mockReturnValue({
        notes: [],
        connections: [],
        // canvasType is undefined
      });

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      expect(parsed.data.ct).toBeUndefined();
    });

    it('should export all canvas types correctly', () => {
      const canvasTypes = ["Hero's Journey", 'Now/Next/Future', 'Wardley Map'];

      canvasTypes.forEach((canvasType) => {
        mockAppState.getState.mockReturnValue({
          notes: [],
          connections: [],
          canvasType: canvasType,
        });

        const result = exportToJSON();
        const parsed = JSON.parse(result);

        expect(parsed.data.ct).toBe(canvasType);
      });
    });
  });

  describe('importFromJSON', () => {
    const mockCanvas = document.createElement('canvas');

    beforeEach(() => {
      mockNoteService.createNoteFromData.mockReturnValue({
        id: '1',
      });
      mockCanvasStateService.isValidCanvasType.mockReturnValue(true);
    });

    it('should import valid canvas type', async () => {
      const jsonData = JSON.stringify({
        data: {
          n: [
            {
              i: '1',
              c: 'Test Note',
              p: [100, 200],
            },
          ],
          c: [],
          ct: "Hero's Journey",
        },
      });

      await importFromJSON(jsonData, mockCanvas);

      expect(mockCanvasStateService.isValidCanvasType).toHaveBeenCalledWith(
        "Hero's Journey",
      );
      expect(mockCanvasStateService.setCanvasType).toHaveBeenCalledWith(
        "Hero's Journey",
        mockCanvas,
      );
      expect(mockAppState.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          canvasType: "Hero's Journey",
        }),
      );
    });

    it('should default to Standard Canvas when no canvas type in JSON', async () => {
      const jsonData = JSON.stringify({
        data: {
          n: [],
          c: [],
          // No ct field
        },
      });

      await importFromJSON(jsonData, mockCanvas);

      expect(mockCanvasStateService.setCanvasType).toHaveBeenCalledWith(
        'Standard Canvas',
        mockCanvas,
      );
      expect(mockAppState.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          canvasType: 'Standard Canvas',
        }),
      );
    });

    it('should default to Standard Canvas when invalid canvas type in JSON', async () => {
      mockCanvasStateService.isValidCanvasType.mockReturnValue(false);

      const jsonData = JSON.stringify({
        data: {
          n: [],
          c: [],
          ct: 'Invalid Canvas Type',
        },
      });

      await importFromJSON(jsonData, mockCanvas);

      expect(mockCanvasStateService.isValidCanvasType).toHaveBeenCalledWith(
        'Invalid Canvas Type',
      );
      expect(mockCanvasStateService.setCanvasType).toHaveBeenCalledWith(
        'Standard Canvas',
        mockCanvas,
      );
      expect(mockAppState.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          canvasType: 'Standard Canvas',
        }),
      );
    });

    it('should handle import with both canvas type and colors', async () => {
      const jsonData = JSON.stringify({
        data: {
          n: [
            {
              i: '1',
              c: 'Colored Note',
              p: [100, 200],
              cl: 'blue',
            },
          ],
          c: [],
          ct: 'Wardley Map',
        },
      });

      await importFromJSON(jsonData, mockCanvas);

      // Should import colors
      expect(mockColorService.isValidColor).toHaveBeenCalledWith('blue');
      expect(mockColorService.setAllNoteColors).toHaveBeenCalledWith({
        1: { colorScheme: 'blue' },
      });

      // Should import canvas type
      expect(mockCanvasStateService.setCanvasType).toHaveBeenCalledWith(
        'Wardley Map',
        mockCanvas,
      );

      // Should emit notes.loaded event for color application
      expect(mockEventBus.emit).toHaveBeenCalledWith('notes.loaded');
    });

    it('should maintain backward compatibility with old JSON format', async () => {
      const oldJsonData = JSON.stringify({
        data: {
          n: [
            {
              i: '1',
              c: 'Old Note',
              p: [100, 200],
            },
          ],
          c: [],
          // No canvas type or colors
        },
      });

      await importFromJSON(oldJsonData, mockCanvas);

      expect(mockCanvasStateService.setCanvasType).toHaveBeenCalledWith(
        'Standard Canvas',
        mockCanvas,
      );
      expect(mockAppState.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          canvasType: 'Standard Canvas',
        }),
      );
    });
  });
});
