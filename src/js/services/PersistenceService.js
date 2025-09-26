/**
 * PersistenceService - Single source of truth for all state persistence
 *
 * Eliminates the legacy storage confusion by providing one clean,
 * predictable persistence layer.
 *
 * Design Goals:
 * - Single storage mechanism (no race conditions)
 * - Clean separation from in-memory state
 * - Predictable restore behavior
 * - Compatible with DataProvider architecture
 */

import { logger } from './logger.js';
import { STORAGE_KEY } from '../core/constants.js';
import { debounce } from '../utils/utils.js';

export class PersistenceService {
  constructor() {
    this.isInitialized = false;
    this.autosaveEnabled = true;

    // Internal state - this is the actual persisted state
    this._persistedState = {
      notes: [],
      connections: [],
      zoomLevel: 5,
      canvasType: 'Standard Canvas',
      colorState: {
        currentColor: 'yellow',
        notes: {},
      },
    };

    // Debounced save to prevent excessive localStorage writes
    this._debouncedSave = debounce(this._performSave.bind(this), 300);

    logger.info('PersistenceService: Created with clean state management');
  }

  /**
   * Initialize the service and load any existing state
   * @returns {boolean} true if state was loaded from storage
   */
  initialize() {
    if (this.isInitialized) {
      logger.warn('PersistenceService: Already initialized');
      return false;
    }

    const loaded = this._loadFromStorage();
    this.isInitialized = true;

    if (loaded) {
      logger.info('PersistenceService: Initialized with existing state', {
        noteCount: this._persistedState.notes.length,
        connectionCount: this._persistedState.connections.length,
      });
    } else {
      logger.info('PersistenceService: Initialized with default state');
    }

    return loaded;
  }

  /**
   * Get the current persisted state
   * @returns {object} Current state snapshot
   */
  getState() {
    return JSON.parse(JSON.stringify(this._persistedState));
  }

  /**
   * Update the entire state and persist it
   * @param {object} newState - New state to persist
   * @param {object} options - Save options
   */
  setState(newState, options = {}) {
    this._persistedState = {
      ...this._persistedState,
      ...newState,
    };

    logger.info('PersistenceService: State updated', {
      noteCount: this._persistedState.notes.length,
      connectionCount: this._persistedState.connections.length,
      silent: options.silent,
    });

    if (!options.silent && this.autosaveEnabled) {
      this.save();
    }
  }

  /**
   * Update just the notes array
   * @param {array} notes - New notes array
   */
  setNotes(notes) {
    this._persistedState.notes = [...notes];

    logger.info('PersistenceService: Notes updated', {
      noteCount: notes.length,
      noteIds: notes.map((n) => n.id),
    });

    if (this.autosaveEnabled) {
      this.save();
    }
  }

  /**
   * Update just the connections array
   * @param {array} connections - New connections array
   */
  setConnections(connections) {
    this._persistedState.connections = [...connections];

    logger.info('PersistenceService: Connections updated', {
      connectionCount: connections.length,
    });

    if (this.autosaveEnabled) {
      this.save();
    }
  }

  /**
   * Update color state
   * @param {object} colorState - New color state
   */
  setColorState(colorState) {
    this._persistedState.colorState = {
      ...this._persistedState.colorState,
      ...colorState,
    };

    logger.info('PersistenceService: Color state updated');

    if (this.autosaveEnabled) {
      this.save();
    }
  }

  /**
   * Save current state to localStorage (immediate)
   * @returns {boolean} true if save succeeded
   */
  save() {
    return this._performSave();
  }

  /**
   * Save current state to localStorage (debounced)
   */
  saveDebounced() {
    if (this.autosaveEnabled) {
      this._debouncedSave();
    }
  }

  /**
   * Clear all persisted state
   */
  clear() {
    // Reset to default state
    this._persistedState = {
      notes: [],
      connections: [],
      zoomLevel: 5,
      canvasType: 'Standard Canvas',
      colorState: {
        currentColor: 'yellow',
        notes: {},
      },
    };

    // Remove from localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
      logger.info('PersistenceService: State cleared from storage and memory');
      return true;
    } catch (error) {
      logger.error('PersistenceService: Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Check if there is any persisted state in storage
   * @returns {boolean} true if storage contains state
   */
  hasPersistedState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null && stored !== undefined;
    } catch (error) {
      logger.error('PersistenceService: Failed to check storage:', error);
      return false;
    }
  }

  /**
   * Enable autosave
   */
  enableAutosave() {
    this.autosaveEnabled = true;
    logger.info('PersistenceService: Autosave enabled');
  }

  /**
   * Disable autosave
   */
  disableAutosave() {
    this.autosaveEnabled = false;
    logger.info('PersistenceService: Autosave disabled');
  }

  /**
   * Get storage statistics for debugging
   * @returns {object} Storage stats
   */
  getStats() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return {
        hasStorage: !!stored,
        storageSize: stored ? stored.length : 0,
        memoryNoteCount: this._persistedState.notes.length,
        memoryConnectionCount: this._persistedState.connections.length,
        autosaveEnabled: this.autosaveEnabled,
        isInitialized: this.isInitialized,
      };
    } catch (error) {
      return {
        hasStorage: false,
        storageSize: 0,
        memoryNoteCount: this._persistedState.notes.length,
        memoryConnectionCount: this._persistedState.connections.length,
        autosaveEnabled: this.autosaveEnabled,
        isInitialized: this.isInitialized,
        error: error.message,
      };
    }
  }

  // Private methods

  /**
   * Load state from localStorage
   * @private
   * @returns {boolean} true if state was loaded
   */
  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return false;
      }

      const parsedState = JSON.parse(stored);

      // Validate and merge with defaults
      this._persistedState = {
        notes: Array.isArray(parsedState.notes) ? parsedState.notes : [],
        connections: Array.isArray(parsedState.connections)
          ? parsedState.connections
          : [],
        zoomLevel:
          typeof parsedState.zoomLevel === 'number' ? parsedState.zoomLevel : 5,
        canvasType: parsedState.canvasType || 'Standard Canvas',
        colorState: {
          currentColor: parsedState.colorState?.currentColor || 'yellow',
          notes: parsedState.colorState?.notes || {},
        },
      };

      return true;
    } catch (error) {
      logger.error('PersistenceService: Failed to load from storage:', error);
      return false;
    }
  }

  /**
   * Perform the actual save operation
   * @private
   * @returns {boolean} true if save succeeded
   */
  _performSave() {
    try {
      const serialized = JSON.stringify(this._persistedState);
      localStorage.setItem(STORAGE_KEY, serialized);

      logger.info('PersistenceService: State saved to storage', {
        size: serialized.length,
        noteCount: this._persistedState.notes.length,
      });

      return true;
    } catch (error) {
      logger.error('PersistenceService: Failed to save to storage:', error);
      return false;
    }
  }
}

// Export singleton instance
export const persistenceService = new PersistenceService();
