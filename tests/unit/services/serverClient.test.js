// tests/unit/services/serverClient.test.js

describe('ServerClient', () => {
  let ServerClient;
  let mockEventBus;
  let mockAppState;
  let mockFetch;
  let mockServerConnectionService;
  let mockDataStore;
  let consoleSpy;

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

    // Spy on console methods (optional, not used in cleanup)
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

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
      debounce: jest.fn((fn, delay) => fn), // Return unwrapped function for easier testing
    }));

    // Import the module to test
    const module = await import('../../../src/js/services/serverClient.js');
    ServerClient = module.ServerClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (consoleSpy && consoleSpy.mockRestore) {
      consoleSpy.mockRestore();
    }
    delete global.fetch;
  });

  describe('saveState', () => {
    beforeEach(() => {
      mockServerConnectionService.getServerUri.mockReturnValue('https://api.example.com');
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');
    });

    it('should save state to server successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ServerClient.saveState();

      expect(result).toBe(true);
      expect(mockDataStore.exportToJSON).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: '{"data":{"n":[],"c":[]}}',
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.success');
    });

    it('should handle server save errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ServerClient.saveState();

      expect(result).toBe(false);
      expect(mockServerConnectionService.setConnectionStatus).toHaveBeenCalledWith('error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
        error: 'Server error: 500 Internal Server Error',
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
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await ServerClient.saveState();

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/state', 
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })
      );
    });

    it('should handle network errors during save', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await ServerClient.saveState();

      expect(result).toBe(false);
      expect(mockServerConnectionService.setConnectionStatus).toHaveBeenCalledWith('error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
        error: 'Network error',
      });
    });
  });

  describe('loadState', () => {
    beforeEach(() => {
      mockServerConnectionService.getServerUri.mockReturnValue('https://api.example.com');
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
    });

    it('should load state from server successfully', async () => {
      const serverData = '{"data":{"n":[{"i":"note1","c":"Hello","p":[100,200]}],"c":[]}}';
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(serverData),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const mockCanvas = document.createElement('div');
      mockDataStore.importFromJSON.mockResolvedValue();

      const result = await ServerClient.loadState(mockCanvas);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/state', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      expect(mockDataStore.importFromJSON).toHaveBeenCalledWith(serverData, mockCanvas);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.success');
    });

    it('should handle 404 when no saved state exists', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      mockFetch.mockResolvedValue(mockResponse);

      const mockCanvas = document.createElement('div');
      const result = await ServerClient.loadState(mockCanvas);

      expect(result).toBe(false);
      expect(mockDataStore.importFromJSON).not.toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.error', {
        error: 'No saved state found on server',
      });
    });

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('invalid json'),
      };
      mockFetch.mockResolvedValue(mockResponse);
      mockDataStore.importFromJSON.mockRejectedValue(new Error('Invalid JSON data'));

      const mockCanvas = document.createElement('div');
      const result = await ServerClient.loadState(mockCanvas);

      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.error', {
        error: 'Invalid JSON data',
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
      const result = await ServerClient.loadState();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.error', {
        error: 'Canvas element required for loading',
      });
    });
  });

  describe('enableAutoSave', () => {
    beforeEach(() => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
    });

    it('should enable auto-save when connected', () => {
      const result = ServerClient.enableAutoSave();

      expect(result).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.enabled');
    });

    it('should not enable auto-save when disconnected', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      });

      const result = ServerClient.enableAutoSave();

      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.disabled', {
        reason: 'Not connected to server',
      });
    });

    it('should setup event listeners for state changes', () => {
      ServerClient.enableAutoSave();

      // Verify that the auto-save system is listening for relevant events
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.enabled');
      expect(mockEventBus.on).toHaveBeenCalledWith('note.created', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('note.updated', expect.any(Function));
    });
  });

  describe('disableAutoSave', () => {
    it('should disable auto-save functionality', () => {
      ServerClient.disableAutoSave();

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.disabled', {
        reason: 'Manually disabled',
      });
    });
  });

  describe('debouncedSave', () => {
    beforeEach(() => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
    });

    it('should debounce auto-save requests', () => {
      // Since we mocked debounce to return the function directly,
      // this test verifies the debounce mechanism would be called
      ServerClient.enableAutoSave();
      
      // The debounced function should exist and event listeners should be set up
      expect(typeof ServerClient.debouncedSave).toBe('function');
      expect(mockEventBus.on).toHaveBeenCalled();
    });

    it('should only auto-save when connected', async () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      });

      const result = await ServerClient.debouncedSave();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return current connection status', () => {
      const connectionState = {
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      };
      mockServerConnectionService.getConnectionState.mockReturnValue(connectionState);

      const result = ServerClient.getConnectionStatus();

      expect(result).toEqual(connectionState);
      expect(mockServerConnectionService.getConnectionState).toHaveBeenCalled();
    });
  });

  describe('queueSave', () => {
    it('should queue saves when server unavailable', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: false,
        connectionStatus: 'error',
      });

      ServerClient.queueSave();

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.queued');
    });

    it('should process queued saves when connection restored', () => {
      // First queue a save when disconnected
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: false,
        connectionStatus: 'error',
      });

      ServerClient.queueSave();
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.queued');

      // Then simulate connection restoration
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });

      ServerClient.processQueuedSaves();

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.queue.processing');
    });
  });
});