// src/js/services/serverClient.js
import { ServerConnectionService } from './serverConnectionService.js';
import { ConnectionService } from './connectionService.js';
import { exportToJSON, importFromJSON } from '../data/dataStore.js';
import { eventBus } from '../core/eventBus.js';
import { debounce } from '../utils/utils.js';
import { logger } from './logger.js';

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
  static loadingInProgress = false;
  static currentMapId = null;
  static currentMapName = 'Untitled Map';
  static currentETag = null;

  // Timestamp tracking for unsaved changes detection
  static lastSaveTime = null;
  static lastEditTime = null;

  // Map list caching
  static mapsCache = null;
  static mapsCacheExpiry = null;
  static MAPS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get list of user's maps with metadata
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of maps to return (default: 25)
   * @param {number} options.offset - Number of maps to skip (default: 0)
   * @param {string} options.search - Search term to filter map names
   * @returns {Promise<Object>} Maps list with metadata: { maps, totalCount, hasMore }
   */
  static async getMaps(options = {}) {
    const serverUri = ServerConnectionService.getServerUri();
    if (!serverUri) {
      const error = 'No server configured';
      eventBus.emit('server.maps.error', { error });
      throw new Error(error);
    }

    // Check cache first
    const now = Date.now();
    if (this.mapsCache && this.mapsCacheExpiry && now < this.mapsCacheExpiry) {
      return this.mapsCache;
    }

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.set('limit', String(options.limit || 25));

      if (options.offset) {
        params.set('offset', String(options.offset));
      }

      if (options.search) {
        params.set('search', options.search);
      }

      const response = await fetch(`${serverUri}/maps?${params}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        ServerConnectionService.setConnectionStatus('error');
        const errorMessage =
          errorData.detail ||
          `Server error: ${response.status} ${response.statusText}`;

        eventBus.emit('server.maps.error', {
          error: errorMessage,
        });

        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Cache the result (only cache if no search/offset for simplicity)
      if (!options.search && !options.offset) {
        this.mapsCache = result;
        this.mapsCacheExpiry = now + this.MAPS_CACHE_DURATION;
      }

      eventBus.emit('server.maps.loaded', {
        count: result.maps?.length || 0,
        totalCount: result.totalCount || 0,
      });

      logger.info(
        'Maps loaded successfully:',
        result.maps?.length || 0,
        'maps',
      );

      return result;
    } catch (error) {
      eventBus.emit('server.maps.error', {
        error: error.message,
      });

      logger.info('Error loading maps from server:', error);
      throw error;
    }
  }

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
        // Create new map - pass complete state including metadata
        return await this._createNewMapInternal(serverUri, parsedState);
      }
    } catch (error) {
      ServerConnectionService.setConnectionStatus('error');
      eventBus.emit('server.save.error', {
        error: error.message,
      });
      logger.info('Error saving state to server:', error);
      return false;
    }
  }

  /**
   * Force immediate save bypassing debounce
   * Used by MapSafetyService to ensure current work is saved
   * @returns {Promise<boolean>} True if save successful
   */
  static async forceSave() {
    if (!this.autoSaveEnabled) {
      return false;
    }

    const success = await this.saveState();
    if (success) {
      this.lastSaveTime = Date.now();
    }
    return success;
  }

  /**
   * Create new map with user-specified name and MapSafetyService integration
   * @param {string} mapName - Optional name for the new map
   * @param {Object} options - Optional creation options
   * @param {boolean} options.clearCanvas - Whether to clear the canvas after creation (default: true)
   * @returns {Promise<Object>} The created map object
   */
  static async createNewMap(mapName, options = {}) {
    const { MapSafetyService } = await import('./mapSafetyService.js');

    // Ensure current work is saved first
    const saveSuccess = await MapSafetyService.ensureCurrentMapSaved(
      () => this.forceSave(),
      this.autoSaveEnabled,
      this.lastEditTime,
      this.lastSaveTime,
    );
    if (!saveSuccess) {
      throw new Error('Failed to save current map before creating new one');
    }

    const serverUri = ServerConnectionService.getServerUri();
    if (!serverUri) {
      const error = 'No server configured';
      eventBus.emit('server.save.error', { error });
      throw new Error(error);
    }

    try {
      // Get current state as JSON and parse it
      const stateJsonString = exportToJSON();
      const parsedState = JSON.parse(stateJsonString);
      const stateData = parsedState.data;

      // Use provided name or generate default
      const finalMapName =
        mapName || `MindMeld Map - ${new Date().toLocaleDateString()}`;

      const response = await fetch(`${serverUri}/maps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: finalMapName,
          data: stateData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        ServerConnectionService.setConnectionStatus('error');
        const errorMessage =
          errorData.detail ||
          `Server error: ${response.status} ${response.statusText}`;

        eventBus.emit('server.save.error', {
          error: errorMessage,
        });

        throw new Error(errorMessage);
      }

      const result = await response.json();
      const etag = response.headers.get('ETag')?.replace(/"/g, '');

      // Update current map tracking
      this.currentMapId = result.id;
      this.currentMapName = result.name;
      this.currentETag = etag;

      // Save to localStorage for persistence across browser restarts
      this.saveCurrentMapIdToStorage(result.id);

      // Clear maps cache since we have a new map
      this.clearMapsCache();

      // Clear canvas if requested (default behavior)
      if (options.clearCanvas !== false) {
        const canvas = document.getElementById('canvas');
        if (canvas) {
          await importFromJSON('{"data":{"n":[],"c":[]}}', canvas);
        }
      }

      eventBus.emit('map.changed', {
        mapId: result.id,
        mapName: result.name,
        operation: 'create',
      });

      eventBus.emit('server.save.success', {
        mapId: result.id,
        version: result.version,
      });

      logger.info('New map created successfully:', result.id, result.name);

      // Update timestamp for successful save
      this.lastSaveTime = Date.now();

      return result;
    } catch (error) {
      eventBus.emit('server.save.error', {
        error: error.message,
      });

      logger.info('Error creating new map:', error);
      throw error;
    }
  }

  /**
   * Load a specific map by ID with MapSafetyService integration
   * @param {string} mapId - The ID of the map to load
   * @param {Object} options - Optional loading options
   * @param {string} options.mapName - Name of the map being loaded (for confirmation dialog)
   * @param {HTMLElement} options.canvas - Canvas element to import data into (defaults to canvas)
   * @returns {Promise<Object|boolean>} The loaded map object or false if cancelled
   */
  static async loadMap(mapId, options = {}) {
    const { MapSafetyService } = await import('./mapSafetyService.js');

    // Get canvas element
    const canvas = options.canvas || document.getElementById('canvas');
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    // Confirm the operation if mapName is provided
    if (options.mapName) {
      const contextData = {
        mapId: this.currentMapId,
        mapName: this.getCurrentMapName(),
        lastEditTime: this.lastEditTime,
        lastSaveTime: this.lastSaveTime,
        isConnected: ServerClient.getConnectionStatus()?.isConnected || false,
      };
      const confirmed = await MapSafetyService.confirmMapOperation(
        'load-map',
        contextData,
        options.mapName,
      );
      if (!confirmed) {
        return false;
      }
    }

    // Ensure current work is saved first
    const saveSuccess = await MapSafetyService.ensureCurrentMapSaved();
    if (!saveSuccess) {
      throw new Error('Failed to save current map before loading');
    }

    const serverUri = ServerConnectionService.getServerUri();
    if (!serverUri) {
      const error = 'No server configured';
      eventBus.emit('server.load.error', { error });
      throw new Error(error);
    }

    try {
      // Mute auto-save events during map loading to prevent ETag conflicts
      if (
        ServerClient.debouncedSave &&
        typeof ServerClient.debouncedSave.cancel === 'function'
      ) {
        ServerClient.debouncedSave.cancel();
      }
      this.removeAutoSaveListeners();
      this.loadingInProgress = true;

      const response = await fetch(`${serverUri}/maps/${mapId}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Don't change connection status for map loading failures - connection is still valid
        const errorMessage =
          errorData.detail ||
          `Server error: ${response.status} ${response.statusText}`;

        eventBus.emit('server.load.error', {
          error: errorMessage,
        });

        throw new Error(errorMessage);
      }

      const mapData = await response.json();
      const etag = response.headers.get('ETag')?.replace(/"/g, '');

      // Update current map tracking
      this.currentMapId = mapData.id;
      this.currentMapName = mapData.name;
      this.currentETag = etag;

      // Save to localStorage for persistence across browser restarts
      this.saveCurrentMapIdToStorage(mapData.id);

      // Extract state data - handle both object and JSON string formats
      let stateData;
      if (mapData.stateJson) {
        // Server returns JSON string in stateJson field
        try {
          const parsedState = JSON.parse(mapData.stateJson);
          stateData = parsedState.data || parsedState;
        } catch (error) {
          throw new Error(
            `Invalid JSON in stateJson for map ${mapData.id}: ${error.message}`,
          );
        }
      } else {
        // Fallback to direct object fields
        stateData = mapData.data || mapData.state;
      }

      // Validate data structure - throw error if corrupt
      this.validateStateData(stateData, mapData.id);
      const stateJsonString = JSON.stringify({ data: stateData });

      // Import the map data into the canvas
      await importFromJSON(stateJsonString, canvas);

      eventBus.emit('map.changed', {
        mapId: mapData.id,
        mapName: mapData.name,
        operation: 'load',
      });

      eventBus.emit('server.load.success', {
        mapId: mapData.id,
        mapName: mapData.name,
        version: mapData.version,
      });

      logger.info('Map loaded successfully:', mapData.id, mapData.name);

      return mapData;
    } catch (error) {
      eventBus.emit('server.load.error', {
        error: error.message,
      });

      logger.info('Error loading map:', error);
      throw error;
    } finally {
      // Re-enable auto-save listeners and clear loading flag
      setTimeout(() => {
        this.setupAutoSaveListeners();
        this.loadingInProgress = false;
      }, 100);
    }
  }

  /**
   * Delete a map from the server
   * @param {string} mapId - The ID of the map to delete
   * @returns {Promise<boolean>} True if deletion was successful
   */
  static async deleteMap(mapId) {
    const serverUri = ServerConnectionService.getServerUri();
    if (!serverUri) {
      eventBus.emit('server.delete.error', {
        error: 'No server connection available',
      });
      return false;
    }

    try {
      const normalizedUri = serverUri.replace(/\/$/, '');
      const response = await fetch(
        `${normalizedUri}/maps/${encodeURIComponent(mapId)}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (response.ok) {
        eventBus.emit('server.delete.success', {
          mapId,
        });

        // If we just deleted the currently loaded map, clear the current map ID
        if (this.currentMapId === mapId) {
          this.currentMapId = null;
          this.currentETag = null;
          this.currentMapName = null;
        }

        logger.info('Map deleted successfully:', mapId);
        return true;
      } else {
        const errorText = await response.text();
        eventBus.emit('server.delete.error', {
          error: `Server responded with ${response.status}: ${errorText}`,
        });
        logger.info('Failed to delete map:', response.status, errorText);
        return false;
      }
    } catch (error) {
      eventBus.emit('server.delete.error', {
        error: error.message,
      });
      logger.info('Error deleting map:', error);
      return false;
    }
  }

  /**
   * Internal method for creating new maps during auto-save
   * @private
   */
  static async _createNewMapInternal(serverUri, parsedState) {
    // Extract map name from metadata, fallback to generic name
    const mapName =
      parsedState.metadata?.title ||
      `MindMeld Map - ${new Date().toLocaleDateString()}`;

    const response = await fetch(`${serverUri}/maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: mapName,
        data: parsedState.data,
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
    logger.info('New map created on server successfully:', result.id);

    // Update timestamp for successful save
    this.lastSaveTime = Date.now();

    return true;
  }

  /**
   * Update existing map on server
   * @private
   */
  static async updateExistingMap(serverUri, stateData, retryCount = 0) {
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
      const MAX_RETRIES = 3;

      if (retryCount >= MAX_RETRIES) {
        const error = `ETag conflict: Maximum retries (${MAX_RETRIES}) exceeded. Please refresh and try again.`;
        logger.info('ServerClient:', error);
        ServerConnectionService.setConnectionStatus('error');
        eventBus.emit('server.save.error', { error });
        throw new Error(error);
      }

      logger.info(
        `ServerClient: ETag conflict detected (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), auto-resolving by fetching latest version`,
      );

      try {
        // Fetch the latest version to get the current ETag
        await this.loadState(document.getElementById('canvas'));

        // Try saving again with the updated ETag - increment retry count to prevent infinite recursion
        logger.info(
          `ServerClient: Retrying save after ETag refresh (attempt ${retryCount + 1})...`,
        );
        return await this.updateExistingMap(
          serverUri,
          stateData,
          retryCount + 1,
        );
      } catch (retryError) {
        logger.info(
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
    logger.info('Map updated on server successfully:', result.id);

    // Update timestamp for successful save
    this.lastSaveTime = Date.now();

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

    // Set loading flag to prevent auto-save during load
    this.loadingInProgress = true;

    // Cancel any pending auto-save since we're loading fresh data
    if (
      ServerClient.debouncedSave &&
      typeof ServerClient.debouncedSave.cancel === 'function'
    ) {
      ServerClient.debouncedSave.cancel();
    }

    // Temporarily disable auto-save listeners during load
    this.removeAutoSaveListeners();

    const serverUri = ServerConnectionService.getServerUri();
    if (!serverUri) {
      this.loadingInProgress = false;
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
      logger.info('Error loading state from server:', error);
      return false;
    } finally {
      // Re-enable auto-save listeners and clear loading flag
      setTimeout(() => {
        this.setupAutoSaveListeners();
        this.loadingInProgress = false;
      }, 100);
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

    // Extract state data - handle both object and JSON string formats
    let stateData;
    if (mapData.stateJson) {
      // Server returns JSON string in stateJson field
      try {
        const parsedState = JSON.parse(mapData.stateJson);
        stateData = parsedState.data || parsedState;
      } catch (error) {
        throw new Error(
          `Invalid JSON in stateJson for map ${mapData.id}: ${error.message}`,
        );
      }
    } else {
      // Fallback to direct object fields
      stateData = mapData.data || mapData.state;
    }

    // Debug logging to understand the data structure
    logger.info('ServerClient: Raw mapData structure:', {
      hasData: !!mapData.data,
      hasState: !!mapData.state,
      hasStateJson: !!mapData.stateJson,
      stateDataType: typeof stateData,
      stateDataKeys: stateData ? Object.keys(stateData) : 'null/undefined',
    });

    if (!stateData) {
      throw new Error('No data or state found in server response');
    }

    // Validate data structure - throw error if corrupt
    this.validateStateData(stateData, mapData.id);
    const normalizedData = stateData;

    const stateJsonString = JSON.stringify({ data: normalizedData });
    logger.info('ServerClient: Normalized data for import:', {
      noteCount: normalizedData.n.length,
      connectionCount: normalizedData.c.length,
    });

    await importFromJSON(stateJsonString, canvas);

    eventBus.emit('server.load.success', {
      mapId: mapData.id,
      mapName: mapData.name,
      version: mapData.version,
    });
    logger.info('Map loaded from server successfully:', mapData.id);
    return true;
  }

  /**
   * Validate state data structure and throw error if corrupt
   * @private
   */
  static validateStateData(stateData, mapId) {
    if (!stateData || typeof stateData !== 'object') {
      throw new Error(`Invalid state data for map ${mapId}: not an object`);
    }

    // Check for double-wrapped data (indicates server corruption)
    if (stateData.data && typeof stateData.data === 'object') {
      throw new Error(
        `Corrupt state data for map ${mapId}: double-wrapped data detected`,
      );
    }

    // Ensure we have the required structure
    if (!stateData.n && !stateData.c) {
      throw new Error(
        `Invalid state data for map ${mapId}: missing 'n' (notes) and 'c' (connections) arrays`,
      );
    }

    // Validate array types
    if (stateData.n && !Array.isArray(stateData.n)) {
      throw new Error(
        `Invalid state data for map ${mapId}: 'n' (notes) is not an array`,
      );
    }

    if (stateData.c && !Array.isArray(stateData.c)) {
      throw new Error(
        `Invalid state data for map ${mapId}: 'c' (connections) is not an array`,
      );
    }
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
      // Don't change connection status for map list failures - connection is still valid
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
    logger.info('Auto-save enabled');
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
    logger.info('Auto-save disabled');
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

    if (this.loadingInProgress) {
      logger.info('ServerClient: Skipping auto-save during loading operation');
      return false;
    }

    return await this.saveState();
  }, 2000); // 2 second debounce

  /**
   * Set up event listeners for auto-save triggers
   */
  static setupAutoSaveListeners() {
    // Listen for events that should trigger auto-save
    eventBus.on('note.created', ServerClient.debouncedSave);
    eventBus.on('note.updated', ServerClient.debouncedSave);
    eventBus.on('note.deleted', ServerClient.debouncedSave);
    eventBus.on('connection.created', ServerClient.debouncedSave);
    eventBus.on('connection.updated', ServerClient.debouncedSave);
    eventBus.on('connection.deleted', ServerClient.debouncedSave);
    eventBus.on('note.color.changed', ServerClient.debouncedSave);
    eventBus.on('map.title.changed', ServerClient.debouncedSave);
  }

  static removeAutoSaveListeners() {
    // Remove auto-save listeners to prevent triggering during load
    eventBus.off('note.created', this.debouncedSave);
    eventBus.off('note.updated', this.debouncedSave);
    eventBus.off('note.deleted', this.debouncedSave);
    eventBus.off('connection.created', this.debouncedSave);
    eventBus.off('connection.updated', this.debouncedSave);
    eventBus.off('connection.deleted', this.debouncedSave);
    eventBus.off('note.color.changed', this.debouncedSave);
    eventBus.off('map.title.changed', this.debouncedSave);
  }

  /**
   * Get current connection status
   * @returns {Object} Connection state object
   */
  static getConnectionStatus() {
    return ServerConnectionService.getConnectionState();
  }

  /**
   * Get current map name
   * @returns {string} The current map name
   */
  static getCurrentMapName() {
    return this.currentMapName;
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
      logger.info('Save queued - server not available');
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
        logger.info('Queued saves processed successfully');
      } else {
        eventBus.emit('server.save.queue.failed');
        logger.info('Failed to process queued saves');
      }
    } catch (error) {
      eventBus.emit('server.save.queue.failed');
      logger.info('Error processing queued saves:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Check if required services are initialized for data loading
   * @returns {boolean} True if services are ready
   * @private
   */
  static areServicesReady() {
    // Check if ConnectionService has been properly initialized with a connection manager
    try {
      return (
        ConnectionService &&
        typeof ConnectionService.initializeConnectionDrawing === 'function' &&
        ConnectionService.connectionManager !== null
      );
    } catch {
      return false;
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
      logger.info('Error checking canvas state:', error);
      return false; // If we can't check, don't auto-load to be safe
    }
  }

  /**
   * Initialize server client functionality
   */
  static initialize() {
    // Initialize map persistence
    this.initializeMapPersistence();

    // Listen for map edit timestamp events from MapSafetyService
    eventBus.on('map.edit.timestamp', ({ timestamp }) => {
      this.lastEditTime = timestamp;
    });

    // Listen for connection status changes
    eventBus.on('server.connection.status.changed', ({ isConnected }) => {
      if (isConnected) {
        // Connection restored - enable auto-save and process queue
        this.enableAutoSave();
        this.processQueuedSaves();

        // Smart auto-loading: if canvas is empty, load server data
        // But only if all required services are initialized
        if (this.isCanvasEmpty() && this.areServicesReady()) {
          logger.info(
            'Canvas is empty and services ready, auto-loading server data...',
          );
          this.loadState(document.getElementById('canvas')).then((success) => {
            if (success) {
              eventBus.emit('server.autoload.success', {
                reason: 'Empty canvas on reconnect',
              });
            } else {
              logger.info('Auto-load failed, but connection is still active');
            }
          });
        } else if (this.isCanvasEmpty()) {
          logger.info(
            'Canvas is empty but services not ready yet, deferring auto-load',
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

    // Listen for when services become ready to retry deferred auto-loads
    eventBus.on('app.services.ready', () => {
      const currentConnectionState =
        ServerConnectionService.getConnectionState();
      if (
        currentConnectionState.isConnected &&
        this.isCanvasEmpty() &&
        this.areServicesReady()
      ) {
        logger.info('Services now ready, attempting deferred auto-load...');
        this.loadState(document.getElementById('canvas')).then((success) => {
          if (success) {
            eventBus.emit('server.autoload.success', {
              reason: 'Deferred load after services ready',
            });
          }
        });
      }
    });

    logger.info('ServerClient initialized');
  }

  /**
   * Save current map ID to localStorage for persistence across browser restarts
   * @param {string} mapId - The map ID to save
   */
  static saveCurrentMapIdToStorage(mapId) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('currentMapId', mapId);
        logger.info('Saved currentMapId to localStorage:', mapId);
      }
    } catch (error) {
      logger.info('Failed to save currentMapId to localStorage:', error);
    }
  }

  /**
   * Load current map ID from localStorage
   * @returns {string|null} The saved map ID or null if not found
   */
  static loadCurrentMapIdFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const mapId = localStorage.getItem('currentMapId');
        if (mapId) {
          logger.info('Loaded currentMapId from localStorage:', mapId);
          return mapId;
        }
      }
    } catch (error) {
      logger.info('Failed to load currentMapId from localStorage:', error);
    }
    return null;
  }

  /**
   * Clear the maps cache
   */
  static clearMapsCache() {
    this.mapsCache = null;
    this.mapsCacheExpiry = null;
    logger.info('Maps cache cleared');
  }

  /**
   * Initialize map persistence by loading saved map ID
   */
  static initializeMapPersistence() {
    const savedMapId = this.loadCurrentMapIdFromStorage();
    if (savedMapId) {
      this.currentMapId = savedMapId;
      logger.info('Initialized with saved map ID:', savedMapId);
    }
  }
}
