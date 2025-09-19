// tests/unit/services/serverClient.autosave.test.js

// Create focused mock objects for this specific test suite
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
};

const mockServerConnectionService = {
  getServerUri: jest.fn(),
  getConnectionState: jest.fn(),
  setConnectionStatus: jest.fn(),
};

const mockDataStore = {
  exportToJSON: jest.fn(),
  importFromJSON: jest.fn(),
};

// Mock dependencies
jest.mock('../../../src/js/core/eventBus.js', () => ({
  eventBus: mockEventBus,
}));

jest.mock('../../../src/js/data/observableState.js', () => ({
  appState: { getState: jest.fn(), setState: jest.fn() },
}));

jest.mock('../../../src/js/services/serverConnectionService.js', () => ({
  ServerConnectionService: mockServerConnectionService,
}));

jest.mock('../../../src/js/data/dataStore.js', () => mockDataStore);

jest.mock('../../../src/js/utils/utils.js', () => ({
  log: jest.fn(),
  debounce: jest.fn((fn) => fn),
}));

const { ServerClient } = require('../../../src/js/services/serverClient.js');

describe('ServerClient - Auto-save functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset ServerClient state
    ServerClient.autoSaveEnabled = false;
    ServerClient.saveQueue = [];
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
        { reason: 'Not connected to server' },
      );
    });
  });

  describe('disableAutoSave', () => {
    it('should disable auto-save functionality', () => {
      ServerClient.disableAutoSave();

      expect(ServerClient.autoSaveEnabled).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'server.autosave.disabled',
        { reason: 'Manually disabled' },
      );
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
      ServerClient.saveQueue = [
        { timestamp: Date.now(), data: '{"test":"data"}' },
      ];

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
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await ServerClient.processQueuedSaves();

      expect(ServerClient.saveQueue).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'server.save.queue.processed',
      );

      delete global.fetch;
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
});
