// tests/unit/services/serverClient.mapManagement.test.js

describe('ServerClient - Map Management', () => {
  let ServerClient;
  let mockEventBus;
  let mockServerConnectionService;
  let mockDataStore;
  let mockFetch;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    mockServerConnectionService = {
      getServerUri: jest.fn(),
      getConnectionState: jest.fn(),
      validateServerUri: jest.fn(),
      setConnectionStatus: jest.fn(),
    };

    mockDataStore = {
      exportToJSON: jest.fn(),
      importFromJSON: jest.fn(),
    };

    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock dependencies before importing
    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/services/serverConnectionService.js', () => ({
      ServerConnectionService: mockServerConnectionService,
    }));

    jest.doMock('../../../src/js/services/connectionService.js', () => ({
      ConnectionService: {
        initializeConnectionDrawing: jest.fn(),
        connectionManager: {}, // Non-null to satisfy areServicesReady()
      },
    }));

    jest.doMock('../../../src/js/data/dataStore.js', () => mockDataStore);

    jest.doMock('../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
      debounce: jest.fn((fn) => fn),
    }));

    // Import the module to test
    const module = await import('../../../src/js/services/serverClient.js');
    ServerClient = module.ServerClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  describe('getMaps()', () => {
    beforeEach(() => {
      mockServerConnectionService.getServerUri.mockReturnValue(
        'https://api.example.com',
      );
    });

    it('should fetch maps list with metadata', async () => {
      const mockMaps = [
        {
          id: 'map-1',
          name: 'Project Alpha',
          createdAt: '2025-09-01T10:00:00Z',
          updatedAt: '2025-09-08T15:30:00Z',
          noteCount: 15,
          connectionCount: 8,
        },
        {
          id: 'map-2',
          name: 'Personal Notes',
          createdAt: '2025-09-05T12:00:00Z',
          updatedAt: '2025-09-07T09:15:00Z',
          noteCount: 6,
          connectionCount: 3,
        },
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          maps: mockMaps,
          totalCount: 2,
          hasMore: false,
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ServerClient.getMaps();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/maps?limit=25',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      );
      expect(result).toEqual({
        maps: mockMaps,
        totalCount: 2,
        hasMore: false,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockMaps = Array.from({ length: 10 }, (_, i) => ({
        id: `map-${i}`,
        name: `Map ${i}`,
        updatedAt: new Date().toISOString(),
        noteCount: 5,
        connectionCount: 2,
      }));

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          maps: mockMaps,
          totalCount: 50,
          hasMore: true,
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ServerClient.getMaps({ limit: 10, offset: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/maps?limit=10&offset=20',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      );
      expect(result.hasMore).toBe(true);
      expect(result.maps).toHaveLength(10);
    });

    it('should cache results appropriately', async () => {
      const mockMaps = [
        {
          id: 'map-1',
          name: 'Test Map',
          updatedAt: '2025-09-08T15:30:00Z',
          noteCount: 5,
          connectionCount: 2,
        },
      ];
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest
          .fn()
          .mockResolvedValue({ maps: mockMaps, totalCount: 1, hasMore: false }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // First call
      const result1 = await ServerClient.getMaps();
      // Second call within cache time
      const result2 = await ServerClient.getMaps();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should handle server errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({
          detail: 'Database connection failed',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(ServerClient.getMaps()).rejects.toThrow(
        'Database connection failed',
      );
      expect(
        mockServerConnectionService.setConnectionStatus,
      ).toHaveBeenCalledWith('error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.maps.error', {
        error: 'Database connection failed',
      });
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      await expect(ServerClient.getMaps()).rejects.toThrow('Network timeout');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.maps.error', {
        error: 'Network timeout',
      });
    });

    it('should handle no server URI', async () => {
      mockServerConnectionService.getServerUri.mockReturnValue(null);

      await expect(ServerClient.getMaps()).rejects.toThrow(
        'No server configured',
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.maps.error', {
        error: 'No server configured',
      });
    });

    it('should support search filtering', async () => {
      const mockMaps = [
        {
          id: 'map-1',
          name: 'Search Result',
          updatedAt: '2025-09-08T15:30:00Z',
          noteCount: 3,
          connectionCount: 1,
        },
      ];
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest
          .fn()
          .mockResolvedValue({ maps: mockMaps, totalCount: 1, hasMore: false }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.getMaps({ search: 'project' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/maps?limit=25&search=project',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      );
    });
  });

  describe('createNewMap()', () => {
    let mockMapSafetyService;

    beforeEach(() => {
      mockServerConnectionService.getServerUri.mockReturnValue(
        'https://api.example.com',
      );
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');

      // Mock MapSafetyService
      mockMapSafetyService = {
        ensureCurrentMapSaved: jest.fn().mockResolvedValue(true),
      };
      jest.doMock('../../../src/js/services/mapSafetyService.js', () => ({
        MapSafetyService: mockMapSafetyService,
      }));
    });

    it('should save current work before creating new map', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'new-map-123',
          name: 'My New Project',
          version: 1,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"new-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.createNewMap('My New Project');

      expect(mockMapSafetyService.ensureCurrentMapSaved).toHaveBeenCalled();
    });

    it('should create new map with custom name', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'new-map-123',
          name: 'Custom Project Name',
          version: 1,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"new-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ServerClient.createNewMap('Custom Project Name');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: expect.stringContaining('"name":"Custom Project Name"'),
      });

      expect(result).toEqual({
        id: 'new-map-123',
        name: 'Custom Project Name',
        version: 1,
      });
    });

    it('should update currentMapId and localStorage', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'new-map-456',
          name: 'Test Map',
          version: 1,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"test-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          setItem: jest.fn(),
          getItem: jest.fn(),
          removeItem: jest.fn(),
        },
      });

      await ServerClient.createNewMap('Test Map');

      expect(ServerClient.currentMapId).toBe('new-map-456');
      expect(ServerClient.currentETag).toBe('test-etag');
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'currentMapId',
        'new-map-456',
      );
    });

    it('should emit map.changed event', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'event-test-map',
          name: 'Event Test',
          version: 1,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"event-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.createNewMap('Event Test');

      expect(mockEventBus.emit).toHaveBeenCalledWith('map.changed', {
        mapId: 'event-test-map',
        mapName: 'Event Test',
        operation: 'create',
      });
    });

    it('should handle creation failures', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          detail: 'Invalid map name',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(ServerClient.createNewMap('Invalid Name')).rejects.toThrow(
        'Invalid map name',
      );
      expect(
        mockServerConnectionService.setConnectionStatus,
      ).toHaveBeenCalledWith('error');
    });

    it('should handle save failure before creation', async () => {
      mockMapSafetyService.ensureCurrentMapSaved.mockResolvedValue(false);

      await expect(ServerClient.createNewMap('Test Map')).rejects.toThrow(
        'Failed to save current map before creating new one',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use default name when no name provided', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'default-name-map',
          name: expect.stringMatching(
            /^MindMeld Map - \d{1,2}\/\d{1,2}\/\d{4}$/,
          ),
          version: 1,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"default-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.createNewMap();

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: expect.stringMatching(
          /"name":"MindMeld Map - \d{1,2}\/\d{1,2}\/\d{4}"/,
        ),
      });
    });

    it('should clear maps cache after creation', async () => {
      // Set up cache
      ServerClient.mapsCache = { maps: [{ id: 'old-map' }] };
      ServerClient.mapsCacheExpiry = Date.now() + 60000;

      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'cache-clear-map',
          name: 'Cache Test',
          version: 1,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"cache-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.createNewMap('Cache Test');

      expect(ServerClient.mapsCache).toBeNull();
      expect(ServerClient.mapsCacheExpiry).toBeNull();
    });
  });

  describe('loadMap()', () => {
    let mockMapSafetyService;
    let mockCanvas;

    beforeEach(() => {
      mockServerConnectionService.getServerUri.mockReturnValue(
        'https://api.example.com',
      );

      // Mock MapSafetyService
      mockMapSafetyService = {
        ensureCurrentMapSaved: jest.fn().mockResolvedValue(true),
        confirmMapOperation: jest.fn().mockResolvedValue(true),
      };
      jest.doMock('../../../src/js/services/mapSafetyService.js', () => ({
        MapSafetyService: mockMapSafetyService,
      }));

      // Mock canvas element (updated to match actual HTML id)
      mockCanvas = {
        id: 'canvas',
      };

      // Mock global document.getElementById
      global.document = global.document || {};
      global.document.getElementById = jest.fn().mockReturnValue(mockCanvas);
    });

    it('should confirm operation before loading', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 'target-map-123',
          name: 'Target Map',
          version: 1,
          data: { n: [], c: [] },
        }),
        headers: {
          get: jest.fn().mockReturnValue('"target-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.loadMap('target-map-123', { mapName: 'Target Map' });

      expect(mockMapSafetyService.confirmMapOperation).toHaveBeenCalledWith(
        'load-map',
        expect.objectContaining({
          mapId: null,
          mapName: 'Untitled Map',
          lastEditTime: null,
          lastSaveTime: null,
          isConnected: false,
        }),
        'Target Map',
      );
    });

    it('should save current work first', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 'load-test-map',
          name: 'Load Test',
          version: 1,
          data: { n: [], c: [] },
        }),
        headers: {
          get: jest.fn().mockReturnValue('"load-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.loadMap('load-test-map');

      expect(mockMapSafetyService.ensureCurrentMapSaved).toHaveBeenCalled();
    });

    it('should load and switch to new map', async () => {
      const testData = {
        n: [{ i: '1', p: [100, 200], c: 'Test note', cl: 'yellow' }],
        c: [['1', '2', 1]],
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 'switch-map-456',
          name: 'Switch Test',
          version: 2,
          data: testData,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"switch-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ServerClient.loadMap('switch-map-456');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/maps/switch-map-456',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      );

      expect(mockDataStore.importFromJSON).toHaveBeenCalledWith(
        JSON.stringify({ data: testData }),
        mockCanvas,
      );

      expect(result).toEqual({
        id: 'switch-map-456',
        name: 'Switch Test',
        version: 2,
        data: testData,
      });
    });

    it('should update currentMapId and localStorage', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 'storage-map-789',
          name: 'Storage Test',
          version: 1,
          data: { n: [], c: [] },
        }),
        headers: {
          get: jest.fn().mockReturnValue('"storage-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          setItem: jest.fn(),
          getItem: jest.fn(),
          removeItem: jest.fn(),
        },
      });

      await ServerClient.loadMap('storage-map-789');

      expect(ServerClient.currentMapId).toBe('storage-map-789');
      expect(ServerClient.currentETag).toBe('storage-etag');
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'currentMapId',
        'storage-map-789',
      );
    });

    it('should handle load failures gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          detail: 'Map not found',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(ServerClient.loadMap('nonexistent-map')).rejects.toThrow(
        'Map not found',
      );
      // Note: loadMap failures don't set connection status to 'error'
      // because the connection is still valid - just the map doesn't exist
      expect(
        mockServerConnectionService.setConnectionStatus,
      ).not.toHaveBeenCalledWith('error');
    });

    it('should handle confirmation rejection', async () => {
      mockMapSafetyService.confirmMapOperation.mockResolvedValue(false);

      const result = await ServerClient.loadMap('rejected-map', {
        mapName: 'Rejected',
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle save failure before loading', async () => {
      mockMapSafetyService.ensureCurrentMapSaved.mockResolvedValue(false);

      await expect(ServerClient.loadMap('save-fail-map')).rejects.toThrow(
        'Failed to save current map before loading',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should emit map.changed event on successful load', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 'event-map-999',
          name: 'Event Test Map',
          version: 1,
          data: { n: [], c: [] },
        }),
        headers: {
          get: jest.fn().mockReturnValue('"event-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.loadMap('event-map-999');

      expect(mockEventBus.emit).toHaveBeenCalledWith('map.changed', {
        mapId: 'event-map-999',
        mapName: 'Event Test Map',
        operation: 'load',
      });
    });

    it('should handle missing canvas element', async () => {
      global.document.getElementById.mockReturnValue(null);

      await expect(ServerClient.loadMap('canvas-test-map')).rejects.toThrow(
        'Canvas element not found',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('persistent map tracking', () => {
    beforeEach(() => {
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          setItem: jest.fn(),
          getItem: jest.fn(),
          removeItem: jest.fn(),
        },
      });
    });

    describe('saveCurrentMapIdToStorage()', () => {
      it('should save mapId to localStorage', () => {
        ServerClient.saveCurrentMapIdToStorage('test-map-123');

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'currentMapId',
          'test-map-123',
        );
      });

      it('should handle localStorage errors gracefully', () => {
        window.localStorage.setItem.mockImplementation(() => {
          throw new Error('Storage quota exceeded');
        });

        // Should not throw
        expect(() =>
          ServerClient.saveCurrentMapIdToStorage('test-map'),
        ).not.toThrow();
      });
    });

    describe('loadCurrentMapIdFromStorage()', () => {
      it('should load mapId from localStorage', () => {
        window.localStorage.getItem.mockReturnValue('saved-map-456');

        const result = ServerClient.loadCurrentMapIdFromStorage();

        expect(window.localStorage.getItem).toHaveBeenCalledWith(
          'currentMapId',
        );
        expect(result).toBe('saved-map-456');
      });

      it('should return null when no mapId stored', () => {
        window.localStorage.getItem.mockReturnValue(null);

        const result = ServerClient.loadCurrentMapIdFromStorage();

        expect(result).toBeNull();
      });

      it('should handle localStorage errors gracefully', () => {
        window.localStorage.getItem.mockImplementation(() => {
          throw new Error('localStorage not available');
        });

        const result = ServerClient.loadCurrentMapIdFromStorage();

        expect(result).toBeNull();
      });
    });

    describe('initializeMapPersistence()', () => {
      it('should load saved mapId on initialization', () => {
        window.localStorage.getItem.mockReturnValue('persistent-map-789');

        ServerClient.initializeMapPersistence();

        expect(ServerClient.currentMapId).toBe('persistent-map-789');
      });

      it('should handle no saved mapId gracefully', () => {
        window.localStorage.getItem.mockReturnValue(null);
        ServerClient.currentMapId = null;

        ServerClient.initializeMapPersistence();

        expect(ServerClient.currentMapId).toBeNull();
      });
    });

    describe('auto-load saved map on connection', () => {
      beforeEach(() => {
        mockServerConnectionService.getConnectionState.mockReturnValue({
          isConnected: true,
          serverUri: 'https://api.example.com',
        });
        mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');
      });

      it('should auto-load last map when canvas is empty and reconnecting', async () => {
        // Set up saved map ID
        window.localStorage.getItem.mockReturnValue('auto-load-map-999');

        // Mock empty canvas check
        ServerClient.isCanvasEmpty = jest.fn().mockReturnValue(true);

        // Mock loadState method
        ServerClient.loadState = jest.fn().mockResolvedValue(true);

        // Initialize with connection status change
        ServerClient.initialize();

        // Get the connection handler
        const connectionHandler = mockEventBus.on.mock.calls.find(
          (call) => call[0] === 'server.connection.status.changed',
        )?.[1];

        expect(connectionHandler).toBeDefined();

        // Trigger connection restored
        await connectionHandler({ isConnected: true });

        expect(ServerClient.loadState).toHaveBeenCalled();
      });

      it('should not auto-load when canvas has content', async () => {
        // Set up saved map ID
        window.localStorage.getItem.mockReturnValue('no-auto-load-map');

        // Mock non-empty canvas
        ServerClient.isCanvasEmpty = jest.fn().mockReturnValue(false);

        // Mock loadState method
        ServerClient.loadState = jest.fn().mockResolvedValue(true);

        // Initialize and trigger connection
        ServerClient.initialize();

        const connectionHandler = mockEventBus.on.mock.calls.find(
          (call) => call[0] === 'server.connection.status.changed',
        )?.[1];

        await connectionHandler({ isConnected: true });

        expect(ServerClient.loadState).not.toHaveBeenCalled(); // Should not auto-load when canvas has content
      });
    });
  });
});
