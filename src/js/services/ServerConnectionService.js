// src/js/services/ServerConnectionService.js
// ServerConnectionService - Two-phase server connection management for collaboration

/**
 * ServerConnectionService handles the two-phase connection pattern:
 * Phase 1: Server validation and configuration
 * Phase 2: WebSocket connection during map loading
 *
 * This separation allows UI to validate servers without immediately connecting,
 * and enables WebSocket-only map loading to prevent double-hydration.
 */
export class ServerConnectionService {
  static _instance = null;

  constructor() {
    if (ServerConnectionService._instance) {
      throw new Error(
        'Use ServerConnectionService.getInstance() instead of new',
      );
    }

    this.serverUrl = null;
    this.wsProvider = null;
    this.connected = false;
    this.eventBus = null;
    this._cleanupFn = null;
  }

  static getInstance() {
    if (!ServerConnectionService._instance) {
      try {
        ServerConnectionService._instance = new ServerConnectionService();
      } catch (error) {
        throw new Error(
          `Failed to initialize ServerConnectionService: ${error.message}`,
        );
      }
    }
    return ServerConnectionService._instance;
  }

  /**
   * Initialize the service with event bus and cleanup function
   */
  init(mapId, options = {}) {
    if (options.onReady) {
      // Call onReady callback if provided
      options.onReady();
    }

    // Return cleanup function for lifecycle management
    this._cleanupFn = () => {
      this.disconnect();
    };

    return this._cleanupFn;
  }

  /**
   * Test server connection and validate capabilities
   * Phase 1: Validation without connection
   */
  async testServerConnection(url) {
    try {
      // Validate URL format
      this._validateUrl(url);

      // Attempt to connect to server health endpoint
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `Server not found (${response.status}: ${response.statusText})`,
        };
      }

      let serverInfo;
      try {
        serverInfo = await response.json();
      } catch {
        return {
          valid: false,
          error: 'Invalid server response format',
        };
      }

      // Validate server response structure
      if (typeof serverInfo !== 'object' || serverInfo === null) {
        return {
          valid: false,
          error: 'Invalid server response format',
        };
      }

      // Check WebSocket support
      const hasWebSocketSupport = serverInfo.websocket === true;
      const result = {
        valid: true,
        hasWebSocketSupport,
        serverInfo,
      };

      if (!hasWebSocketSupport) {
        result.warning = 'Server does not support WebSocket collaboration';
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate URL format and security requirements
   */
  _validateUrl(url) {
    try {
      const parsedUrl = new URL(url);

      // Check protocol requirements
      if (parsedUrl.protocol === 'http:') {
        // Only allow HTTP for localhost
        if (
          parsedUrl.hostname !== 'localhost' &&
          parsedUrl.hostname !== '127.0.0.1'
        ) {
          throw new Error('HTTPS required for remote servers');
        }
      } else if (parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol. Use HTTP (localhost only) or HTTPS');
      }

      return true;
    } catch (error) {
      if (
        error.message.includes('HTTPS required') ||
        error.message.includes('Invalid protocol')
      ) {
        throw error;
      }
      throw new Error('Invalid server URL');
    }
  }

  /**
   * Set server URL without connecting
   * Phase 1: Configuration only
   */
  setServerUrl(url) {
    if (this.serverUrl !== null) {
      throw new Error('Server already configured. Call disconnect() first.');
    }

    this.serverUrl = url;
    this.connected = false;

    // Publish configuration event
    if (this.eventBus) {
      this.eventBus.publish('server.configured', {
        serverUrl: url,
      });
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    if (this.serverUrl === null) {
      return {
        phase: 'disconnected',
        serverUrl: null,
        connected: false,
        wsProvider: null,
      };
    }

    if (this.wsProvider === null) {
      return {
        phase: 'server-configured',
        serverUrl: this.serverUrl,
        connected: false,
        wsProvider: null,
      };
    }

    return {
      phase: 'websocket-connected',
      serverUrl: this.serverUrl,
      connected: this.connected,
      wsProvider: this.wsProvider,
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.serverUrl = null;
    this.wsProvider = null;
    this.connected = false;

    // Publish disconnection event
    if (this.eventBus) {
      this.eventBus.publish('server.disconnected', {});
    }
  }

  /**
   * Destroy service and reset singleton
   */
  destroy() {
    if (this._cleanupFn) {
      this._cleanupFn();
      this._cleanupFn = null;
    }

    this.disconnect();

    // Reset singleton instance
    ServerConnectionService._instance = null;
  }

  /**
   * Set event bus for integration
   */
  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Get configured server URL
   */
  getServerUrl() {
    return this.serverUrl;
  }

  /**
   * Check if server is configured
   */
  isServerConfigured() {
    return this.serverUrl !== null;
  }

  /**
   * Create WebSocket URL for map connection
   * Used by WebSocketYjsProvider during Phase 2
   */
  createWebSocketUrl(mapId) {
    if (!this.isServerConfigured()) {
      throw new Error('Server not configured');
    }

    // Convert HTTP(S) to WS(S) for WebSocket connection
    const wsUrl = this.serverUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');

    return `${wsUrl}/yjs/${mapId}`;
  }

  /**
   * Check if service is properly initialized
   */
  isInitialized() {
    return true; // Service is initialized when instantiated
  }
}
