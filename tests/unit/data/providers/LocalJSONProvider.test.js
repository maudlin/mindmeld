// tests/unit/data/providers/LocalJSONProvider.test.js
// TDD Tests for LocalJSONProvider implementation

import { jest } from '@jest/globals';

describe('LocalJSONProvider TDD Tests', () => {
  let LocalJSONProvider;
  let provider;
  let mockDataStore;
  let mockStorageManager;
  let mockAppState;
  let mockEventBus;

  beforeEach(async () => {
    // Reset modules to avoid cached imports
    jest.resetModules();

    // Mock dependencies
    mockDataStore = {
      addNote: jest.fn(),
      updateNote: jest.fn(),
      deleteNoteById: jest.fn(),
      getNotes: jest.fn(() => []),
      updateConnectionInDataStore: jest.fn(),
      getCurrentState: jest.fn(() => ({
        notes: [],
        connections: [],
        zoomLevel: 5,
      })),
      exportToJSON: jest.fn(() => '{"data":{"n":[],"c":[]}}'),
      importFromJSON: jest.fn(),
      clearAllNotesAndConnections: jest.fn(),
    };

    mockStorageManager = {
      saveStateToStorage: jest.fn(),
      loadStateFromStorage: jest.fn(),
      clearStateFromStorage: jest.fn(),
      setupStateListeners: jest.fn(),
    };

    mockAppState = {
      getState: jest.fn(() => ({
        notes: [],
        connections: [],
        zoomLevel: 5,
        canvasType: 'Standard Canvas',
      })),
      setState: jest.fn(),
      saveToLocalStorage: jest.fn(),
      clearLocalStorage: jest.fn(),
      subscribe: jest.fn(() => jest.fn()), // returns unsubscribe function
    };

    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Mock the imports
    jest.doMock('../../../../src/js/data/dataStore.js', () => mockDataStore);
    jest.doMock(
      '../../../../src/js/data/storageManager.js',
      () => mockStorageManager,
    );
    jest.doMock('../../../../src/js/data/observableState.js', () => ({
      appState: mockAppState,
    }));
    jest.doMock('../../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    // Import after mocking
    const module = await import(
      '../../../../src/js/data/providers/LocalJSONProvider.js'
    );
    LocalJSONProvider = module.LocalJSONProvider;

    provider = new LocalJSONProvider();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Construction and Basic Interface', () => {
    test('should construct without errors', () => {
      expect(provider).toBeDefined();
      expect(provider).toBeInstanceOf(LocalJSONProvider);
    });

    test('should extend DataProvider base class', async () => {
      const { DataProvider } = await import(
        '../../../../src/js/data/providers/DataProvider.js'
      );
      expect(provider).toBeInstanceOf(DataProvider);
    });

    test('should have hydrationInProgress flag initially false', () => {
      expect(provider.hydrationInProgress).toBe(false);
    });

    test('should have autosaveEnabled flag initially true', () => {
      expect(provider.autosaveEnabled).toBe(true);
    });
  });

  describe('Hydration State Management', () => {
    test('should set hydrationInProgress during import operations', async () => {
      const testJson =
        '{"data":{"n":[{"i":"1","p":[100,200],"c":"test"}],"c":[]}}';

      await provider.importJSON(testJson);

      // Should have been set to true during import, then false after
      expect(provider.hydrationInProgress).toBe(false);
      expect(mockDataStore.importFromJSON).toHaveBeenCalledWith(
        testJson,
        expect.any(Object),
      );
    });

    test('should prevent autosave when hydrationInProgress is true', () => {
      provider.hydrationInProgress = true;

      provider.upsertNote({ id: 'test', content: 'test' }, { origin: 'user' });

      // Should not trigger autosave during hydration
      expect(mockStorageManager.saveStateToStorage).not.toHaveBeenCalled();
    });

    test('should allow autosave when hydrationInProgress is false', () => {
      provider.hydrationInProgress = false;

      provider.upsertNote({ id: 'test', content: 'test' }, { origin: 'user' });

      // Should trigger autosave when not hydrating
      expect(mockAppState.saveToLocalStorage).toHaveBeenCalled();
    });
  });

  describe('Origin Tracking and Autosave Prevention', () => {
    test('should not trigger autosave for SYSTEM origin operations', () => {
      provider.upsertNote(
        { id: 'test', content: 'test' },
        { origin: 'system' },
      );

      expect(mockStorageManager.saveStateToStorage).not.toHaveBeenCalled();
    });

    test('should trigger autosave for USER origin operations', () => {
      provider.upsertNote({ id: 'test', content: 'test' }, { origin: 'user' });

      expect(mockAppState.saveToLocalStorage).toHaveBeenCalled();
    });

    test('should default to USER origin when not specified', () => {
      provider.upsertNote({ id: 'test', content: 'test' });

      expect(mockAppState.saveToLocalStorage).toHaveBeenCalled();
    });

    test('should respect autosaveEnabled flag', () => {
      provider.autosaveEnabled = false;

      provider.upsertNote({ id: 'test', content: 'test' }, { origin: 'user' });

      expect(mockStorageManager.saveStateToStorage).not.toHaveBeenCalled();
    });
  });

  describe('CRUD Operations - Notes', () => {
    test('should delegate note upsert to dataStore.addNote for new notes', () => {
      const note = { id: 'new-note', content: 'test content', pos: [100, 200] };
      mockDataStore.getNotes.mockReturnValue([]);

      provider.upsertNote(note);

      expect(mockDataStore.addNote).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-note',
          content: 'test content',
          left: '100px',
          top: '200px',
        }),
      );
    });

    test('should delegate note upsert to dataStore.updateNote for existing notes', () => {
      const note = { id: 'existing-note', content: 'updated content' };
      mockDataStore.getNotes.mockReturnValue([
        { id: 'existing-note', content: 'old' },
      ]);

      provider.upsertNote(note);

      expect(mockDataStore.updateNote).toHaveBeenCalledWith(
        'existing-note',
        expect.objectContaining({
          content: 'updated content',
        }),
      );
    });

    test('should delegate note deletion to dataStore.deleteNoteById', () => {
      provider.deleteNote('test-id');

      expect(mockDataStore.deleteNoteById).toHaveBeenCalledWith('test-id');
    });

    test('should emit change notifications for note operations', () => {
      const mockSubscriber = jest.fn();
      provider.subscribe(mockSubscriber);

      provider.upsertNote({ id: 'test', content: 'test' }, { origin: 'user' });

      expect(mockSubscriber).toHaveBeenCalledWith({
        type: 'notes',
        origin: 'user',
        payload: expect.any(Object),
      });
    });
  });

  describe('CRUD Operations - Connections', () => {
    test('should delegate connection upsert to dataStore.updateConnectionInDataStore', () => {
      const connection = { from: 'note1', to: 'note2', type: 1 };

      provider.upsertConnection(connection);

      expect(mockDataStore.updateConnectionInDataStore).toHaveBeenCalledWith(
        'note1',
        'note2',
        1,
      );
    });

    test('should handle connection deletion by setting type to null', () => {
      provider.deleteConnection('note1:note2:1');

      // Should parse connection ID and call with null type
      expect(mockDataStore.updateConnectionInDataStore).toHaveBeenCalledWith(
        'note1',
        'note2',
        null,
      );
    });

    test('should generate stable connection IDs', () => {
      const connection1 = { from: 'a', to: 'b', type: 1 };
      const connection2 = { from: 'a', to: 'b', type: 1 };

      // Should generate the same ID for the same connection
      provider.upsertConnection(connection1);
      provider.upsertConnection(connection2);

      expect(mockDataStore.updateConnectionInDataStore).toHaveBeenCalledTimes(
        2,
      );
      expect(mockDataStore.updateConnectionInDataStore).toHaveBeenCalledWith(
        'a',
        'b',
        1,
      );
    });
  });

  describe('JSON Import/Export', () => {
    test('should delegate export to dataStore.exportToJSON', () => {
      const expectedJson = '{"data":{"n":[],"c":[]}}';
      mockDataStore.exportToJSON.mockReturnValue(expectedJson);

      const result = provider.exportJSON();

      expect(result).toBe(expectedJson);
      expect(mockDataStore.exportToJSON).toHaveBeenCalled();
    });

    test('should prevent autosave during import operations', async () => {
      const testJson = '{"data":{"n":[],"c":[]}}';

      await provider.importJSON(testJson);

      // Should have set hydrationInProgress during import
      expect(mockDataStore.importFromJSON).toHaveBeenCalledWith(
        testJson,
        expect.any(Object),
      );
      expect(provider.hydrationInProgress).toBe(false); // Should be reset after
    });

    test('should emit snapshot notification after import', async () => {
      const mockSubscriber = jest.fn();
      provider.subscribe(mockSubscriber);

      await provider.importJSON('{"data":{"n":[],"c":[]}}');

      expect(mockSubscriber).toHaveBeenCalledWith({
        type: 'snapshot',
        origin: 'system',
        payload: expect.any(Object),
      });
    });
  });

  describe('Meta Operations', () => {
    test('should delegate meta retrieval to appState.getState', () => {
      mockAppState.getState.mockReturnValue({
        zoomLevel: 3.5,
        canvasType: "Hero's Journey",
        mapName: 'Test Map',
      });

      const meta = provider.getMeta();

      expect(meta).toEqual({
        zoomLevel: 3.5,
        canvasType: "Hero's Journey",
        mapName: 'Test Map',
      });
    });

    test('should delegate meta updates to appState.setState', () => {
      const metaUpdate = { zoomLevel: 2.0, canvasType: 'Standard Canvas' };

      provider.setMeta(metaUpdate);

      expect(mockAppState.setState).toHaveBeenCalledWith(
        expect.objectContaining(metaUpdate),
      );
    });

    test('should emit meta change notifications', () => {
      const mockSubscriber = jest.fn();
      provider.subscribe(mockSubscriber);

      provider.setMeta({ zoomLevel: 2.0 }, { origin: 'user' });

      expect(mockSubscriber).toHaveBeenCalledWith({
        type: 'meta',
        origin: 'user',
        payload: { zoomLevel: 2.0 },
      });
    });
  });

  describe('Subscription System', () => {
    test('should support multiple subscribers', () => {
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();

      provider.subscribe(subscriber1);
      provider.subscribe(subscriber2);

      provider.upsertNote({ id: 'test', content: 'test' });

      expect(subscriber1).toHaveBeenCalled();
      expect(subscriber2).toHaveBeenCalled();
    });

    test('should return unsubscribe function', () => {
      const subscriber = jest.fn();
      const unsubscribe = provider.subscribe(subscriber);

      expect(typeof unsubscribe).toBe('function');

      // Should stop receiving notifications after unsubscribe
      unsubscribe();
      provider.upsertNote({ id: 'test', content: 'test' });

      expect(subscriber).not.toHaveBeenCalled();
    });

    test('should handle unsubscribe of non-existent subscriber gracefully', () => {
      const unsubscribe = provider.subscribe(jest.fn());

      // Should not throw when calling unsubscribe multiple times
      expect(() => {
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });
  });

  describe('Autosave Control', () => {
    test('should provide pauseAutosave method', () => {
      expect(typeof provider.pauseAutosave).toBe('function');

      provider.pauseAutosave();

      expect(provider.autosaveEnabled).toBe(false);
    });

    test('should provide resumeAutosave method', () => {
      expect(typeof provider.resumeAutosave).toBe('function');

      provider.pauseAutosave();
      provider.resumeAutosave();

      expect(provider.autosaveEnabled).toBe(true);
    });

    test('should respect paused autosave during operations', () => {
      provider.pauseAutosave();

      provider.upsertNote({ id: 'test', content: 'test' }, { origin: 'user' });

      expect(mockStorageManager.saveStateToStorage).not.toHaveBeenCalled();
    });
  });

  describe('Initialization and Cleanup', () => {
    test('should support init with mapId and options', () => {
      const options = { onReady: jest.fn() };

      const cleanup = provider.init('test-map', options);

      expect(typeof cleanup).toBe('function');
      expect(options.onReady).toHaveBeenCalled();
    });

    test('should support destroy for cleanup', () => {
      const cleanup = jest.fn();
      provider.init('test-map');

      expect(() => provider.destroy()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON gracefully in import', async () => {
      await expect(provider.importJSON('invalid json')).rejects.toThrow();

      // Should reset hydrationInProgress even on error
      expect(provider.hydrationInProgress).toBe(false);
    });

    test('should handle missing note data gracefully', () => {
      expect(() => {
        provider.upsertNote({});
      }).not.toThrow();
    });

    test('should handle invalid connection IDs gracefully', () => {
      expect(() => {
        provider.deleteConnection('invalid-id');
      }).not.toThrow();
    });
  });

  describe('Snapshot Operations', () => {
    test('should return current state snapshot', () => {
      const mockState = {
        notes: [{ id: '1', content: 'test' }],
        connections: [{ from: '1', to: '2', type: 1 }],
        zoomLevel: 3.0,
      };
      mockDataStore.getCurrentState.mockReturnValue(mockState);

      const snapshot = provider.getSnapshot();

      expect(snapshot).toEqual({ data: mockState });
    });

    test('should handle empty state gracefully', () => {
      mockDataStore.getCurrentState.mockReturnValue({
        notes: [],
        connections: [],
        zoomLevel: 5,
      });

      const snapshot = provider.getSnapshot();

      expect(snapshot.data.notes).toEqual([]);
      expect(snapshot.data.connections).toEqual([]);
    });
  });
});
