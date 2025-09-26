// tests/unit/features/clipboard/clipboardColorConsistency.test.js
// Test for cross-tab color consistency in clipboard operations

describe('Clipboard Color Consistency', () => {
  let DataProviderService;
  let ColorService;
  let mockAppState;
  let mockCanvas;

  beforeEach(async () => {
    jest.resetModules();

    // Create clean mock state for each test
    mockAppState = {
      getState: jest.fn(),
      setState: jest.fn(),
      clearLocalStorage: jest.fn(),
      saveToLocalStorage: jest.fn(),
      loadFromLocalStorage: jest.fn(() => true),
    };

    // Mock canvas element
    mockCanvas = {
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
    };

    // Mock document
    global.document = {
      querySelector: jest.fn(() => mockCanvas),
      querySelectorAll: jest.fn(() => []),
    };

    // Mock all required dependencies
    jest.doMock('../../../../src/js/data/observableState.js', () => ({
      appState: mockAppState,
    }));

    jest.doMock('../../../../src/js/services/PersistenceService.js', () => ({
      persistenceService: {
        save: jest.fn(),
        setState: jest.fn(),
        getState: jest.fn(() => ({
          notes: [],
          connections: [],
          zoomLevel: 5,
          canvasType: 'Standard Canvas',
        })),
      },
    }));

    jest.doMock('../../../../src/js/core/eventBus.js', () => ({
      eventBus: { emit: jest.fn() },
    }));

    jest.doMock('../../../../src/js/services/noteService.js', () => ({
      NoteService: {
        clearAllNotes: jest.fn(),
        createNoteFromData: jest.fn((data) => ({ id: data.i })),
      },
    }));

    jest.doMock('../../../../src/js/services/connectionService.js', () => ({
      ConnectionService: {
        createConnection: jest.fn(),
        updateConnections: jest.fn(),
        initializeConnectionDrawing: jest.fn(),
      },
    }));

    jest.doMock('../../../../src/js/services/canvasStateService.js', () => ({
      CanvasStateService: {
        setCanvasType: jest.fn(),
      },
    }));

    jest.doMock('../../../../src/js/utils/utils.js', () => ({
      truncateNoteContent: (content) => content,
      log: jest.fn(),
      debounce: (fn) => fn, // Simple debounce mock that returns the function as-is
    }));

    jest.doMock('../../../../src/js/core/featureFlags.js', () => ({
      isDebugEnabled: () => false,
    }));

    // Import after mocking
    DataProviderService = (
      await import('../../../../src/js/services/DataProviderService.js')
    ).DataProviderService;
    ColorService = (await import('../../../../src/js/services/colorService.js'))
      .ColorService;

    // Spy on ColorService methods after import
    jest.spyOn(ColorService, 'setAllNoteColors').mockImplementation(jest.fn());
    jest.spyOn(ColorService, 'isValidColor').mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cross-tab Color Persistence', () => {
    it('should preserve note colors when importing from clipboard across different browser tab states', async () => {
      // ARRANGE: Simulate Tab 1 - has blue notes
      const tab1ColorState = {
        colorState: {
          currentColor: 'blue',
          notes: {
            'existing-note-1': { colorScheme: 'blue' },
            'existing-note-2': { colorScheme: 'green' },
          },
        },
        notes: [
          {
            id: 'existing-note-1',
            content: 'Existing Note 1',
            left: '10px',
            top: '20px',
          },
          {
            id: 'existing-note-2',
            content: 'Existing Note 2',
            left: '30px',
            top: '40px',
          },
        ],
        connections: [],
      };

      // ARRANGE: Simulate Tab 2 - has yellow as current color (different state)
      const tab2ColorState = {
        colorState: {
          currentColor: 'yellow', // Different current color
          notes: {
            'different-note': { colorScheme: 'yellow' },
          },
        },
        notes: [
          {
            id: 'different-note',
            content: 'Different Note',
            left: '50px',
            top: '60px',
          },
        ],
        connections: [],
      };

      // ARRANGE: Clipboard content from Tab 1 (contains blue notes)
      const clipboardData = JSON.stringify({
        data: {
          n: [
            {
              i: 'copied-note-1',
              c: 'Copied Note 1',
              p: [100, 150],
              cl: 'blue', // Explicit color data
            },
            {
              i: 'copied-note-2',
              c: 'Copied Note 2',
              p: [200, 250],
              cl: 'green', // Explicit color data
            },
          ],
          c: [],
        },
      });

      // ARRANGE: Mock Tab 2 initial state (different color environment)
      mockAppState.getState.mockReturnValue(tab2ColorState);

      // ACT: Import clipboard data in Tab 2 context
      const dataProviderService = DataProviderService.getInstance();
      await dataProviderService.importJSON(clipboardData);

      // ASSERT: Colors should be preserved from clipboard data, not influenced by Tab 2's state
      expect(ColorService.setAllNoteColors).toHaveBeenCalledWith({
        'copied-note-1': { colorScheme: 'blue' },
        'copied-note-2': { colorScheme: 'green' },
      });

      // ASSERT: State save should be triggered via event system for cross-tab consistency
      const { eventBus } = await import('../../../../src/js/core/eventBus.js');
      expect(eventBus.emit).toHaveBeenCalledWith('state.save');
    });

    it('should handle clipboard import atomically to prevent race conditions', async () => {
      // ARRANGE: Complex clipboard data with multiple notes and colors
      const clipboardData = JSON.stringify({
        data: {
          n: [
            { i: 'note-1', c: 'Note 1', p: [10, 20], cl: 'blue' },
            { i: 'note-2', c: 'Note 2', p: [30, 40], cl: 'pink' },
            { i: 'note-3', c: 'Note 3', p: [50, 60] }, // No explicit color
          ],
          c: [['note-1', 'note-2', 0]],
        },
      });

      // ARRANGE: Mock initial state
      mockAppState.getState.mockReturnValue({
        colorState: { currentColor: 'yellow', notes: {} },
        notes: [],
        connections: [],
      });

      // ACT: Import clipboard data
      const dataProviderService = DataProviderService.getInstance();
      await dataProviderService.importJSON(clipboardData);

      // ASSERT: All notes should have colors (explicit or default yellow)
      expect(ColorService.setAllNoteColors).toHaveBeenCalledWith({
        'note-1': { colorScheme: 'blue' },
        'note-2': { colorScheme: 'pink' },
        'note-3': { colorScheme: 'yellow' }, // Default yellow for notes without explicit color
      });
    });

    it('should not call setAllNoteColors when no color data exists in clipboard', async () => {
      // ARRANGE: Clipboard data without any color information
      const clipboardData = JSON.stringify({
        data: {
          n: [
            { i: 'note-1', c: 'Note 1', p: [10, 20] },
            { i: 'note-2', c: 'Note 2', p: [30, 40] },
          ],
          c: [],
        },
      });

      // ARRANGE: Mock initial state
      mockAppState.getState.mockReturnValue({
        colorState: { currentColor: 'yellow', notes: {} },
        notes: [],
        connections: [],
      });

      // ACT: Import clipboard data
      const dataProviderService = DataProviderService.getInstance();
      await dataProviderService.importJSON(clipboardData);

      // ASSERT: setAllNoteColors should be called with default yellow for all notes
      expect(ColorService.setAllNoteColors).toHaveBeenCalledWith({
        'note-1': { colorScheme: 'yellow' }, // Default yellow for notes without explicit color
        'note-2': { colorScheme: 'yellow' }, // Default yellow for notes without explicit color
      });
    });
  });

  describe('State Persistence Edge Cases', () => {
    it('should trigger state save via event system for imported colors', async () => {
      // ARRANGE: Clipboard data with colors
      const clipboardData = JSON.stringify({
        data: {
          n: [{ i: 'note-1', c: 'Note 1', p: [10, 20], cl: 'blue' }],
          c: [],
        },
      });

      mockAppState.getState.mockReturnValue({
        colorState: { currentColor: 'yellow', notes: {} },
        notes: [],
        connections: [],
      });

      // ACT: Import clipboard data
      const dataProviderService = DataProviderService.getInstance();
      await dataProviderService.importJSON(clipboardData);

      // ASSERT: Colors should be set and state save triggered
      expect(ColorService.setAllNoteColors).toHaveBeenCalledWith({
        'note-1': { colorScheme: 'blue' },
      });

      const { eventBus } = await import('../../../../src/js/core/eventBus.js');
      expect(eventBus.emit).toHaveBeenCalledWith('state.save');
    });
  });
});
