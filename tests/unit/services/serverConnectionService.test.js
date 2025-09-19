// tests/unit/services/serverConnectionService.test.js

describe('ServerConnectionService', () => {
  let ServerConnectionService;
  let mockEventBus;
  let mockAppState;
  let mockFetch;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockEventBus = {
      emit: jest.fn(),
    };

    mockAppState = {
      getState: jest.fn(),
      setState: jest.fn(),
    };

    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock dependencies before importing
    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/data/observableState.js', () => ({
      appState: mockAppState,
    }));

    jest.doMock('../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
    }));

    // Import the module to test
    const module = await import(
      '../../../src/js/services/serverConnectionService.js'
    );
    ServerConnectionService = module.ServerConnectionService;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  describe('validateServerUri', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(
        ServerConnectionService.validateServerUri('https://example.com'),
      ).toBe(true);
      expect(
        ServerConnectionService.validateServerUri('https://api.mindmeld.com'),
      ).toBe(true);
      expect(
        ServerConnectionService.validateServerUri('https://localhost:3000'),
      ).toBe(true);
    });

    it('should accept HTTP URLs for localhost development', () => {
      expect(
        ServerConnectionService.validateServerUri('http://localhost'),
      ).toBe(true);
      expect(
        ServerConnectionService.validateServerUri('http://localhost:3001'),
      ).toBe(true);
      expect(
        ServerConnectionService.validateServerUri('http://127.0.0.1'),
      ).toBe(true);
      expect(
        ServerConnectionService.validateServerUri('http://127.0.0.1:8080'),
      ).toBe(true);
      expect(
        ServerConnectionService.validateServerUri('http://0.0.0.0:3000'),
      ).toBe(true);
    });

    it('should reject HTTP URLs for non-localhost hosts', () => {
      expect(
        ServerConnectionService.validateServerUri('http://example.com'),
      ).toBe(false);
      expect(
        ServerConnectionService.validateServerUri('http://192.168.1.100'),
      ).toBe(false);
      expect(
        ServerConnectionService.validateServerUri('http://api.mindmeld.com'),
      ).toBe(false);
    });

    it('should reject non-HTTP/HTTPS protocols', () => {
      expect(
        ServerConnectionService.validateServerUri('ftp://example.com'),
      ).toBe(false);
      expect(
        ServerConnectionService.validateServerUri('ws://localhost:3000'),
      ).toBe(false);
    });

    it('should reject invalid URL formats', () => {
      expect(ServerConnectionService.validateServerUri('not-a-url')).toBe(
        false,
      );
      expect(ServerConnectionService.validateServerUri('')).toBe(false);
      expect(ServerConnectionService.validateServerUri(null)).toBe(false);
      expect(ServerConnectionService.validateServerUri(undefined)).toBe(false);
    });

    it('should reject URLs with invalid characters', () => {
      expect(
        ServerConnectionService.validateServerUri('https://example .com'),
      ).toBe(false);
      expect(
        ServerConnectionService.validateServerUri('https://exam<ple.com'),
      ).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return success for successful connection test', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ status: 'ok' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ServerConnectionService.testConnection(
        'https://api.example.com',
      );

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/health', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        timeout: 5000,
      });
    });

    it('should return error details for failed connection test', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await ServerConnectionService.testConnection(
        'https://api.example.com',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.errorType).toBe('network');
    });

    it('should return error details for non-200 response', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ServerConnectionService.testConnection(
        'https://api.example.com',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server responded with 404 Not Found');
      expect(result.errorType).toBe('server');
    });

    it('should reject invalid URLs without making request', async () => {
      const result =
        await ServerConnectionService.testConnection('invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Invalid server URI. Must be HTTPS URL or HTTP localhost.',
      );
      expect(result.errorType).toBe('validation');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should accept HTTP localhost URLs for connection testing', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ status: 'ok' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await ServerConnectionService.testConnection(
        'http://localhost:3001',
      );

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/health', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        timeout: 5000,
      });
    });

    it('should handle CORS errors with helpful guidance for 127.0.0.1 to localhost', async () => {
      // Test the handleCorsError method directly since window mocking is difficult in jsdom
      const result = ServerConnectionService.handleCorsError(
        'http://localhost:3001',
        new Error('CORS policy error'),
        'http://127.0.0.1:8080',
      );

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('cors-localhost');
      expect(result.error).toContain(
        'Try accessing your app at http://localhost:8080',
      );
      expect(result.suggestion).toBe('Access app at http://localhost:8080');
    });

    it('should handle CORS errors with helpful guidance for localhost to 127.0.0.1', async () => {
      const result = ServerConnectionService.handleCorsError(
        'http://127.0.0.1:3001',
        new Error('CORS policy error'),
        'http://localhost:8080',
      );

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('cors-localhost');
      expect(result.error).toContain('Try configuring your server to allow');
      expect(result.suggestion).toBe('Try server at http://localhost:3001');
    });

    it('should handle general CORS errors', async () => {
      const result = ServerConnectionService.handleCorsError(
        'https://api.example.com',
        new Error('CORS policy error'),
        'http://localhost:8080',
      );

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('cors');
      expect(result.error).toContain(
        "Server at https://api.example.com doesn't allow requests",
      );
      expect(result.suggestion).toBe('Configure server CORS settings');
    });

    it('should handle network unreachable errors', async () => {
      const networkError = new Error('Failed to fetch');
      networkError.name = 'TypeError';
      mockFetch.mockRejectedValue(networkError);

      const result = await ServerConnectionService.testConnection(
        'http://localhost:3001',
      );

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unreachable');
      expect(result.error).toContain('Cannot reach server');
    });
  });

  describe('setServerUri', () => {
    beforeEach(() => {
      mockAppState.getState.mockReturnValue({
        serverConnectionState: {
          serverUri: null,
          isConnected: false,
          connectionStatus: 'disconnected',
        },
      });
    });

    it('should set valid server URI and update state', () => {
      const uri = 'https://api.mindmeld.com';
      const result = ServerConnectionService.setServerUri(uri);

      expect(result).toBe(true);
      expect(mockAppState.setState).toHaveBeenCalledWith({
        serverConnectionState: {
          serverUri: uri,
          isConnected: false,
          connectionStatus: 'configured',
        },
      });
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'mindmeld.serverUri',
        uri,
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.uri.changed', {
        serverUri: uri,
      });
    });

    it('should reject invalid server URI', () => {
      const result = ServerConnectionService.setServerUri(
        'http://insecure.com',
      );

      expect(result).toBe(false);
      expect(mockAppState.setState).not.toHaveBeenCalled();
      expect(window.localStorage.setItem).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should accept HTTP localhost server URI', () => {
      const uri = 'http://localhost:3001';
      const result = ServerConnectionService.setServerUri(uri);

      expect(result).toBe(true);
      expect(mockAppState.setState).toHaveBeenCalledWith({
        serverConnectionState: {
          serverUri: uri,
          isConnected: false,
          connectionStatus: 'configured',
        },
      });
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'mindmeld.serverUri',
        uri,
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.uri.changed', {
        serverUri: uri,
      });
    });

    it('should clear server URI when passed null', () => {
      const result = ServerConnectionService.setServerUri(null);

      expect(result).toBe(true);
      expect(mockAppState.setState).toHaveBeenCalledWith({
        serverConnectionState: {
          serverUri: null,
          isConnected: false,
          connectionStatus: 'disconnected',
        },
      });
      expect(window.localStorage.removeItem).toHaveBeenCalledWith(
        'mindmeld.serverUri',
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.uri.changed', {
        serverUri: null,
      });
    });
  });

  describe('getServerUri', () => {
    it('should return server URI from state', () => {
      const uri = 'https://api.example.com';
      mockAppState.getState.mockReturnValue({
        serverConnectionState: { serverUri: uri },
      });

      const result = ServerConnectionService.getServerUri();
      expect(result).toBe(uri);
    });

    it('should return null when no server URI is set', () => {
      mockAppState.getState.mockReturnValue({
        serverConnectionState: { serverUri: null },
      });

      const result = ServerConnectionService.getServerUri();
      expect(result).toBe(null);
    });
  });

  describe('setConnectionStatus', () => {
    beforeEach(() => {
      mockAppState.getState.mockReturnValue({
        serverConnectionState: {
          serverUri: 'https://api.example.com',
          isConnected: false,
          connectionStatus: 'disconnected',
        },
      });
    });

    it('should update connection status to connected', () => {
      ServerConnectionService.setConnectionStatus('connected');

      expect(mockAppState.setState).toHaveBeenCalledWith({
        serverConnectionState: {
          serverUri: 'https://api.example.com',
          isConnected: true,
          connectionStatus: 'connected',
        },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'server.connection.status.changed',
        {
          status: 'connected',
          isConnected: true,
        },
      );
    });

    it('should update connection status to error', () => {
      ServerConnectionService.setConnectionStatus('error');

      expect(mockAppState.setState).toHaveBeenCalledWith({
        serverConnectionState: {
          serverUri: 'https://api.example.com',
          isConnected: false,
          connectionStatus: 'error',
        },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'server.connection.status.changed',
        {
          status: 'error',
          isConnected: false,
        },
      );
    });
  });

  describe('getConnectionState', () => {
    it('should return complete connection state', () => {
      const connectionState = {
        serverUri: 'https://api.example.com',
        isConnected: true,
        connectionStatus: 'connected',
      };
      mockAppState.getState.mockReturnValue({
        serverConnectionState: connectionState,
      });

      const result = ServerConnectionService.getConnectionState();
      expect(result).toEqual(connectionState);
    });
  });

  describe('loadServerUriFromStorage', () => {
    it('should load valid URI from localStorage', () => {
      const uri = 'https://api.stored.com';
      window.localStorage.getItem.mockReturnValue(uri);

      const result = ServerConnectionService.loadServerUriFromStorage();

      expect(result).toBe(uri);
      expect(window.localStorage.getItem).toHaveBeenCalledWith(
        'mindmeld.serverUri',
      );
    });

    it('should return null for invalid stored URI', () => {
      window.localStorage.getItem.mockReturnValue('http://invalid.com');

      const result = ServerConnectionService.loadServerUriFromStorage();

      expect(result).toBe(null);
    });

    it('should load valid HTTP localhost URI from localStorage', () => {
      const uri = 'http://localhost:3001';
      window.localStorage.getItem.mockReturnValue(uri);

      const result = ServerConnectionService.loadServerUriFromStorage();

      expect(result).toBe(uri);
      expect(window.localStorage.getItem).toHaveBeenCalledWith(
        'mindmeld.serverUri',
      );
    });

    it('should return null when no URI stored', () => {
      window.localStorage.getItem.mockReturnValue(null);

      const result = ServerConnectionService.loadServerUriFromStorage();

      expect(result).toBe(null);
    });
  });

  describe('resetConnectionState', () => {
    it('should reset to default state and emit event', () => {
      ServerConnectionService.resetConnectionState();

      expect(mockAppState.setState).toHaveBeenCalledWith({
        serverConnectionState: {
          serverUri: null,
          isConnected: false,
          connectionStatus: 'disconnected',
        },
      });
      expect(window.localStorage.removeItem).toHaveBeenCalledWith(
        'mindmeld.serverUri',
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('server.connection.reset');
    });
  });
});
