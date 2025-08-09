// tests/unit/data/storageManager.test.js

describe('StorageManager', () => {
  let storageManager;
  let mockAppState;
  let mockEventBus;
  let mockDataStore;
  let mockUtils;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Clear localStorage
    localStorage.clear();

    // Create mocks
    mockAppState = {
      getState: jest.fn(),
      setState: jest.fn(),
      saveToLocalStorage: jest.fn(),
      loadFromLocalStorage: jest.fn(),
      clearLocalStorage: jest.fn(),
      hasStoredState: jest.fn(),
    };

    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    mockDataStore = {
      updateNotesAndConnections: jest.fn(),
      clearAllNotesAndConnections: jest.fn(),
      getCurrentState: jest.fn(),
    };

    mockUtils = {
      debounce: jest.fn().mockImplementation((fn) => fn),
      log: jest.fn(),
    };

    // Mock dependencies before importing
    jest.doMock('../../../src/js/data/observableState.js', () => ({
      appState: mockAppState,
    }));

    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/data/dataStore.js', () => mockDataStore);

    jest.doMock('../../../src/js/utils/utils.js', () => mockUtils);

    jest.doMock('../../../src/js/core/constants.js', () => ({
      BACKUP_INTERVAL: 5000,
    }));

    // Import the module to test
    storageManager = await import('../../../src/js/data/storageManager.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Clear any intervals or timeouts
    jest.clearAllTimers();
  });

  describe('saveStateToStorage', () => {
    it('should get current state and save to localStorage', () => {
      const mockState = {
        notes: [{ id: '1', content: 'test' }],
        connections: [],
        zoomLevel: 5,
        colorState: { currentColor: 'yellow', notes: {} },
      };
      mockDataStore.getCurrentState.mockReturnValue(mockState);

      storageManager.saveStateToStorage();

      expect(mockDataStore.getCurrentState).toHaveBeenCalled();
      expect(mockAppState.setState).toHaveBeenCalledWith(mockState, true);
      expect(mockAppState.saveToLocalStorage).toHaveBeenCalled();
    });

    it('should update app state silently', () => {
      const mockState = { notes: [], connections: [] };
      mockDataStore.getCurrentState.mockReturnValue(mockState);

      storageManager.saveStateToStorage();

      expect(mockAppState.setState).toHaveBeenCalledWith(mockState, true);
    });
  });

  describe('loadStateFromStorage', () => {
    beforeEach(() => {
      // Reset the internal state flag
      jest.resetModules();
    });

    it('should load state when not already loaded and state is empty', async () => {
      // Re-import to reset static variables
      const freshStorageManager = await import(
        '../../../src/js/data/storageManager.js'
      );

      mockAppState.getState.mockReturnValue({ notes: [], connections: [] });
      mockAppState.loadFromLocalStorage.mockReturnValue(true);

      const loadedState = {
        notes: [{ id: '1', content: 'loaded' }],
        connections: [],
        colorState: { currentColor: 'blue', notes: {} },
      };
      mockAppState.getState
        .mockReturnValueOnce({ notes: [], connections: [] }) // Initial empty check
        .mockReturnValueOnce(loadedState); // Loaded state

      const result = freshStorageManager.loadStateFromStorage();

      expect(result).toBe(true);
      expect(mockAppState.loadFromLocalStorage).toHaveBeenCalled();
      expect(mockDataStore.clearAllNotesAndConnections).toHaveBeenCalled();
      expect(mockDataStore.updateNotesAndConnections).toHaveBeenCalledWith(
        loadedState,
      );
    });

    it('should skip loading when state already loaded', async () => {
      const freshStorageManager = await import(
        '../../../src/js/data/storageManager.js'
      );

      // Load once to set the flag
      mockAppState.getState.mockReturnValue({ notes: [], connections: [] });
      mockAppState.loadFromLocalStorage.mockReturnValue(true);
      freshStorageManager.loadStateFromStorage();

      // Clear mocks and try to load again
      jest.clearAllMocks();

      const result = freshStorageManager.loadStateFromStorage();

      expect(result).toBe(false);
      expect(mockAppState.loadFromLocalStorage).not.toHaveBeenCalled();
    });

    it('should skip loading when current state is not empty', async () => {
      const freshStorageManager = await import(
        '../../../src/js/data/storageManager.js'
      );

      mockAppState.getState.mockReturnValue({
        notes: [{ id: '1' }],
        connections: [],
      });

      const result = freshStorageManager.loadStateFromStorage();

      expect(result).toBe(false);
      expect(mockAppState.loadFromLocalStorage).not.toHaveBeenCalled();
    });

    it('should return false when localStorage loading fails', async () => {
      const freshStorageManager = await import(
        '../../../src/js/data/storageManager.js'
      );

      mockAppState.getState.mockReturnValue({ notes: [], connections: [] });
      mockAppState.loadFromLocalStorage.mockReturnValue(false);

      const result = freshStorageManager.loadStateFromStorage();

      expect(result).toBe(false);
    });
  });

  describe('clearStateFromStorage', () => {
    it('should clear localStorage and reset state', () => {
      storageManager.clearStateFromStorage();

      expect(mockAppState.clearLocalStorage).toHaveBeenCalled();
      expect(mockAppState.setState).toHaveBeenCalledWith({
        notes: [],
        connections: [],
        zoomLevel: 5,
        colorState: {
          currentColor: 'yellow',
          notes: {},
        },
      });
      expect(mockDataStore.clearAllNotesAndConnections).toHaveBeenCalled();
    });

    it('should include colorState in reset state', () => {
      storageManager.clearStateFromStorage();

      const resetState = mockAppState.setState.mock.calls[0][0];
      expect(resetState.colorState).toEqual({
        currentColor: 'yellow',
        notes: {},
      });
    });
  });

  describe('setupStateListeners', () => {
    beforeEach(() => {
      // Mock DOM methods
      global.document = {
        addEventListener: jest.fn(),
      };
      global.setInterval = jest.fn();
    });

    it('should set up DOM event listeners', () => {
      storageManager.setupStateListeners();

      expect(document.addEventListener).toHaveBeenCalledWith(
        'noteCreated',
        expect.any(Function),
      );
      expect(document.addEventListener).toHaveBeenCalledWith(
        'noteContentChanged',
        expect.any(Function),
      );
      expect(document.addEventListener).toHaveBeenCalledWith(
        'noteMoveEnd',
        expect.any(Function),
      );
      expect(document.addEventListener).toHaveBeenCalledWith(
        'connectorAdded',
        expect.any(Function),
      );
      expect(document.addEventListener).toHaveBeenCalledWith(
        'connectorRemoved',
        expect.any(Function),
      );
    });

    it('should set up backup interval', () => {
      storageManager.setupStateListeners();

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('should use debounced save for content changes', () => {
      const mockDebouncedFn = jest.fn();
      mockUtils.debounce.mockReturnValue(mockDebouncedFn);

      storageManager.setupStateListeners();

      expect(mockUtils.debounce).toHaveBeenCalledWith(
        expect.any(Function),
        300,
      );
    });
  });

  describe('initializeStateManagement', () => {
    beforeEach(() => {
      global.window = {
        addEventListener: jest.fn(),
      };
      mockAppState.getState.mockReturnValue({ notes: [] });
    });

    it('should set up beforeunload listener in browser environment', () => {
      storageManager.initializeStateManagement();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      );
    });

    it('should set up event bus listeners', () => {
      storageManager.initializeStateManagement();

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'state.save',
        expect.any(Function),
      );
    });

    it('should attempt to load state when state is empty', () => {
      mockAppState.getState.mockReturnValue({ notes: [] });
      mockAppState.loadFromLocalStorage.mockReturnValue(true);

      storageManager.initializeStateManagement();

      expect(mockAppState.loadFromLocalStorage).toHaveBeenCalled();
    });

    it('should not load state when notes already exist', () => {
      mockAppState.getState.mockReturnValue({ notes: [{ id: '1' }] });

      storageManager.initializeStateManagement();

      expect(mockAppState.loadFromLocalStorage).not.toHaveBeenCalled();
    });
  });

  describe('shouldRestoreState', () => {
    it('should return true when conditions are met for restoration', async () => {
      const freshStorageManager = await import(
        '../../../src/js/data/storageManager.js'
      );

      mockAppState.getState.mockReturnValue({ notes: [] });
      mockAppState.hasStoredState.mockReturnValue(true);

      const result = freshStorageManager.shouldRestoreState();

      expect(result).toBe(true);
      expect(mockAppState.hasStoredState).toHaveBeenCalled();
    });

    it('should return false when no stored state exists', async () => {
      const freshStorageManager = await import(
        '../../../src/js/data/storageManager.js'
      );

      mockAppState.getState.mockReturnValue({ notes: [] });
      mockAppState.hasStoredState.mockReturnValue(false);

      const result = freshStorageManager.shouldRestoreState();

      expect(result).toBe(false);
    });

    it('should return false when current state is not empty', async () => {
      const freshStorageManager = await import(
        '../../../src/js/data/storageManager.js'
      );

      mockAppState.getState.mockReturnValue({ notes: [{ id: '1' }] });
      mockAppState.hasStoredState.mockReturnValue(true);

      const result = freshStorageManager.shouldRestoreState();

      expect(result).toBe(false);
    });
  });

  describe('clearAllState', () => {
    it('should delegate to clearStateFromStorage', () => {
      const clearStateFromStorageSpy = jest.spyOn(
        storageManager,
        'clearStateFromStorage',
      );

      storageManager.clearAllState();

      expect(clearStateFromStorageSpy).toHaveBeenCalled();
    });
  });

  describe('event integration', () => {
    it('should handle state.save events through event bus', () => {
      storageManager.initializeStateManagement();

      // Find the state.save event handler
      const saveHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'state.save',
      )[1];

      expect(saveHandler).toBeDefined();
      expect(typeof saveHandler).toBe('function');
    });

    it('should use debounced save for frequent content changes', () => {
      const mockDebouncedSave = jest.fn();
      mockUtils.debounce.mockReturnValue(mockDebouncedSave);

      storageManager.setupStateListeners();

      expect(mockUtils.debounce).toHaveBeenCalledWith(
        expect.any(Function),
        300,
      );
    });
  });

  describe('browser environment detection', () => {
    it('should handle non-browser environments gracefully', () => {
      const originalWindow = global.window;
      delete global.window;

      expect(() => {
        storageManager.initializeStateManagement();
      }).not.toThrow();

      global.window = originalWindow;
    });
  });
});
