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
  static currentMapId = null;
  static currentETag = null;

  /**
   * Save current state to server using Maps API v1
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
      // Get current state as JSON and parse it
      const stateJsonString = exportToJSON();
      const parsedState = JSON.parse(stateJsonString);

      // Extract the actual data (notes and connections) from the wrapper
      const stateData = parsedState.data;

      if (this.currentMapId && this.currentETag) {
        // Update existing map
        return await this.updateExistingMap(serverUri, stateData);
      } else {
        // Create new map
        return await this.createNewMap(serverUri, stateData);
      }
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
   * Create new map on server
   * @private
   */
  static async createNewMap(serverUri, stateData) {
    const response = await fetch(`${serverUri}/maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: `MindMeld Map - ${new Date().toLocaleDateString()}`,
        data: stateData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      ServerConnectionService.setConnectionStatus('error');
      eventBus.emit('server.save.error', {
        error:
          errorData.detail ||
          `Server error: ${response.status} ${response.statusText}`,
      });
      return false;
    }

    const result = await response.json();
    const etag = response.headers.get('ETag')?.replace(/"/g, '');

    // Store map ID and ETag for future updates
    this.currentMapId = result.id;
    this.currentETag = etag;

    eventBus.emit('server.save.success', {
      mapId: result.id,
      version: result.version,
    });
    log('New map created on server successfully:', result.id);
    return true;
  }

  /**
   * Update existing map on server
   * @private
   */
  static async updateExistingMap(serverUri, stateData) {
    const response = await fetch(`${serverUri}/maps/${this.currentMapId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'If-Match': `"${this.currentETag}"`,
      },
      body: JSON.stringify({
        data: stateData,
        version: 1,
      }),
    });

    if (response.status === 409) {
      // Conflict - map was modified by another user/tab
      log(
        'ServerClient: ETag conflict detected, auto-resolving by fetching latest version',
      );

      try {
        // Fetch the latest version to get the current ETag
        await this.loadState(document.getElementById('mainCanvas'));

        // Try saving again with the updated ETag
        log('ServerClient: Retrying save after ETag refresh...');
        return await this.saveState();
      } catch (retryError) {
        log(
          'ServerClient: Failed to resolve ETag conflict:',
          retryError.message,
        );
        eventBus.emit('server.save.error', {
          error:
            'Could not save - map was modified elsewhere. Changes may be lost.',
          type: 'conflict',
          originalError: retryError.message,
        });
        return false;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      ServerConnectionService.setConnectionStatus('error');
      eventBus.emit('server.save.error', {
        error:
          errorData.detail ||
          `Server error: ${response.status} ${response.statusText}`,
      });
      return false;
    }

    const result = await response.json();
    const etag = response.headers.get('ETag')?.replace(/"/g, '');

    // Update ETag for future updates
    this.currentETag = etag;

    eventBus.emit('server.save.success', {
      mapId: result.id,
      version: result.version,
    });
    log('Map updated on server successfully:', result.id);
    return true;
  }

  /**
   * Load state from server using Maps API v1
   * If no specific map ID is stored, shows map selection dialog
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
      // If we have a current map ID, load it directly
      if (this.currentMapId) {
        return await this.loadSpecificMap(serverUri, this.currentMapId, canvas);
      }

      // Otherwise, get list of available maps and load the most recent one
      return await this.loadMostRecentMap(serverUri, canvas);
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
   * Load a specific map by ID
   * @private
   */
  static async loadSpecificMap(serverUri, mapId, canvas) {
    const response = await fetch(`${serverUri}/maps/${mapId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 404) {
      eventBus.emit('server.load.error', {
        error: 'Map not found on server',
      });
      return false;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      ServerConnectionService.setConnectionStatus('error');
      eventBus.emit('server.load.error', {
        error:
          errorData.detail ||
          `Server error: ${response.status} ${response.statusText}`,
      });
      return false;
    }

    const mapData = await response.json();
    const etag = response.headers.get('ETag')?.replace(/"/g, '');

    // Update ETag for future updates
    this.currentETag = etag;

    // Convert map data to JSON string for importFromJSON
    // importFromJSON expects { data: { n: [], c: [] } } structure
    const stateData = mapData.data || mapData.state;

    // Debug logging to understand the data structure
    log('ServerClient: Raw mapData structure:', {
      hasData: !!mapData.data,
      hasState: !!mapData.state,
      stateDataType: typeof stateData,
      stateDataKeys: stateData ? Object.keys(stateData) : 'null/undefined',
    });

    if (!stateData) {
      throw new Error('No data or state found in server response');
    }

    // Detect and repair corrupt data (e.g., double-wrapped from old bug)
    const normalizedData = this.repairCorruptData(stateData, mapData.id);

    const stateJsonString = JSON.stringify({ data: normalizedData });
    log('ServerClient: Normalized data for import:', {
      noteCount: normalizedData.n.length,
      connectionCount: normalizedData.c.length,
    });

    await importFromJSON(stateJsonString, canvas);

    eventBus.emit('server.load.success', {
      mapId: mapData.id,
      mapName: mapData.name,
      version: mapData.version,
    });
    log('Map loaded from server successfully:', mapData.id);
    return true;
  }

  /**
   * Detect and repair corrupt data from server
   * @private
   */
  static repairCorruptData(stateData, mapId) {
    try {
      // Check for double-wrapped data (old bug pattern)
      if (stateData.data && typeof stateData.data === 'object') {
        log('ServerClient: Detected double-wrapped data, auto-repairing...');
        stateData = stateData.data;

        eventBus.emit('server.data.repaired', {
          mapId,
          repairType: 'double-wrapped',
          message: 'Automatically repaired double-wrapped data from server',
        });
      }

      // Ensure we have the required structure
      if (!stateData.n && !stateData.c) {
        // Try to find data in unexpected locations
        const possibleData = this.findDataInCorruptStructure(stateData);
        if (possibleData) {
          log('ServerClient: Found data in unexpected structure, repairing...');
          stateData = possibleData;

          eventBus.emit('server.data.repaired', {
            mapId,
            repairType: 'structure-mismatch',
            message: 'Found and extracted data from unexpected structure',
          });
        } else {
          // Completely corrupt or empty - emit error with raw data for manual recovery
          let rawDataString;
          try {
            rawDataString = JSON.stringify(stateData, null, 2);
          } catch (stringifyError) {
            rawDataString = `[Unable to serialize data: ${stringifyError.message}]`;
          }

          eventBus.emit('server.data.corrupt', {
            mapId,
            rawData: rawDataString,
            error: 'Could not find valid note or connection data',
          });

          log('ServerClient: Corrupt data detected, using empty fallback');
          return { n: [], c: [] };
        }
      }

      // Validate and normalize the structure
      return {
        n: Array.isArray(stateData.n) ? stateData.n : [],
        c: Array.isArray(stateData.c) ? stateData.c : [],
      };
    } catch (error) {
      log('ServerClient: Error repairing corrupt data:', error);

      // Safely stringify even circular data
      let rawDataString;
      try {
        rawDataString = JSON.stringify(stateData, null, 2);
      } catch (stringifyError) {
        rawDataString = `[Unable to serialize data: ${stringifyError.message}]`;
      }

      eventBus.emit('server.data.corrupt', {
        mapId,
        rawData: rawDataString,
        error: `Data repair failed: ${error.message}`,
      });

      // Return empty data as safe fallback
      return { n: [], c: [] };
    }
  }

  /**
   * Try to find valid data in corrupted structure
   * @private
   */
  static findDataInCorruptStructure(data) {
    // Common patterns to check
    const patterns = [
      () => data.state?.data, // state.data wrapper
      () => data.map?.data, // map.data wrapper
      () => data.content, // content field
      () =>
        data.notes && data.connections
          ? { n: data.notes, c: data.connections }
          : null, // expanded format
    ];

    for (const pattern of patterns) {
      try {
        const result = pattern();
        if (result && (result.n || result.c)) {
          return result;
        }
      } catch {
        // Continue checking other patterns
      }
    }

    return null;
  }

  /**
   * Load the most recent map from the server
   * @private
   */
  static async loadMostRecentMap(serverUri, canvas) {
    // Get list of available maps
    const response = await fetch(`${serverUri}/maps?limit=1`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      ServerConnectionService.setConnectionStatus('error');
      eventBus.emit('server.load.error', {
        error:
          errorData.detail ||
          `Server error: ${response.status} ${response.statusText}`,
      });
      return false;
    }

    const maps = await response.json();

    if (!maps || maps.length === 0) {
      eventBus.emit('server.load.error', {
        error: 'No maps found on server',
      });
      return false;
    }

    // Load the most recent map (first in the list)
    const mostRecentMap = maps[0];
    this.currentMapId = mostRecentMap.id;

    return await this.loadSpecificMap(serverUri, mostRecentMap.id, canvas);
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
   * Check if the canvas is empty (no notes or connections)
   * @returns {boolean} True if canvas has no content
   * @private
   */
  static isCanvasEmpty() {
    try {
      const stateJsonString = exportToJSON();
      const { data } = JSON.parse(stateJsonString);
      return data.n.length === 0 && data.c.length === 0;
    } catch (error) {
      log('Error checking canvas state:', error);
      return false; // If we can't check, don't auto-load to be safe
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

        // Smart auto-loading: if canvas is empty, load server data
        if (this.isCanvasEmpty()) {
          log('Canvas is empty, auto-loading server data...');
          this.loadState(document.getElementById('mainCanvas')).then(
            (success) => {
              if (success) {
                eventBus.emit('server.autoload.success', {
                  reason: 'Empty canvas on reconnect',
                });
              } else {
                log('Auto-load failed, but connection is still active');
              }
            },
          );
        }
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
