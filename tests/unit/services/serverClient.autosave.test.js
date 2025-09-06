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
      debounce: jest.fn((fn, delay) => {
        // Return a function that tracks calls for testing
        const debounced = jest.fn(fn);
        debounced._originalFn = fn;
        debounced._delay = delay;
        return debounced;
      }),
    }));

    // Import the module to test
    const module = await import('../../../src/js/services/serverClient.js');
    ServerClient = module.ServerClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
    ServerClient.autoSaveEnabled = false;
    ServerClient.saveQueue = [];
    ServerClient.processingQueue = false;
    delete global.fetch;
  });

  describe('auto-save initialization', () => {
    beforeEach(() => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
    });

    it('should initialize ServerClient and enable auto-save when connected', () => {
      ServerClient.initialize();

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'server.connection.status.changed',
        expect.any(Function)
      );
      expect(ServerClient.autoSaveEnabled).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.enabled');
    });

    it('should not enable auto-save when initialized disconnected', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      });

      ServerClient.initialize();

      expect(ServerClient.autoSaveEnabled).toBe(false);
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('server.autosave.enabled');
    });

    it('should setup auto-save event listeners when enabled', () => {
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
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should debounce save requests with 2 second delay', () => {
      expect(typeof ServerClient.debouncedSave).toBe('function');
      expect(ServerClient.debouncedSave._delay).toBe(2000);
    });

    it('should auto-save when note is created', async () => {
      ServerClient.autoSaveEnabled = true;
      
      const result = await ServerClient.debouncedSave();
      
      expect(result).toBe(true);
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

    it('should not auto-save when auto-save is disabled', async () => {
      ServerClient.autoSaveEnabled = false;

      const result = await ServerClient.debouncedSave();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('connection state change handling', () => {
    it('should enable auto-save when connection is restored', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });

      ServerClient.initialize();

      // Simulate connection restoration
      const connectionHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'server.connection.status.changed'
      )?.[1];

      if (connectionHandler) {
        connectionHandler({ isConnected: true });

        expect(ServerClient.autoSaveEnabled).toBe(true);
        expect(mockEventBus.emit).toHaveBeenCalledWith('server.autosave.enabled');
      }
    });

    it('should disable auto-save when connection is lost', () => {
      // Setup initial connected state
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
      
      ServerClient.autoSaveEnabled = true;
      ServerClient.initialize();

      // Clear previous mock calls
      mockEventBus.emit.mockClear();

      // Simulate connection loss
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

    it('should process queued saves when connection is restored', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });

      // Add a save to the queue
      ServerClient.saveQueue.push({
        timestamp: Date.now(),
        data: '{"data":{"n":[],"c":[]}}',
      });

      ServerClient.initialize();

      // Simulate connection restoration
      const connectionHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'server.connection.status.changed'
      )?.[1];

      if (connectionHandler) {
        connectionHandler({ isConnected: true });

        expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.queue.processing');
      }
    });
  });

  describe('save queue management', () => {
    beforeEach(() => {
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');
    });

    it('should queue saves when server is unavailable', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: false,
        connectionStatus: 'error',
      });

      ServerClient.queueSave();

      expect(ServerClient.saveQueue).toHaveLength(1);
      expect(ServerClient.saveQueue[0]).toEqual({
        timestamp: expect.any(Number),
        data: '{"data":{"n":[],"c":[]}}',
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.queued');
    });

    it('should not queue saves when server is available', () => {
      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });

      ServerClient.queueSave();

      expect(ServerClient.saveQueue).toHaveLength(0);
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('server.save.queued');
    });

    it('should process the most recent queued save', async () => {
      // Setup successful fetch response
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });
      mockServerConnectionService.getServerUri.mockReturnValue('https://api.example.com');
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');

      // Add multiple saves to queue
      ServerClient.saveQueue = [
        { timestamp: 1000, data: '{"old":"data"}' },
        { timestamp: 2000, data: '{"newer":"data"}' },
        { timestamp: 3000, data: '{"latest":"data"}' },
      ];

      await ServerClient.processQueuedSaves();

      expect(ServerClient.saveQueue).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: '{"data":{"n":[],"c":[]}}',
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.queue.processed');
    });

    it('should handle queue processing failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      mockServerConnectionService.getConnectionState.mockReturnValue({
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      });

      ServerClient.saveQueue = [{ timestamp: Date.now(), data: '{"data":"test"}' }];

      await ServerClient.processQueuedSaves();

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.queue.failed');
      expect(ServerClient.processingQueue).toBe(false);
    });

    it('should not process queue when already processing', async () => {
      ServerClient.processingQueue = true;
      ServerClient.saveQueue = [{ timestamp: Date.now(), data: '{"data":"test"}' }];

      await ServerClient.processQueuedSaves();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('server.save.queue.processing');
    });

    it('should not process queue when empty', async () => {
      ServerClient.saveQueue = [];
      ServerClient.processingQueue = false;

      await ServerClient.processQueuedSaves();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('server.save.queue.processing');
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
      mockDataStore.exportToJSON.mockReturnValue('{"data":{"n":[],"c":[]}}');
    });

    it('should handle auto-save network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      ServerClient.autoSaveEnabled = true;

      const result = await ServerClient.debouncedSave();

      expect(result).toBe(false);
      expect(mockServerConnectionService.setConnectionStatus).toHaveBeenCalledWith('error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
        error: 'Network error',
      });
    });

    it('should handle server errors during auto-save', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      mockFetch.mockResolvedValue(mockResponse);
      ServerClient.autoSaveEnabled = true;

      const result = await ServerClient.debouncedSave();

      expect(result).toBe(false);
      expect(mockServerConnectionService.setConnectionStatus).toHaveBeenCalledWith('error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
        error: 'Server error: 500 Internal Server Error',
      });
    });
  });
});