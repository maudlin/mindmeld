// src/js/services/mapSafetyService.js
import { ServerClient } from './serverClient.js';
import { notificationManager } from './notificationManager.js';
import { eventBus } from '../core/eventBus.js';
import { log } from '../utils/utils.js';

/**
 * MapSafetyService - Data Protection for Map Operations
 * Ensures current work is saved before switching maps or performing destructive operations
 * Provides user confirmation dialogs and tracks unsaved changes
 */
export class MapSafetyService {
  static isInitialized = false;

  /**
   * Initialize the service and set up event listeners for change tracking
   */
  static initialize() {
    if (this.isInitialized) {
      return;
    }

    // Set up event listeners to track content changes
    const events = [
      'note.created',
      'note.updated',
      'note.deleted',
      'connection.created',
      'connection.updated',
      'connection.deleted',
    ];

    events.forEach((eventName) => {
      eventBus.on(eventName, () => {
        this.updateLastEditTime();
      });
    });

    this.isInitialized = true;
    log('MapSafetyService initialized with change tracking');
  }

  /**
   * Update the timestamp when content changes occur
   * @private
   */
  static updateLastEditTime() {
    ServerClient.lastEditTime = Date.now();
  }

  /**
   * Check if there are unsaved changes by comparing timestamps
   * @returns {boolean} True if there are unsaved changes
   */
  static hasUnsavedChanges() {
    if (!ServerClient.lastEditTime || !ServerClient.lastSaveTime) {
      return false;
    }
    return ServerClient.lastEditTime > ServerClient.lastSaveTime;
  }

  /**
   * Get the current map context including ID, name, and state
   * @returns {Object} Map context information
   */
  static getCurrentMapContext() {
    const mapName = ServerClient.getCurrentMapName() || 'Untitled Map';
    const connectionStatus = ServerClient.getConnectionStatus();

    return {
      mapId: ServerClient.currentMapId,
      mapName: mapName,
      hasUnsavedChanges: this.hasUnsavedChanges(),
      isConnected: connectionStatus.isConnected,
    };
  }

  /**
   * Ensure current map is saved before performing operations
   * Forces immediate save bypassing debounce if needed
   * @returns {Promise<boolean>} True if save successful or not needed
   */
  static async ensureCurrentMapSaved() {
    try {
      // Only force save if auto-save is enabled and there are unsaved changes
      if (ServerClient.autoSaveEnabled && this.hasUnsavedChanges()) {
        return await ServerClient.forceSave();
      }

      return true;
    } catch (error) {
      log('Error ensuring map saved:', error);
      return false;
    }
  }

  /**
   * Show confirmation dialog for map operations with contextual messages
   * @param {string} operation - Type of operation (new-map, load-map, clear-canvas)
   * @param {string|null} newMapName - Name of the new/target map (optional)
   * @returns {Promise<boolean>} User's confirmation choice
   */
  static async confirmMapOperation(operation, newMapName = null) {
    const context = this.getCurrentMapContext();

    const messages = {
      'new-map': `Create new map "${newMapName}"? Current work will be saved as "${context.mapName}".`,
      'load-map': `Load "${newMapName || 'Unknown Map'}"? Current map "${context.mapName}" will be saved first.`,
      'clear-canvas': `Clear all content from "${context.mapName}"? This cannot be undone.`,
    };

    // Default message for unknown operations
    const message = Object.prototype.hasOwnProperty.call(messages, operation)
      ? messages[operation]
      : `Perform ${operation}? Current map "${context.mapName}" may be affected.`;

    return await notificationManager.confirm(message);
  }
}
