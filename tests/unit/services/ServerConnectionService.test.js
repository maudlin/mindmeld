// tests/unit/services/ServerConnectionService.test.js
// TDD Tests for ServerConnectionService - Two-phase server connection management

import { jest } from '@jest/globals';

describe('ServerConnectionService TDD', () => {
  let ServerConnectionService;
  let mockFetch;

  beforeEach(async () => {
    // Reset modules to avoid cached imports
    jest.resetModules();

    // Mock fetch for server validation
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Import real implementation (GREEN phase - implementing to pass tests)

    // Import after mocking
    const module = await import(
      '../../../src/js/services/ServerConnectionService.js'
    );
    ServerConnectionService = module.ServerConnectionService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  describe('Server URL Validation (Phase 1)', () => {
    test('should validate server URL before connecting', async () => {
      // RED: Write test first - this will fail
      const service = new ServerConnectionService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            name: 'MindMeld Server',
            version: '1.0.0',
            websocket: true,
          }),
      });

      const result = await service.testServerConnection(
        'https://api.example.com',
      );

      expect(result.valid).toBe(true);
      expect(result.hasWebSocketSupport).toBe(true);
      expect(result.serverInfo).toEqual({
        name: 'MindMeld Server',
        version: '1.0.0',
        websocket: true,
      });
    });

    test('should reject invalid server URLs', async () => {
      // RED: URL validation
      const service = new ServerConnectionService();

      const invalidResult = await service.testServerConnection('invalid-url');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toBe('Invalid server URL');

      // Mock successful response for localhost
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            name: 'MindMeld Server',
            version: '1.0.0',
            websocket: true,
          }),
      });

      const localhostResult = await service.testServerConnection(
        'http://localhost:3000',
      );
      expect(localhostResult.valid).toBe(true); // localhost HTTP should be allowed

      const remoteHttpResult = await service.testServerConnection(
        'http://remote-server.com',
      );
      expect(remoteHttpResult.valid).toBe(false);
      expect(remoteHttpResult.error).toBe('HTTPS required for remote servers');
    });

    test('should handle server connection failures', async () => {
      // RED: Connection error handling
      const service = new ServerConnectionService();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.testServerConnection(
        'https://api.example.com',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('should detect missing WebSocket support', async () => {
      // RED: WebSocket capability detection
      const service = new ServerConnectionService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            name: 'Non-MindMeld Server',
            websocket: false,
          }),
      });

      const result = await service.testServerConnection(
        'https://api.example.com',
      );

      expect(result.valid).toBe(true);
      expect(result.hasWebSocketSupport).toBe(false);
      expect(result.warning).toBe(
        'Server does not support WebSocket collaboration',
      );
    });
  });

  describe('Two-Phase Connection Pattern (Phase 1)', () => {
    test('should store server URL without initializing WebSocket', () => {
      // RED: Test two-phase connection - validation separate from connection
      const service = new ServerConnectionService();

      service.setServerUrl('https://api.example.com');

      expect(service.serverUrl).toBe('https://api.example.com');
      expect(service.wsProvider).toBeNull(); // Not connected yet
      expect(service.connected).toBe(false);
    });

    test('should provide connection status information', () => {
      // RED: Status tracking
      const service = new ServerConnectionService();

      expect(service.getConnectionStatus()).toEqual({
        phase: 'disconnected',
        serverUrl: null,
        connected: false,
        wsProvider: null,
      });

      service.setServerUrl('https://api.example.com');

      expect(service.getConnectionStatus()).toEqual({
        phase: 'server-configured',
        serverUrl: 'https://api.example.com',
        connected: false,
        wsProvider: null,
      });
    });

    test('should support disconnection and cleanup', () => {
      // RED: Cleanup functionality
      const service = new ServerConnectionService();

      service.setServerUrl('https://api.example.com');
      service.disconnect();

      expect(service.getConnectionStatus()).toEqual({
        phase: 'disconnected',
        serverUrl: null,
        connected: false,
        wsProvider: null,
      });
    });
  });

  describe('Integration Readiness (Phase 1)', () => {
    test('should be ready for ServiceBootstrap integration', () => {
      // RED: Verify service follows singleton pattern expected by bootstrap
      expect(typeof ServerConnectionService.getInstance).toBe('function');

      const instance1 = ServerConnectionService.getInstance();
      const instance2 = ServerConnectionService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(ServerConnectionService);
    });

    test('should support event system integration', () => {
      // RED: Event bus compatibility
      const service = new ServerConnectionService();
      const mockEventBus = {
        emit: jest.fn(),
        on: jest.fn(),
      };

      service.setEventBus(mockEventBus);
      service.setServerUrl('https://api.example.com');

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.configured', {
        serverUrl: 'https://api.example.com',
      });
    });

    test('should provide API surface for WebSocketYjsProvider integration', () => {
      // RED: Verify methods needed by WebSocketYjsProvider exist
      const service = new ServerConnectionService();

      expect(typeof service.getServerUrl).toBe('function');
      expect(typeof service.isServerConfigured).toBe('function');
      expect(typeof service.createWebSocketUrl).toBe('function');
    });
  });

  describe('Error Handling and Edge Cases (Phase 1)', () => {
    test('should handle malformed server responses', async () => {
      // RED: Robust error handling
      const service = new ServerConnectionService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve('invalid-json'),
      });

      const result = await service.testServerConnection(
        'https://api.example.com',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid server response');
    });

    test('should handle HTTP error responses', async () => {
      // RED: HTTP error handling
      const service = new ServerConnectionService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await service.testServerConnection(
        'https://api.example.com',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server not found (404: Not Found)');
    });

    test('should prevent double initialization', () => {
      // RED: Prevent state corruption
      const service = new ServerConnectionService();

      service.setServerUrl('https://api.example.com');

      expect(() => {
        service.setServerUrl('https://different.example.com');
      }).toThrow('Server already configured. Call disconnect() first.');
    });
  });
});
