// src/js/services/serverConnectionService.js
import { appState } from '../data/observableState.js';
import { eventBus } from '../core/eventBus.js';
import { log } from '../utils/utils.js';

/**
 * Server Connection Management Service
 * Handles server URI configuration, connection testing, and state persistence
 */
export class ServerConnectionService {
  /**
   * Validate server URI format
   * @param {string} uri - Server URI to validate
   * @returns {boolean} True if valid HTTPS URL or HTTP localhost
   */
  static validateServerUri(uri) {
    if (!uri || typeof uri !== 'string') {
      return false;
    }

    try {
      const url = new URL(uri);

      // Allow HTTPS for all hostnames
      if (url.protocol === 'https:' && url.hostname.length > 0) {
        return true;
      }

      // Allow HTTP only for localhost development
      if (
        url.protocol === 'http:' &&
        (url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname === '0.0.0.0')
      ) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Test connection to server
   * @param {string} uri - Server URI to test
   * @returns {Promise<{success: boolean, error?: string, errorType?: string}>} Connection test result
   */
  static async testConnection(uri) {
    if (!this.validateServerUri(uri)) {
      return {
        success: false,
        error: 'Invalid server URI. Must be HTTPS URL or HTTP localhost.',
        errorType: 'validation',
      };
    }

    try {
      // Normalize URI by removing trailing slash before appending /health
      const normalizedUri = uri.replace(/\/$/, '');
      const response = await fetch(`${normalizedUri}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        timeout: 5000,
      });

      if (response.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Server responded with ${response.status} ${response.statusText}`,
          errorType: 'server',
        };
      }
    } catch (error) {
      log(`Connection test failed for ${uri}:`, error);

      // Detect CORS errors
      if (
        error.message &&
        (error.message.includes('CORS') ||
          error.message.includes('blocked by CORS policy'))
      ) {
        return this.handleCorsError(uri, error, window.location.origin);
      }

      // Detect network/fetch errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return this.handleNetworkError(uri, error);
      }

      return {
        success: false,
        error: `Connection failed: ${error.message}`,
        errorType: 'network',
      };
    }
  }

  /**
   * Handle CORS-specific error with helpful guidance
   * @private
   */
  static handleCorsError(uri, error, currentOrigin = window.location.origin) {
    const serverUrl = new URL(uri);

    // Check if this is a localhost origin mismatch
    if (
      currentOrigin.includes('127.0.0.1') &&
      serverUrl.hostname === 'localhost'
    ) {
      return {
        success: false,
        error: `CORS Error: Server at ${uri} expects requests from 'http://localhost:8080' but your app is running on '${currentOrigin}'. Try accessing your app at http://localhost:8080 instead of ${currentOrigin}.`,
        errorType: 'cors-localhost',
        suggestion: 'Access app at http://localhost:8080',
      };
    }

    if (
      currentOrigin.includes('localhost') &&
      serverUrl.hostname === '127.0.0.1'
    ) {
      return {
        success: false,
        error: `CORS Error: Server at ${uri} may expect requests from '${currentOrigin.replace('localhost', '127.0.0.1')}'. Try configuring your server to allow '${currentOrigin}' or access the server at 'http://localhost:${serverUrl.port || 80}'.`,
        errorType: 'cors-localhost',
        suggestion: `Try server at http://localhost:${serverUrl.port || 80}`,
      };
    }

    return {
      success: false,
      error: `CORS Error: Server at ${uri} doesn't allow requests from ${currentOrigin}. The server needs to be configured with proper CORS headers.`,
      errorType: 'cors',
      suggestion: 'Configure server CORS settings',
    };
  }

  /**
   * Handle network/fetch-specific errors
   * @private
   */
  static handleNetworkError(uri, error) {
    if (error.message.includes('Failed to fetch')) {
      return {
        success: false,
        error: `Cannot reach server at ${uri}. Check that the server is running and accessible.`,
        errorType: 'unreachable',
      };
    }

    return {
      success: false,
      error: `Network error: ${error.message}`,
      errorType: 'network',
    };
  }

  /**
   * Set server URI and update state
   * @param {string|null} uri - Server URI or null to clear
   * @returns {boolean} True if successful
   */
  static setServerUri(uri) {
    if (uri === null) {
      // Clear server URI
      const currentState = appState.getState();
      appState.setState({
        serverConnectionState: {
          ...currentState.serverConnectionState,
          serverUri: null,
          isConnected: false,
          connectionStatus: 'disconnected',
        },
      });

      localStorage.removeItem('mindmeld.serverUri');
      eventBus.emit('server.uri.changed', { serverUri: null });
      log('Server URI cleared');
      return true;
    }

    if (!this.validateServerUri(uri)) {
      log(`Invalid server URI: ${uri}. Must be HTTPS URL or HTTP localhost.`);
      return false;
    }

    const currentState = appState.getState();
    appState.setState({
      serverConnectionState: {
        ...currentState.serverConnectionState,
        serverUri: uri,
        isConnected: false,
        connectionStatus: 'configured',
      },
    });

    localStorage.setItem('mindmeld.serverUri', uri);
    eventBus.emit('server.uri.changed', { serverUri: uri });
    log(`Server URI set to: ${uri}`);
    return true;
  }

  /**
   * Get current server URI
   * @returns {string|null} Current server URI
   */
  static getServerUri() {
    const state = appState.getState();
    if (!state.serverConnectionState) {
      return null;
    }
    return state.serverConnectionState.serverUri;
  }

  /**
   * Update connection status
   * @param {string} status - Connection status ('connected', 'disconnected', 'error', 'configured')
   */
  static setConnectionStatus(status) {
    const currentState = appState.getState();
    const isConnected = status === 'connected';

    appState.setState({
      serverConnectionState: {
        ...currentState.serverConnectionState,
        isConnected,
        connectionStatus: status,
      },
    });

    eventBus.emit('server.connection.status.changed', {
      status,
      isConnected,
    });

    log(`Connection status updated to: ${status}`);
  }

  /**
   * Get complete connection state
   * @returns {Object} Connection state object
   */
  static getConnectionState() {
    const state = appState.getState();
    if (!state.serverConnectionState) {
      return {
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      };
    }
    return state.serverConnectionState;
  }

  /**
   * Load server URI from localStorage
   * @returns {string|null} Stored server URI if valid
   */
  static loadServerUriFromStorage() {
    try {
      const storedUri = localStorage.getItem('mindmeld.serverUri');
      if (storedUri && this.validateServerUri(storedUri)) {
        return storedUri;
      }
      return null;
    } catch (error) {
      log('Error loading server URI from storage:', error);
      return null;
    }
  }

  /**
   * Reset connection state to defaults
   */
  static resetConnectionState() {
    appState.setState({
      serverConnectionState: {
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      },
    });

    localStorage.removeItem('mindmeld.serverUri');
    eventBus.emit('server.connection.reset');
    log('Server connection state reset to defaults');
  }
}
