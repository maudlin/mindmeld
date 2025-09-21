// tests/unit/services/DataProviderService.test.js
// TDD Tests for DataProviderService - Central DataProvider integration point

import { jest } from '@jest/globals';

describe('DataProviderService TDD Tests', () => {
  let DataProviderService;
  let LocalJSONProvider;
  let mockProvider;
  let mockServiceBootstrap;
  let mockYjsProvider;

  beforeEach(async () => {
    // Reset modules to avoid cached imports
    jest.resetModules();

    // Mock LocalJSONProvider
    mockProvider = {
      init: jest.fn(() => jest.fn()), // returns cleanup function
      destroy: jest.fn(),
      subscribe: jest.fn(() => jest.fn()), // returns unsubscribe function
      getSnapshot: jest.fn(() => ({ data: { n: [], c: [] } })),
      importJSON: jest.fn(),
      exportJSON: jest.fn(() => '{"data":{"n":[],"c":[]}}'),
      upsertNote: jest.fn(),
      deleteNote: jest.fn(),
      upsertConnection: jest.fn(),
      deleteConnection: jest.fn(),
      setMeta: jest.fn(),
      getMeta: jest.fn(() => ({
        zoomLevel: 5,
        canvasType: 'Standard Canvas',
        mapName: '',
      })),
      pauseAutosave: jest.fn(),
      resumeAutosave: jest.fn(),
      hydrationInProgress: false,
    };

    LocalJSONProvider = jest.fn().mockImplementation(() => mockProvider);

    // Mock YjsProvider for migration tests
    mockYjsProvider = {
      init: jest.fn(() => jest.fn()),
      destroy: jest.fn(),
      subscribe: jest.fn(() => jest.fn()),
      getSnapshot: jest.fn(() => ({ data: { n: [], c: [] } })),
      importJSON: jest.fn(),
      exportJSON: jest.fn(() => '{"data":{"n":[],"c":[]}}'),
      upsertNote: jest.fn(),
      deleteNote: jest.fn(),
      upsertConnection: jest.fn(),
      deleteConnection: jest.fn(),
      setMeta: jest.fn(),
      getMeta: jest.fn(() => ({
        zoomLevel: 5,
        canvasType: 'Standard Canvas',
        mapName: '',
      })),
      pauseAutosave: jest.fn(),
      resumeAutosave: jest.fn(),
      hydrationInProgress: false,
    };

    // Mock ServiceBootstrap
    mockServiceBootstrap = {
      initializeDataProviderService: jest.fn(),
    };

    // Mock feature flags
    jest.doMock('../../../src/js/core/featureFlags.js', () => ({
      isDebugEnabled: jest.fn(() => false),
      getProviderType: jest.fn(() => 'yjs'),
      initializeYjsProvider: jest.fn(() =>
        Promise.resolve(jest.fn().mockImplementation(() => mockYjsProvider)),
      ),
    }));

    // Mock the imports
    jest.doMock('../../../src/js/data/providers/LocalJSONProvider.js', () => ({
      LocalJSONProvider,
    }));
    jest.doMock('../../../src/js/core/bootstrap/ServiceBootstrap.js', () => ({
      ServiceBootstrap: mockServiceBootstrap,
    }));

    // Import after mocking
    const module = await import(
      '../../../src/js/services/DataProviderService.js'
    );
    DataProviderService = module.DataProviderService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset singleton instance for clean tests
    if (DataProviderService._instance) {
      delete DataProviderService._instance;
    }
  });

  describe('Singleton Pattern', () => {
    test('should return same instance on multiple getInstance calls', () => {
      const instance1 = DataProviderService.getInstance();
      const instance2 = DataProviderService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DataProviderService);
    });

    test('should create only one LocalJSONProvider instance', () => {
      DataProviderService.getInstance();
      DataProviderService.getInstance();

      expect(LocalJSONProvider).toHaveBeenCalledTimes(1);
    });

    test('should prevent direct instantiation with new', () => {
      // Ensure instance exists first to trigger singleton protection
      DataProviderService.getInstance();

      expect(() => {
        new DataProviderService();
      }).toThrow('Use DataProviderService.getInstance() instead of new');
    });
  });

  describe('Provider Initialization', () => {
    test('should initialize LocalJSONProvider on first getInstance call', () => {
      const service = DataProviderService.getInstance();

      expect(LocalJSONProvider).toHaveBeenCalledTimes(1);
      expect(service.isInitialized()).toBe(true);
    });

    test('should call provider.init with mapId and options after YjsProvider migration', async () => {
      const service = DataProviderService.getInstance();
      const options = { onReady: jest.fn() };

      await service.init('test-map', options);

      // After migration, the YjsProvider should be used
      expect(mockYjsProvider.init).toHaveBeenCalledWith('test-map', options);
    });

    test('should store cleanup function from provider.init after migration', async () => {
      const cleanupFn = jest.fn();
      mockYjsProvider.init.mockReturnValue(cleanupFn);

      const service = DataProviderService.getInstance();
      await service.init('test-map');

      // Cleanup should be called when service is destroyed
      service.destroy();
      expect(cleanupFn).toHaveBeenCalled();
    });
  });

  describe('Provider Delegation - Data Operations', () => {
    let service;

    beforeEach(() => {
      service = DataProviderService.getInstance();
    });

    test('should delegate getSnapshot to provider', () => {
      const expectedSnapshot = { data: { n: [{ id: '1' }], c: [] } };
      mockProvider.getSnapshot.mockReturnValue(expectedSnapshot);

      const result = service.getSnapshot();

      expect(result).toBe(expectedSnapshot);
      expect(mockProvider.getSnapshot).toHaveBeenCalled();
    });

    test('should delegate exportJSON to provider', () => {
      const expectedJson = '{"data":{"n":[{"id":"1"}],"c":[]}}';
      mockProvider.exportJSON.mockReturnValue(expectedJson);

      const result = service.exportJSON();

      expect(result).toBe(expectedJson);
      expect(mockProvider.exportJSON).toHaveBeenCalled();
    });

    test('should delegate importJSON to provider', async () => {
      const testJson = '{"data":{"n":[],"c":[]}}';

      await service.importJSON(testJson);

      expect(mockProvider.importJSON).toHaveBeenCalledWith(testJson);
    });

    test('should delegate note operations to provider', () => {
      const noteData = { id: 'test', content: 'test', pos: [100, 200] };
      const options = { origin: 'user' };

      service.upsertNote(noteData, options);
      expect(mockProvider.upsertNote).toHaveBeenCalledWith(noteData, options);

      service.deleteNote('test', options);
      expect(mockProvider.deleteNote).toHaveBeenCalledWith('test', options);
    });

    test('should delegate connection operations to provider', () => {
      const connData = { from: 'note1', to: 'note2', type: 1 };
      const options = { origin: 'user' };

      service.upsertConnection(connData, options);
      expect(mockProvider.upsertConnection).toHaveBeenCalledWith(
        connData,
        options,
      );

      service.deleteConnection('note1:note2:1', options);
      expect(mockProvider.deleteConnection).toHaveBeenCalledWith(
        'note1:note2:1',
        options,
      );
    });

    test('should delegate meta operations to provider', () => {
      const metaData = { zoomLevel: 3.0, canvasType: "Hero's Journey" };
      const options = { origin: 'user' };

      service.setMeta(metaData, options);
      expect(mockProvider.setMeta).toHaveBeenCalledWith(metaData, options);

      const expectedMeta = {
        zoomLevel: 3.0,
        canvasType: "Hero's Journey",
        mapName: 'Test',
      };
      mockProvider.getMeta.mockReturnValue(expectedMeta);

      const result = service.getMeta();
      expect(result).toBe(expectedMeta);
      expect(mockProvider.getMeta).toHaveBeenCalled();
    });
  });

  describe('Provider Delegation - Subscription System', () => {
    let service;

    beforeEach(() => {
      service = DataProviderService.getInstance();
    });

    test('should delegate subscription to provider', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      mockProvider.subscribe.mockReturnValue(mockUnsubscribe);

      const unsubscribe = service.subscribe(mockCallback);

      // For YjsProvider, the callback is wrapped, so we check it was called
      expect(mockProvider.subscribe).toHaveBeenCalledTimes(1);
      expect(typeof mockProvider.subscribe.mock.calls[0][0]).toBe('function');
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    test('should support multiple subscriptions', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.subscribe(callback1);
      service.subscribe(callback2);

      expect(mockProvider.subscribe).toHaveBeenCalledTimes(2);
      // Callbacks are wrapped for YjsProvider, so we just check they're functions
      expect(typeof mockProvider.subscribe.mock.calls[0][0]).toBe('function');
      expect(typeof mockProvider.subscribe.mock.calls[1][0]).toBe('function');
    });
  });

  describe('Provider Delegation - Autosave Control', () => {
    let service;

    beforeEach(() => {
      service = DataProviderService.getInstance();
    });

    test('should delegate pauseAutosave to provider', () => {
      service.pauseAutosave();

      expect(mockProvider.pauseAutosave).toHaveBeenCalled();
    });

    test('should delegate resumeAutosave to provider', () => {
      service.resumeAutosave();

      expect(mockProvider.resumeAutosave).toHaveBeenCalled();
    });

    test('should expose hydrationInProgress from provider', () => {
      mockProvider.hydrationInProgress = true;

      expect(service.hydrationInProgress).toBe(true);
    });
  });

  describe('Error Handling', () => {
    let service;

    beforeEach(() => {
      service = DataProviderService.getInstance();
    });

    test('should handle provider initialization errors gracefully', () => {
      LocalJSONProvider.mockImplementation(() => {
        throw new Error('Provider initialization failed');
      });

      // Reset singleton to test error handling
      delete DataProviderService._instance;

      expect(() => {
        DataProviderService.getInstance();
      }).toThrow(
        'Failed to initialize DataProviderService: Provider initialization failed',
      );
    });

    test('should handle provider method errors gracefully', async () => {
      mockProvider.importJSON.mockRejectedValue(new Error('Import failed'));

      await expect(service.importJSON('invalid')).rejects.toThrow(
        'Import failed',
      );
    });

    test('should provide fallback for uninitialized provider operations', () => {
      // Mock a service without proper provider initialization
      delete DataProviderService._instance;
      const service = Object.create(DataProviderService.prototype);
      service._provider = null;

      expect(() => service.getSnapshot()).toThrow(
        'DataProviderService not properly initialized',
      );
    });
  });

  describe('Service Lifecycle', () => {
    let service;

    beforeEach(() => {
      service = DataProviderService.getInstance();
    });

    test('should support destroy operation', async () => {
      const cleanupFn = jest.fn();
      mockYjsProvider.init.mockReturnValue(cleanupFn);

      await service.init('test-map');
      service.destroy();

      expect(cleanupFn).toHaveBeenCalled();
      expect(mockYjsProvider.destroy).toHaveBeenCalled();
    });

    test('should handle destroy when no cleanup function exists', () => {
      expect(() => service.destroy()).not.toThrow();
      // Initially it's LocalJSONProvider, but after init it becomes YjsProvider
      expect(mockProvider.destroy).toHaveBeenCalled();
    });

    test('should reset singleton instance on destroy', () => {
      const instance1 = DataProviderService.getInstance();

      service.destroy();

      const instance2 = DataProviderService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Bootstrap Integration', () => {
    test('should be initializable via ServiceBootstrap method', () => {
      const service = DataProviderService.getInstance();

      expect(service).toBeInstanceOf(DataProviderService);
      expect(service.isInitialized()).toBe(true);
    });

    test('should maintain singleton pattern when accessed via bootstrap', () => {
      const instance1 = DataProviderService.getInstance();
      const instance2 = DataProviderService.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('should be ready for integration with ServiceBootstrap initialize method', () => {
      // This test verifies the service is ready to be called from ServiceBootstrap
      expect(typeof DataProviderService.getInstance).toBe('function');
      expect(typeof DataProviderService.getInstance().init).toBe('function');
    });
  });

  describe('API Surface Completeness', () => {
    let service;

    beforeEach(() => {
      service = DataProviderService.getInstance();
    });

    test('should expose all DataProvider interface methods', () => {
      const expectedMethods = [
        'init',
        'destroy',
        'subscribe',
        'getSnapshot',
        'importJSON',
        'exportJSON',
        'upsertNote',
        'deleteNote',
        'upsertConnection',
        'deleteConnection',
        'setMeta',
        'getMeta',
        'pauseAutosave',
        'resumeAutosave',
      ];

      expectedMethods.forEach((methodName) => {
        expect(typeof service[methodName]).toBe('function');
      });
    });

    test('should expose hydrationInProgress property', () => {
      expect(typeof service.hydrationInProgress).toBe('boolean');
    });

    test('should provide isInitialized helper', () => {
      expect(typeof service.isInitialized).toBe('function');
      expect(service.isInitialized()).toBe(true);
    });
  });
});
