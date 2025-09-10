// tests/unit/services/serverClient.saveState.test.js

// Create focused mock objects for this specific test suite
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
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

// Mock dependencies
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

jest.mock('../../../src/js/utils/utils.js', () => ({
  log: jest.fn(),
  debounce: jest.fn((fn) => fn),
}));

const { ServerClient } = require('../../../src/js/services/serverClient.js');

describe('ServerClient - saveState', () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset ServerClient state
    ServerClient.autoSaveEnabled = false;
    ServerClient.currentMapId = null;
    ServerClient.currentETag = null;
    ServerClient.saveQueue = [];

    mockFetch = jest.fn();
    global.fetch = mockFetch;

    mockServerConnectionService.getServerUri.mockReturnValue(
      'https://api.example.com',
    );
    mockServerConnectionService.getConnectionState.mockReturnValue({
      serverUri: 'https://api.example.com',
      isConnected: true,
      connectionStatus: 'connected',
    });
    mockDataStore.exportToJSON.mockReturnValue('{"n":[],"c":[]}');
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('should create new map when no current map exists', async () => {
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

    ServerClient.currentMapId = null;
    ServerClient.currentETag = null;

    const result = await ServerClient.saveState();

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/maps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: expect.stringContaining('"name":"MindMeld Map - '),
    });
    expect(ServerClient.currentMapId).toBe('test-map-id');
    expect(ServerClient.currentETag).toBe('test-etag');
  });

  it('should update existing map when map ID exists', async () => {
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
    const mockResponse = {
      ok: false,
      status: 409,
      statusText: 'Conflict',
    };
    mockFetch.mockResolvedValue(mockResponse);

    ServerClient.currentMapId = 'existing-map-id';
    ServerClient.currentETag = 'existing-etag';

    const result = await ServerClient.saveState();

    expect(result).toBe(false);
    expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
      error:
        'Map was modified by another user. Please reload to get the latest version.',
      type: 'conflict',
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

    ServerClient.currentMapId = null;
    ServerClient.currentETag = null;

    const result = await ServerClient.saveState();

    expect(result).toBe(false);
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

  it('should handle network errors during save', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await ServerClient.saveState();

    expect(result).toBe(false);
    expect(mockEventBus.emit).toHaveBeenCalledWith('server.save.error', {
      error: 'Network error',
    });
  });
});
