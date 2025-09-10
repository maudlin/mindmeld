// tests/unit/services/serverClient.loadState.test.js

// Create focused mock objects for this specific test suite
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
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

describe('ServerClient - loadState', () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset ServerClient state
    ServerClient.currentMapId = null;
    ServerClient.currentETag = null;

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
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('should load most recent map when no current map ID', async () => {
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

    mockFetch
      .mockResolvedValueOnce(mapsListResponse)
      .mockResolvedValueOnce(mapDataResponse);

    const mockCanvas = document.createElement('div');
    mockDataStore.importFromJSON.mockResolvedValue();

    ServerClient.currentMapId = null;

    const result = await ServerClient.loadState(mockCanvas);

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/maps?limit=1',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(ServerClient.currentMapId).toBe('most-recent-map-id');
    expect(ServerClient.currentETag).toBe('map-etag');
  });

  it('should load specific map when map ID exists', async () => {
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

    ServerClient.currentMapId = 'specific-map-id';

    const result = await ServerClient.loadState(mockCanvas);

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/maps/specific-map-id',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(ServerClient.currentETag).toBe('specific-etag');
  });

  it('should handle empty maps list when no maps exist', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue([]),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const mockCanvas = document.createElement('div');
    ServerClient.currentMapId = null;

    const result = await ServerClient.loadState(mockCanvas);

    expect(result).toBe(false);
    expect(mockEventBus.emit).toHaveBeenCalledWith('server.load.error', {
      error: 'No maps found on server',
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
