// tests/unit/services/serverClient.autoload.test.js

describe('ServerClient - Auto-load on Reconnection', () => {
  let ServerClient;
  let mockEventBus;
  let mockAppState;
  let mockFetch;
  let mockServerConnectionService;
  let mockDataStore;
  let mockCanvas;

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

    mockCanvas = { id: 'canvas' };

    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock DOM
    const mockGetElementById = jest.fn().mockReturnValue(mockCanvas);
    Object.defineProperty(document, 'getElementById', {
      value: mockGetElementById,
      writable: true,
    });

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

    jest.doMock('../../../src/js/services/connectionService.js', () => ({
      ConnectionService: {
        initializeConnectionDrawing: jest.fn(),
        connectionManager: {}, // Non-null to satisfy areServicesReady()
      },
    }));

    jest.doMock('../../../src/js/data/dataStore.js', () => mockDataStore);

    jest.doMock('../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
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

  describe('auto-loading on reconnection', () => {
    it('should auto-load server data when canvas is empty on reconnection', async () => {
      // Mock empty canvas state
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');

      // Mock server connection state
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
      mockServerConnectionService.getServerUri.mockReturnValue(
        'https://api.example.com',
      );

      // Mock successful server response for loadState
      const mockMapsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            id: 'test-map-id',
            version: 1,
          },
        ]),
      };

      const mockMapResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'test-map-id',
          data: { n: [{ i: 'note1', c: 'Server Note', p: [100, 200] }], c: [] },
          version: 1,
        }),
        headers: {
          get: jest.fn().mockReturnValue('"test-etag"'),
        },
      };

      mockFetch
        .mockResolvedValueOnce(mockMapsResponse) // GET /maps?limit=1
        .mockResolvedValueOnce(mockMapResponse); // GET /maps/{id}

      mockDataStore.importFromJSON.mockResolvedValue();

      // Initialize ServerClient (sets up event listeners)
      ServerClient.initialize();

      // Simulate connection status change to connected
      const connectionHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'server.connection.status.changed',
      )?.[1];

      expect(connectionHandler).toBeDefined();
      await connectionHandler({ isConnected: true });

      // Wait for the async auto-loading to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should auto-load because canvas is empty
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/maps?limit=1',
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        },
      );
      expect(mockDataStore.importFromJSON).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'server.autoload.success',
        {
          reason: 'Empty canvas on reconnect',
        },
      );
    });

    it('should not auto-load server data when canvas has content on reconnection', async () => {
      // Mock canvas with existing content
      mockDataStore.exportToJSON.mockReturnValue(
        '{"data":{"n":[{"i":"local1","c":"Local Note","p":[50,75]}],"c":[]}}',
      );

      // Mock server connection state
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });

      // Initialize ServerClient (sets up event listeners)
      ServerClient.initialize();

      // Simulate connection status change to connected
      const connectionHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'server.connection.status.changed',
      )?.[1];

      expect(connectionHandler).toBeDefined();
      await connectionHandler({ isConnected: true });

      // Should NOT auto-load because canvas has content
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockDataStore.importFromJSON).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'server.autoload.success',
        expect.anything(),
      );
    });

    it('should handle auto-load errors gracefully', async () => {
      // Mock empty canvas state
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');

      // Mock server connection state
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
      mockServerConnectionService.getServerUri.mockReturnValue(
        'https://api.example.com',
      );

      // Mock server error
      mockFetch.mockRejectedValue(new Error('Server error'));

      // Initialize ServerClient (sets up event listeners)
      ServerClient.initialize();

      // Simulate connection status change to connected
      const connectionHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'server.connection.status.changed',
      )?.[1];

      expect(connectionHandler).toBeDefined();
      await connectionHandler({ isConnected: true });

      // Wait for the async auto-loading to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should attempt auto-load but handle error gracefully
      expect(mockFetch).toHaveBeenCalled();
      expect(mockDataStore.importFromJSON).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'server.autoload.success',
        expect.anything(),
      );
    });

    it('should NOT corrupt connection status when auto-load fails', async () => {
      // Mock empty canvas state
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');

      // Mock server connection state
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
      mockServerConnectionService.getServerUri.mockReturnValue(
        'https://api.example.com',
      );

      // Mock server error for auto-load
      mockFetch.mockRejectedValue(new Error('Auto-load server error'));

      // Initialize ServerClient (sets up event listeners)
      ServerClient.initialize();

      // Simulate connection status change to connected
      const connectionHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'server.connection.status.changed',
      )?.[1];

      expect(connectionHandler).toBeDefined();
      await connectionHandler({ isConnected: true });

      // Wait for the async auto-loading to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // CRITICAL: Auto-load failure should NOT change connection status
      expect(
        mockServerConnectionService.setConnectionStatus,
      ).not.toHaveBeenCalledWith('error');
      expect(
        mockServerConnectionService.setConnectionStatus,
      ).not.toHaveBeenCalledWith('disconnected');

      // Should attempt auto-load but fail gracefully
      expect(mockFetch).toHaveBeenCalled();
      expect(mockDataStore.importFromJSON).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'server.autoload.success',
        expect.anything(),
      );
    });

    it('should handle invalid canvas state when checking if empty', async () => {
      // Mock invalid JSON export
      mockDataStore.exportToJSON.mockReturnValue('invalid-json');

      // Mock server connection state
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });

      // Initialize ServerClient (sets up event listeners)
      ServerClient.initialize();

      // Simulate connection status change to connected
      const connectionHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'server.connection.status.changed',
      )?.[1];

      expect(connectionHandler).toBeDefined();
      await connectionHandler({ isConnected: true });

      // Should not auto-load when canvas state can't be determined
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockDataStore.importFromJSON).not.toHaveBeenCalled();
    });
  });

  describe('isCanvasEmpty helper', () => {
    it('should return true for empty canvas', () => {
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');
      expect(ServerClient.isCanvasEmpty()).toBe(true);
    });

    it('should return false for canvas with notes', () => {
      mockDataStore.exportToJSON.mockReturnValue(
        '{"data":{"n":[{"i":"note1"}],"c":[]}}',
      );
      expect(ServerClient.isCanvasEmpty()).toBe(false);
    });

    it('should return false for canvas with connections', () => {
      mockDataStore.exportToJSON.mockReturnValue(
        '{"data":{"n":[],"c":[{"start":"a","end":"b"}]}}',
      );
      expect(ServerClient.isCanvasEmpty()).toBe(false);
    });

    it('should return false on JSON parse errors', () => {
      mockDataStore.exportToJSON.mockReturnValue('invalid-json');
      expect(ServerClient.isCanvasEmpty()).toBe(false);
    });
  });
});
