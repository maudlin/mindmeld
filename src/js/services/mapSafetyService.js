// src/js/services/mapSafetyService.js
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
    // This will be called by ServerClient to update its own timestamp
    // The actual timestamp update is now handled by ServerClient
    const timestamp = Date.now();
    eventBus.emit('map.edit.timestamp', { timestamp });
  }

  /**
   * Check if there are unsaved changes by comparing timestamps
   * @param {number} lastEditTime - Timestamp of last edit
   * @param {number} lastSaveTime - Timestamp of last save
   * @returns {boolean} True if there are unsaved changes
   */
  static hasUnsavedChanges(lastEditTime, lastSaveTime) {
    if (!lastEditTime || !lastSaveTime) {
      return false;
    }
    return lastEditTime > lastSaveTime;
  }

  /**
   * Get the current map context including ID, name, and state
   * @param {Object} contextData - Map context data
   * @param {string} contextData.mapId - Current map ID
   * @param {string} contextData.mapName - Current map name
   * @param {number} contextData.lastEditTime - Timestamp of last edit
   * @param {number} contextData.lastSaveTime - Timestamp of last save
   * @param {boolean} contextData.isConnected - Connection status
   * @returns {Object} Map context information
   */
  static getCurrentMapContext(contextData) {
    const mapName = contextData.mapName || 'Untitled Map';

    return {
      mapId: contextData.mapId,
      mapName: mapName,
      hasUnsavedChanges: this.hasUnsavedChanges(
        contextData.lastEditTime,
        contextData.lastSaveTime,
      ),
      isConnected: contextData.isConnected,
    };
  }

  /**
   * Ensure current map is saved before performing operations
   * Forces immediate save bypassing debounce if needed
   * @param {Function} forceSaveCallback - Function to call to force save
   * @param {boolean} autoSaveEnabled - Whether auto-save is enabled
   * @param {number} lastEditTime - Timestamp of last edit
   * @param {number} lastSaveTime - Timestamp of last save
   * @returns {Promise<boolean>} True if save successful or not needed
   */
  static async ensureCurrentMapSaved(
    forceSaveCallback,
    autoSaveEnabled,
    lastEditTime,
    lastSaveTime,
  ) {
    try {
      // Only force save if auto-save is enabled and there are unsaved changes
      if (
        autoSaveEnabled &&
        this.hasUnsavedChanges(lastEditTime, lastSaveTime)
      ) {
        return await forceSaveCallback();
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
   * @param {Object} contextData - Map context data
   * @param {string|null} newMapName - Name of the new/target map (optional)
   * @returns {Promise<boolean>} User's confirmation choice
   */
  static async confirmMapOperation(operation, contextData, newMapName = null) {
    const context = this.getCurrentMapContext(contextData);

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
