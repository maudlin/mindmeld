// tests/unit/services/serverClient.test.js

// Create mock objects - these will be reused across all tests
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

const mockAppState = {
  getState: jest.fn(),
  setState: jest.fn(),
};

const mockServerConnectionService = {
  getServerUri: jest.fn(),
  getConnectionState: jest.fn(),
  validateServerUri: jest.fn(),
  setConnectionStatus: jest.fn(),
};

const mockDataStore = {
  exportToJSON: jest.fn(),
  importFromJSON: jest.fn(),
};

// Set up mocks once at the top level - avoids expensive module resets
jest.mock('../../../src/js/core/eventBus.js', () => ({
  eventBus: mockEventBus,
}));

jest.mock('../../../src/js/data/observableState.js', () => ({
  appState: mockAppState,
}));

jest.mock('../../../src/js/services/serverConnectionService.js', () => ({
  ServerConnectionService: mockServerConnectionService,
}));

jest.mock('../../../src/js/data/dataStore.js', () => mockDataStore);

// Create a clean debounce mock that doesn't accumulate memory
const mockDebounce = jest.fn((fn) => {
  // Return unwrapped function to avoid closure memory issues
  return fn;
});

jest.mock('../../../src/js/utils/utils.js', () => ({
  log: jest.fn(),
  debounce: mockDebounce,
}));

// Import ServerClient once at the top level
const { ServerClient } = require('../../../src/js/services/serverClient.js');

