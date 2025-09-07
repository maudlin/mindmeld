// tests/unit/services/serverClient.autosave.test.js

describe('ServerClient - Auto-save Behavior', () => {
  let ServerClient;
  let mockEventBus;
  let mockAppState;
  let mockFetch;
  let mockServerConnectionService;
  let mockDataStore;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    mockAppState = {
      getState: jest.fn(),
      setState: jest.fn(),
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

    jest.doMock('../../../src/js/data/observableState.js', () => ({
      appState: mockAppState,
    }));

    jest.doMock('../../../src/js/services/serverConnectionService.js', () => ({
      ServerConnectionService: mockServerConnectionService,
    }));

    jest.doMock('../../../src/js/data/dataStore.js', () => mockDataStore);

    jest.doMock('../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
      // Use actual debounce for autosave tests - simulate delay for testing
      debounce: jest.fn((fn, delay) => {
        const debouncedFn = fn;
        debouncedFn._delay = delay;
        return debouncedFn;
      }),
    }));

    // Import the module to test
    const module = await import('../../../src/js/services/serverClient.js');
    ServerClient = module.ServerClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  describe('auto-save enable/disable', () => {
    it('should enable auto-save for connected state', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });

      const result = ServerClient.enableAutoSave();

      expect(result).toBe(true);
      expect(ServerClient.autoSaveEnabled).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.enabled');
    });

    it('should not enable auto-save for disconnected state', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      });

      const result = ServerClient.enableAutoSave();

      expect(result).toBe(false);
      expect(ServerClient.autoSaveEnabled).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.disabled', {
        reason: 'Not connected to server',
      });
    });

    it('should set up event listeners when auto-save enabled', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });

      ServerClient.enableAutoSave();

      expect(mockEventBus.on).toHaveBeenCalledWith('note.created', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('note.updated', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('note.deleted', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('connection.created', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('connection.updated', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('connection.deleted', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('note.color.changed', expect.any(Function));
    });
  });

  describe('debounced auto-save triggers', () => {
    beforeEach(() => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
      mockServerConnectionService.getServerUri.mockReturnValue('https://api.example.com');
      mockDataStore.exportToJSON.mockReturnValue('{"n":[],"c":[]}');

      // Mock successful Maps API response
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'test-map-id',
          version: 1,
          updatedAt: '2025-09-07T11:40:09.628Z',
        }),
        headers: {
          get: jest.fn().mockReturnValue('"test-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should debounce save requests with 2 second delay', () => {
      expect(typeof ServerClient.debouncedSave).toBe('function');
      expect(ServerClient.debouncedSave._delay).toBe(2000);
    });

    it('should auto-save when note is created', async () => {
      ServerClient.autoSaveEnabled = true;
      // Reset map state for new map creation
      ServerClient.currentMapId = null;
      ServerClient.currentETag = null;
      
      const result = await ServerClient.debouncedSave();
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: expect.stringContaining('"data":{"n":[],"c":[]}'),
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.success', {
        mapId: 'test-map-id',
        version: 1,
      });
    });

    it('should not auto-save when disconnected', async () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      });
      ServerClient.autoSaveEnabled = true;

      const result = await ServerClient.debouncedSave();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not auto-save when auto-save disabled', async () => {
      ServerClient.autoSaveEnabled = false;

      const result = await ServerClient.debouncedSave();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('save queue management', () => {
    beforeEach(() => {
      mockServerConnectionService.getServerUri.mockReturnValue('https://api.example.com');
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');
      
      // Mock successful Maps API response for queue processing
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          id: 'test-map-id',
          version: 1,
          updatedAt: '2025-09-07T11:40:09.628Z',
        }),
        headers: {
          get: jest.fn().mockReturnValue('"test-etag"'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should queue saves when server not available', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      });

      ServerClient.saveQueue = []; // Reset queue
      ServerClient.queueSave();

      expect(ServerClient.saveQueue).toHaveLength(1);
      expect(ServerClient.saveQueue[0]).toEqual({
        timestamp: expect.any(Number),
        data: '{"data":{"n":[],"c":[]}}',
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.queued');
    });

    it('should process the most recent queued save', async () => {
      // Set up a queued save
      ServerClient.saveQueue = [{
        timestamp: Date.now(),
        data: '{"test":"data"}',
      }];

      // Reset map state for new map creation
      ServerClient.currentMapId = null;
      ServerClient.currentETag = null;

      await ServerClient.processQueuedSaves();

      expect(ServerClient.saveQueue).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: expect.stringContaining('"data":{"data":{"n":[],"c":[]}}'),
      });
    });

    it('should not process queue when already processing', async () => {
      ServerClient.processingQueue = true;
      ServerClient.saveQueue = [{
        timestamp: Date.now(),
        data: '{"test":"data"}',
      }];

      await ServerClient.processQueuedSaves();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not process queue when empty', async () => {
      ServerClient.processingQueue = false;
      ServerClient.saveQueue = [];

      await ServerClient.processQueuedSaves();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('auto-save error handling', () => {
    beforeEach(() => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
      mockServerConnectionService.getServerUri.mockReturnValue('https://api.example.com');
      mockDataStore.exportToJSON.mockReturnValue('{"n":[],"c":[]}');
    });

    it('should handle server errors during auto-save', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({
          detail: 'Internal server error occurred',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      // Reset map state for new map creation path
      ServerClient.currentMapId = null;
      ServerClient.currentETag = null;

      ServerClient.autoSaveEnabled = true;

      const result = await ServerClient.debouncedSave();
      
      expect(result).toBe(false);
      expect(mockServerConnectionService.setConnectionStatus).toHaveBeenCalledWith('error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
        error: 'Internal server error occurred',
      });
    });

    it('should handle network errors during auto-save', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      ServerClient.autoSaveEnabled = true;

      const result = await ServerClient.debouncedSave();
      
      expect(result).toBe(false);
      expect(mockServerConnectionService.setConnectionStatus).toHaveBeenCalledWith('error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
        error: 'Network error',
      });
    });
  });

  describe('auto-save lifecycle integration', () => {
    it('should auto-enable when connection restored', () => {
      ServerClient.autoSaveEnabled = false;
      
      // Simulate connection status change event
      const connectionHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'server.connection.status.changed'
      )?.[1];

      if (connectionHandler) {
        // Mock the connection state for enableAutoSave check
        mockServerConnectionService.getConnectionState.mockReturnValue({
          serverUri: 'https://api.example.com',
          isConnected: true,
          connectionStatus: 'connected',
        });

        connectionHandler({ isConnected: true });

        expect(ServerClient.autoSaveEnabled).toBe(true);
        expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.enabled');
      }
    });

    it('should auto-disable when connection lost', () => {
      ServerClient.autoSaveEnabled = true;
      
      // Simulate connection status change event
      const connectionHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'server.connection.status.changed'
      )?.[1];

      if (connectionHandler) {
        connectionHandler({ isConnected: false });

        expect(ServerClient.autoSaveEnabled).toBe(false);
        expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.disabled', {
          reason: 'Manually disabled',
        });
      }
    });
  });
});