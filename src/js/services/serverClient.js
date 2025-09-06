// src/js/services/serverClient.js
import { ServerConnectionService } from './serverConnectionService.js';
import { exportToJSON, importFromJSON } from '../data/dataStore.js';
import { eventBus } from '../core/eventBus.js';
import { log, debounce } from '../utils/utils.js';

/**
 * Server Client Service
 * Handles saving and loading state to/from the server
 * Manages auto-save functionality and queued operations
 */
export class ServerClient {
  // Static properties for managing auto-save state
  static autoSaveEnabled = false;
  static saveQueue = [];
  static processingQueue = false;

  /**
   * Save current state to server
   * @returns {Promise<boolean>} True if save successful
   */
  static async saveState() {
    const serverUri = ServerConnectionService.getServerUri();
    if (!serverUri) {
      eventBus.emit('server.save.error', {
        error: 'No server configured',
      });
      return false;
    }

    try {
      // Get current state as JSON
      const stateData = exportToJSON();

      // Make POST request to save state
      const response = await fetch(`${serverUri}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: stateData,
      });

      if (!response.ok) {
        ServerConnectionService.setConnectionStatus('error');
        eventBus.emit('server.save.error', {
          error: `Server error: ${response.status} ${response.statusText}`,
        });
        return false;
      }

      eventBus.emit('server.save.success');
      log('State saved to server successfully');
      return true;
    } catch (error) {
      ServerConnectionService.setConnectionStatus('error');
      eventBus.emit('server.save.error', {
        error: error.message,
      });
      log('Error saving state to server:', error);
      return false;
    }
  }

  /**
   * Load state from server
   * @param {HTMLElement} canvas - Canvas element for importing data
   * @returns {Promise<boolean>} True if load successful
   */
  static async loadState(canvas) {
    if (!canvas) {
      eventBus.emit('server.load.error', {
        error: 'Canvas element required for loading',
      });
      return false;
    }

    const serverUri = ServerConnectionService.getServerUri();
    if (!serverUri) {
      eventBus.emit('server.load.error', {
        error: 'No server configured',
      });
      return false;
    }

    try {
      // Make GET request to load state
      const response = await fetch(`${serverUri}/state`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.status === 404) {
        eventBus.emit('server.load.error', {
          error: 'No saved state found on server',
        });
        return false;
      }

      if (!response.ok) {
        ServerConnectionService.setConnectionStatus('error');
        eventBus.emit('server.load.error', {
          error: `Server error: ${response.status} ${response.statusText}`,
        });
        return false;
      }

      // Get response text and import data
      const stateData = await response.text();
      await importFromJSON(stateData, canvas);

      eventBus.emit('server.load.success');
      log('State loaded from server successfully');
      return true;
    } catch (error) {
      if (error.message.includes('timeout') || error.name === 'AbortError') {
        eventBus.emit('server.load.error', {
          error: 'Request timeout',
        });
      } else {
        eventBus.emit('server.load.error', {
          error: error.message,
        });
      }
      log('Error loading state from server:', error);
      return false;
    }
  }

  /**
   * Enable auto-save functionality
   * @returns {boolean} True if auto-save enabled successfully
   */
  static enableAutoSave() {
    const connectionState = ServerConnectionService.getConnectionState();

    if (!connectionState.isConnected) {
      eventBus.emit('server.autosave.disabled', {
        reason: 'Not connected to server',
      });
      return false;
    }

    this.autoSaveEnabled = true;

    // Set up event listeners for state changes
    this.setupAutoSaveListeners();

    eventBus.emit('server.autosave.enabled');
    log('Auto-save enabled');
    return true;
  }

  /**
   * Disable auto-save functionality
   */
  static disableAutoSave() {
    this.autoSaveEnabled = false;

    eventBus.emit('server.autosave.disabled', {
      reason: 'Manually disabled',
    });
    log('Auto-save disabled');
  }

  /**
   * Debounced save function for auto-save
   * @returns {Promise<boolean>} True if save successful
   */
  static debouncedSave = debounce(async () => {
    const connectionState = ServerConnectionService.getConnectionState();

    if (!connectionState.isConnected) {
      return false;
    }

    if (!this.autoSaveEnabled) {
      return false;
    }

    return await this.saveState();
  }, 2000); // 2 second debounce

  /**
   * Set up event listeners for auto-save triggers
   */
  static setupAutoSaveListeners() {
    // Listen for events that should trigger auto-save
    eventBus.on('note.created', this.debouncedSave);
    eventBus.on('note.updated', this.debouncedSave);
    eventBus.on('note.deleted', this.debouncedSave);
    eventBus.on('connection.created', this.debouncedSave);
    eventBus.on('connection.updated', this.debouncedSave);
    eventBus.on('connection.deleted', this.debouncedSave);
    eventBus.on('note.color.changed', this.debouncedSave);
  }

  /**
   * Get current connection status
   * @returns {Object} Connection state object
   */
  static getConnectionStatus() {
    return ServerConnectionService.getConnectionState();
  }

  /**
   * Queue save operation when server unavailable
   */
  static queueSave() {
    const connectionState = ServerConnectionService.getConnectionState();

    if (!connectionState.isConnected) {
      this.saveQueue.push({
        timestamp: Date.now(),
        data: exportToJSON(),
      });

      eventBus.emit('server.save.queued');
      log('Save queued - server not available');
    }
  }

  /**
   * Process queued saves when connection is restored
   */
  static async processQueuedSaves() {
    if (this.processingQueue || this.saveQueue.length === 0) {
      return;
    }

    this.processingQueue = true;
    eventBus.emit('server.save.queue.processing');

    try {
      // Process the most recent queued save (discard older ones)
      this.saveQueue = []; // Clear queue

      // Attempt to save the latest data
      const success = await this.saveState();

      if (success) {
        eventBus.emit('server.save.queue.processed');
        log('Queued saves processed successfully');
      } else {
        eventBus.emit('server.save.queue.failed');
        log('Failed to process queued saves');
      }
    } catch (error) {
      eventBus.emit('server.save.queue.failed');
      log('Error processing queued saves:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Initialize server client functionality
   */
  static initialize() {
    // Listen for connection status changes
    eventBus.on('server.connection.status.changed', ({ isConnected }) => {
      if (isConnected) {
        // Connection restored - enable auto-save and process queue
        this.enableAutoSave();
        this.processQueuedSaves();
      } else {
        // Connection lost - disable auto-save
        this.disableAutoSave();
      }
    });

    // Start with auto-save enabled if connected
    const connectionState = ServerConnectionService.getConnectionState();
    if (connectionState.isConnected) {
      this.enableAutoSave();
    }

    log('ServerClient initialized');
  }
}