describe('ServerClient', () => {
  let mockFetch;
  let consoleSpy;

  beforeEach(() => {
    // Only reset mocks, not the entire module system - this is much more efficient
    jest.clearAllMocks();
    mockDebounce.mockClear();

    // Reset ServerClient static properties to known state
    ServerClient.autoSaveEnabled = false;
    ServerClient.currentMapId = null;
    ServerClient.currentETag = null;
    ServerClient.saveQueue = [];
    ServerClient.lastSaveTime = null;
    ServerClient.lastEditTime = null;
    ServerClient.processingQueue = false;

    // Reset cache properties to prevent memory accumulation
    ServerClient.mapsCache = null;
    ServerClient.mapsCacheExpiry = null;

    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock DOM
    const mockCanvas = { id: 'canvas' };
    const mockGetElementById = jest.fn().mockReturnValue(mockCanvas);
    Object.defineProperty(document, 'getElementById', {
      value: mockGetElementById,
      writable: true,
    });

    // Spy on console methods (optional, not used in cleanup)
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up spies and global mocks
    if (consoleSpy && consoleSpy.mockRestore) {
      consoleSpy.mockRestore();
    }
    delete global.fetch;
  });

  describe('saveState', () => {
    beforeEach(() => {
      mockServerConnectionService.getServerUri.mockReturnValue(
        'https://api.example.com',
      );
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');
    });

    it('should create new map when no current map exists', async () => {
      // Mock successful map creation response
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'test-map-id',
          name: 'MindMeld Map - 9/7/2025',
          version: 1,
          updatedAt: '2025-09-07T11:40:09.628Z',
        }),
        headers: {
          get: jest.fn().mockReturnValue('"test-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Reset currentMapId to ensure new map creation
      ServerClient.currentMapId = null;
      ServerClient.currentETag = null;

      const result = await ServerClient.saveState();

      expect(result).toBe(true);
      expect(mockDataStore.exportToJSON).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: expect.stringContaining('"name":"MindMeld Map - '),
        // body: JSON.stringify({
        //   name: expect.stringMatching(/MindMeld Map - \d+\/\d+\/\d+/),
        //   data: {"n":[],"c":[]},
        // }),
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.success', {
        mapId: 'test-map-id',
        version: 1,
      });
      expect(ServerClient.currentMapId).toBe('test-map-id');
      expect(ServerClient.currentETag).toBe('test-etag');
    });

    it('should update existing map when map ID exists', async () => {
      // Mock successful map update response
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 'existing-map-id',
          version: 2,
          updatedAt: '2025-09-07T11:45:00.000Z',
        }),
        headers: {
          get: jest.fn().mockReturnValue('"new-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Set existing map ID and ETag
      ServerClient.currentMapId = 'existing-map-id';
      ServerClient.currentETag = 'existing-etag';

      const result = await ServerClient.saveState();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/maps/existing-map-id',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'If-Match': '"existing-etag"',
          },
          body: JSON.stringify({
            data: { n: [], c: [] },
            version: 1,
          }),
        },
      );
      expect(ServerClient.currentETag).toBe('new-etag');
    });

    it('should handle conflict errors (409) during update', async () => {
      // First call returns 409, second call (for loadState) returns maps list, third call returns map data
      const conflict409Response = {
        ok: false,
        status: 409,
        statusText: 'Conflict',
      };

      const mapsListResponse = {
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue([{ id: 'existing-map-id', version: 2 }]),
      };

      const mapDataResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'existing-map-id',
          data: { n: [], c: [] },
          version: 2,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"new-etag"'),
        },
      };

      const retrySuccessResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'existing-map-id',
          version: 3,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"final-etag"'),
        },
      };

      mockFetch
        .mockResolvedValueOnce(conflict409Response) // First save attempt fails with 409
        .mockResolvedValueOnce(mapDataResponse) // loadState gets specific map (no maps list needed when ID exists)
        .mockResolvedValueOnce(retrySuccessResponse); // Retry save succeeds

      // Set existing map ID and ETag
      ServerClient.currentMapId = 'existing-map-id';
      ServerClient.currentETag = 'existing-etag';

      // Mock the importFromJSON method that loadState calls
      mockDataStore.importFromJSON.mockResolvedValue();

      const result = await ServerClient.saveState();

      expect(result).toBe(true);
      expect(ServerClient.currentETag).toBe('final-etag');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.success', {
        mapId: 'existing-map-id',
        version: 3,
      });
    });

    it('should handle server save errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({
          detail: 'Internal server error occurred',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Reset currentMapId to ensure new map creation path
      ServerClient.currentMapId = null;
      ServerClient.currentETag = null;

      const result = await ServerClient.saveState();

      expect(result).toBe(false);
      expect(
        mockServerConnectionService.setConnectionStatus,
      ).toHaveBeenCalledWith('error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
        error: 'Internal server error occurred',
      });
    });

    it('should validate server URI before saving', async () => {
      mockServerConnectionService.getServerUri.mockReturnValue(null);

      const result = await ServerClient.saveState();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
        error: 'No server configured',
      });
    });

    it('should include proper headers in save requests', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'test-map-id',
          version: 1,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"test-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Reset currentMapId to ensure new map creation path
      ServerClient.currentMapId = null;
      ServerClient.currentETag = null;

      await ServerClient.saveState();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/maps',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }),
      );
    });

    it('should handle network errors during save', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await ServerClient.saveState();

      expect(result).toBe(false);
      expect(
        mockServerConnectionService.setConnectionStatus,
      ).toHaveBeenCalledWith('error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
        error: 'Network error',
      });
    });
  });

  describe('loadState', () => {
    beforeEach(() => {
      mockServerConnectionService.getServerUri.mockReturnValue(
        'https://api.example.com',
      );
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
    });

    it('should load most recent map when no current map ID', async () => {
      // Mock GET /maps response (list maps)
      const mapsListResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue([
          {
            id: 'most-recent-map-id',
            name: 'Recent Map',
            version: 1,
            updatedAt: '2025-09-07T11:40:09.628Z',
          },
        ]),
      };

      // Mock GET /maps/{id} response (load specific map)
      const mapDataResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 'most-recent-map-id',
          name: 'Recent Map',
          version: 1,
          data: { n: [{ i: 'note1', c: 'Hello', p: [100, 200] }], c: [] },
          state: { n: [{ i: 'note1', c: 'Hello', p: [100, 200] }], c: [] },
        }),
        headers: {
          get: jest.fn().mockReturnValue('"map-etag"'),
        },
      };

      // First call returns maps list, second call returns map data
      mockFetch
        .mockResolvedValueOnce(mapsListResponse)
        .mockResolvedValueOnce(mapDataResponse);

      const mockCanvas = document.createElement('div');
      mockDataStore.importFromJSON.mockResolvedValue();

      // Reset currentMapId to ensure load most recent path
      ServerClient.currentMapId = null;
      ServerClient.currentETag = null;

      const result = await ServerClient.loadState(mockCanvas);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api.example.com/maps?limit=1',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api.example.com/maps/most-recent-map-id',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      );
      expect(mockDataStore.importFromJSON).toHaveBeenCalledWith(
        JSON.stringify({
          data: { n: [{ i: 'note1', c: 'Hello', p: [100, 200] }], c: [] },
        }),
        mockCanvas,
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.success', {
        mapId: 'most-recent-map-id',
        mapName: 'Recent Map',
        version: 1,
      });
      expect(ServerClient.currentMapId).toBe('most-recent-map-id');
      expect(ServerClient.currentETag).toBe('map-etag');
    });

    it('should load specific map when map ID exists', async () => {
      // Mock GET /maps/{id} response
      const mapDataResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 'specific-map-id',
          name: 'Specific Map',
          version: 1,
          data: { n: [{ i: 'note2', c: 'World', p: [200, 300] }], c: [] },
        }),
        headers: {
          get: jest.fn().mockReturnValue('"specific-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mapDataResponse);

      const mockCanvas = document.createElement('div');
      mockDataStore.importFromJSON.mockResolvedValue();

      // Set current map ID to test specific map loading
      ServerClient.currentMapId = 'specific-map-id';
      ServerClient.currentETag = 'old-etag';

      const result = await ServerClient.loadState(mockCanvas);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/maps/specific-map-id',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      );
      expect(ServerClient.currentETag).toBe('specific-etag');
    });

    it('should handle empty maps list when no maps exist', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue([]), // Empty array
      };
      mockFetch.mockResolvedValue(mockResponse);

      const mockCanvas = document.createElement('div');

      // Reset currentMapId to ensure load most recent path
      ServerClient.currentMapId = null;
      ServerClient.currentETag = null;

      const result = await ServerClient.loadState(mockCanvas);

      expect(result).toBe(false);
      expect(mockDataStore.importFromJSON).not.toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.error', {
        error: 'No maps found on server',
      });
    });

    it('should handle specific map load with 404', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Set currentMapId to test specific map loading path
      ServerClient.currentMapId = 'non-existent-map-id';
      ServerClient.currentETag = 'some-etag';

      const mockCanvas = document.createElement('div');
      const result = await ServerClient.loadState(mockCanvas);

      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.error', {
        error: 'Map not found on server',
      });
    });

    it('should timeout on slow server responses', async () => {
      // Simulate a timeout by rejecting with timeout error
      mockFetch.mockRejectedValue(new Error('Request timeout'));

      const mockCanvas = document.createElement('div');
      const result = await ServerClient.loadState(mockCanvas);

      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.error', {
        error: 'Request timeout',
      });
    });

    it('should require canvas parameter', async () => {
      const result = await ServerClient.loadState(null);

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.error', {
        error: 'Canvas element required for loading',
      });
    });
  });

  describe('enableAutoSave', () => {
    it('should enable auto-save when connected', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        isConnected: true,
      });

      const result = ServerClient.enableAutoSave();

      expect(result).toBe(true);
      expect(ServerClient.autoSaveEnabled).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.enabled');
    });

    it('should not enable auto-save when disconnected', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        isConnected: false,
      });

      const result = ServerClient.enableAutoSave();

      expect(result).toBe(false);
      expect(ServerClient.autoSaveEnabled).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'server.autosave.disabled',
        {
          reason: 'Not connected to server',
        },
      );
    });

    it('should setup event listeners for state changes', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        isConnected: true,
      });

      ServerClient.enableAutoSave();

      // Verify that event listeners are set up
      const expectedEvents = [
        'note.created',
        'note.updated',
        'note.deleted',
        'connection.created',
        'connection.updated',
        'connection.deleted',
        'note.color.changed',
      ];

      expectedEvents.forEach((eventName) => {
        expect(mockEventBus.on).toHaveBeenCalledWith(
          eventName,
          expect.any(Function),
        );
      });
    });
  });

  describe('disableAutoSave', () => {
    it('should disable auto-save functionality', () => {
      ServerClient.disableAutoSave();

      expect(ServerClient.autoSaveEnabled).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'server.autosave.disabled',
        {
          reason: 'Manually disabled',
        },
      );
    });
  });

  describe('debouncedSave', () => {
    it('should debounce auto-save requests', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        isConnected: true,
      });
      ServerClient.autoSaveEnabled = true;

      const result = ServerClient.debouncedSave();

      // Since we mock debounce to return the function directly, this tests the debounced function
      expect(typeof result).toBe('object'); // Returns a Promise
    });

    it('should only auto-save when connected', async () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        isConnected: false,
      });
      ServerClient.autoSaveEnabled = true;

      const result = await ServerClient.debouncedSave();

      expect(result).toBe(false);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return current connection status', () => {
      const mockState = {
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      };
      mockServerConnectionService.getConnectionState.mockReturnValue(mockState);

      const result = ServerClient.getConnectionStatus();

      expect(result).toEqual(mockState);
    });
  });

  describe('queueSave', () => {
    it('should queue saves when server unavailable', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        isConnected: false,
      });
      mockDataStore.exportToJSON.mockReturnValue('{"test":"data"}');

      ServerClient.queueSave();

      expect(ServerClient.saveQueue).toHaveLength(1);
      expect(ServerClient.saveQueue[0]).toEqual({
        timestamp: expect.any(Number),
        data: '{"test":"data"}',
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.queued');
    });

    it('should process queued saves when connection restored', async () => {
      // Set up a queued save
      ServerClient.saveQueue = [
        {
          timestamp: Date.now(),
          data: '{"test":"data"}',
        },
      ];

      // Mock successful save
      mockServerConnectionService.getServerUri.mockReturnValue(
        'https://api.example.com',
      );
      mockDataStore.exportToJSON.mockReturnValue('{"current":"data"}');
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({ id: 'test-id', version: 1 }),
        headers: { get: jest.fn().mockReturnValue('"test-etag"') },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.processQueuedSaves();

      expect(ServerClient.saveQueue).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'server.save.queue.processed',
      );
    });
  });
});
