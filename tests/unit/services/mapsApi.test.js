// tests/unit/services/mapsApi.test.js

describe('mapsApi', () => {
  let createMapsApi;
  let mockFetch;
  let api;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock fetch
    mockFetch = jest.fn();

    // Import the module to test
    const module = await import('../../../src/js/services/mapsApi.js');
    createMapsApi = module.createMapsApi;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMapsApi configuration', () => {
    it('should throw error when baseUrl is missing', () => {
      expect(() => {
        createMapsApi({});
      }).toThrow('baseUrl required');
    });

    it('should accept baseUrl and return API object', () => {
      const api = createMapsApi({
        baseUrl: 'http://localhost:3001',
        fetchImpl: mockFetch,
      });

      expect(api).toHaveProperty('health');
      expect(api).toHaveProperty('createMap');
      expect(api).toHaveProperty('getMap');
      expect(api).toHaveProperty('updateMap');
    });

    it('should default to native fetch if fetchImpl not provided', () => {
      const api = createMapsApi({ baseUrl: 'http://localhost:3001' });
      expect(api).toBeDefined();
    });
  });

  describe('health method', () => {
    beforeEach(() => {
      api = createMapsApi({
        baseUrl: 'http://localhost:3001',
        fetchImpl: mockFetch,
      });
    });

    it('should call GET /health and return JSON response', async () => {
      const mockResponse = {
        status: 'ok',
        timestamp: '2025-09-05T09:00:00Z',
        uptime: 12345,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['Content-Type', 'application/json']]),
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await api.health();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/health',
        {},
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(api.health()).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Map([['Content-Type', 'application/json']]),
        json: jest
          .fn()
          .mockResolvedValue({ title: 'Service Unavailable', status: 503 }),
      });

      await expect(api.health()).rejects.toThrow('Service Unavailable');
    });
  });

  describe('createMap method', () => {
    beforeEach(() => {
      api = createMapsApi({
        baseUrl: 'http://localhost:3001',
        fetchImpl: mockFetch,
      });
    });

    it('should POST to /maps with correct headers and body', async () => {
      const mapData = {
        name: 'Test Map',
        data: { notes: [], connections: [] },
      };
      const mockResponse = { id: 'map-123', ...mapData };
      const mockETag = '"v1-abc123"';

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([
          ['Content-Type', 'application/json'],
          ['ETag', mockETag],
        ]),
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await api.createMap(mapData);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData),
      });

      expect(result).toEqual({
        ...mockResponse,
        etag: mockETag,
      });
    });

    it('should store ETag internally for created map', async () => {
      const mapData = { name: 'Test Map', data: { notes: [] } };
      const mockResponse = { id: 'map-123' };
      const mockETag = '"v1-abc123"';

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([
          ['Content-Type', 'application/json'],
          ['ETag', mockETag],
        ]),
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await api.createMap(mapData);

      // Test that ETag is stored by checking if it's used in subsequent updateMap call
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([
          ['Content-Type', 'application/json'],
          ['ETag', '"v2-def456"'],
        ]),
        json: jest.fn().mockResolvedValue({ id: 'map-123' }),
      });

      await api.updateMap('map-123', { name: 'Updated Map' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/maps/map-123',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'If-Match': mockETag,
          },
          body: JSON.stringify({ name: 'Updated Map' }),
        },
      );
    });
  });

  describe('getMap method', () => {
    beforeEach(() => {
      api = createMapsApi({
        baseUrl: 'http://localhost:3001',
        fetchImpl: mockFetch,
      });
    });

    it('should GET /maps/{id} and return data with ETag', async () => {
      const mapId = 'map-123';
      const mockResponse = {
        id: mapId,
        name: 'Test Map',
        data: { notes: [], connections: [] },
      };
      const mockETag = '"v1-abc123"';

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([
          ['Content-Type', 'application/json'],
          ['ETag', mockETag],
        ]),
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await api.getMap(mapId);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/maps/map-123',
        {},
      );
      expect(result).toEqual({
        ...mockResponse,
        etag: mockETag,
      });
    });

    it('should handle 404 not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map([['Content-Type', 'application/problem+json']]),
        json: jest.fn().mockResolvedValue({
          title: 'Map not found',
          status: 404,
          detail: 'No map found with the given ID',
        }),
      });

      await expect(api.getMap('nonexistent')).rejects.toThrow('Map not found');
    });

    it('should URL encode map ID', async () => {
      const mapId = 'map with spaces';

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['Content-Type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ id: mapId }),
      });

      await api.getMap(mapId);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/maps/map%20with%20spaces',
        {},
      );
    });
  });

  describe('updateMap method', () => {
    beforeEach(() => {
      api = createMapsApi({
        baseUrl: 'http://localhost:3001',
        fetchImpl: mockFetch,
      });
    });

    it('should PUT to /maps/{id} with If-Match header', async () => {
      const mapId = 'map-123';
      const updateData = { name: 'Updated Map', data: { notes: [1, 2, 3] } };
      const etag = '"v1-abc123"';
      const newETag = '"v2-def456"';

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([
          ['Content-Type', 'application/json'],
          ['ETag', newETag],
        ]),
        json: jest.fn().mockResolvedValue({ id: mapId, ...updateData }),
      });

      const result = await api.updateMap(mapId, updateData, etag);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/maps/map-123',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'If-Match': etag,
          },
          body: JSON.stringify(updateData),
        },
      );

      expect(result).toEqual({
        id: mapId,
        ...updateData,
        etag: newETag,
      });
    });

    it('should handle 409 conflict (optimistic concurrency failure)', async () => {
      const mapId = 'map-123';
      const updateData = { name: 'Updated Map' };
      const staleETag = '"v1-old"';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        headers: new Map([['Content-Type', 'application/problem+json']]),
        json: jest.fn().mockResolvedValue({
          title: 'Conflict',
          status: 409,
          detail: 'The resource was modified by another client',
        }),
      });

      const error = await api
        .updateMap(mapId, updateData, staleETag)
        .catch((e) => e);

      expect(error.status).toBe(409);
      expect(error.problem.title).toBe('Conflict');
    });

    it('should work without explicit ETag if stored internally', async () => {
      const mapId = 'map-123';

      // First, simulate getMap to store an ETag
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([
          ['Content-Type', 'application/json'],
          ['ETag', '"stored-etag"'],
        ]),
        json: jest.fn().mockResolvedValue({ id: mapId }),
      });

      await api.getMap(mapId);

      // Clear mock and setup for updateMap
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([
          ['Content-Type', 'application/json'],
          ['ETag', '"new-etag"'],
        ]),
        json: jest.fn().mockResolvedValue({ id: mapId }),
      });

      await api.updateMap(mapId, { name: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/maps/map-123',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'If-Match': '"stored-etag"',
          },
          body: JSON.stringify({ name: 'Updated' }),
        },
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      api = createMapsApi({
        baseUrl: 'http://localhost:3001',
        fetchImpl: mockFetch,
      });
    });

    it('should handle RFC 7807 problem+json responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['Content-Type', 'application/problem+json']]),
        json: jest.fn().mockResolvedValue({
          type: 'https://example.com/probs/invalid-request',
          title: 'Invalid request data',
          status: 400,
          detail: 'The request body contains invalid JSON',
          instance: '/maps',
        }),
      });

      const error = await api.health().catch((e) => e);

      expect(error.message).toBe('Invalid request data');
      expect(error.status).toBe(400);
      expect(error.problem.detail).toBe(
        'The request body contains invalid JSON',
      );
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['Content-Type', 'text/plain']]),
        json: jest.fn().mockResolvedValue(null),
      });

      const error = await api.health().catch((e) => e);

      expect(error.message).toBe('HTTP 500');
      expect(error.status).toBe(500);
      expect(error.problem.title).toBe('Internal Server Error');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['Content-Type', 'application/json']]),
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      await expect(api.health()).rejects.toThrow('Invalid JSON');
    });
  });

  describe('URL handling', () => {
    it('should handle baseUrl with trailing slash', () => {
      const api = createMapsApi({
        baseUrl: 'http://localhost:3001/',
        fetchImpl: mockFetch,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['Content-Type', 'application/json']]),
        json: jest.fn().mockResolvedValue({}),
      });

      api.health();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/health',
        {},
      );
    });

    it('should handle baseUrl without trailing slash', () => {
      const api = createMapsApi({
        baseUrl: 'http://localhost:3001',
        fetchImpl: mockFetch,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['Content-Type', 'application/json']]),
        json: jest.fn().mockResolvedValue({}),
      });

      api.health();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/health',
        {},
      );
    });
  });
});
