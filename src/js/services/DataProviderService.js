// src/js/services/DataProviderService.js
// Central service for DataProvider operations - Singleton pattern

import { LocalJSONProvider } from '../data/providers/LocalJSONProvider.js';
import { isDebugEnabled } from '../core/featureFlags.js';

/**
 * DataProviderService - Central integration point for DataProvider operations
 * Implements singleton pattern and provides unified interface to DataProviders
 * Supports both LocalJSONProvider and YjsProvider based on feature flags
 */
export class DataProviderService {
  static _instance = null;

  constructor() {
    if (DataProviderService._instance) {
      throw new Error('Use DataProviderService.getInstance() instead of new');
    }

    try {
      // Start with local provider, can be switched later
      this._providerType = 'local';
      this._provider = new LocalJSONProvider();
      this._cleanup = null;
      this._applyingSnapshot = false; // Guard for preventing feedback loops

      if (isDebugEnabled()) {
        console.log(
          `DataProviderService: Using ${this._providerType} provider`,
        );
      }

      DataProviderService._instance = this;
    } catch (error) {
      throw new Error(
        `Failed to initialize DataProviderService: ${error.message}`,
      );
    }
  }

  /**
   * Create provider instance based on type
   * @param {'local'|'yjs'} type
   * @returns {LocalJSONProvider}
   * @private
   */
  async _createProvider(type) {
    switch (type) {
      case 'yjs':
        try {
          // Dynamic import to avoid loading when not needed
          const { YjsProvider } = await import(
            '../data/providers/YjsProvider.js'
          );
          return new YjsProvider();
        } catch (error) {
          console.warn(
            'YjsProvider not available, falling back to LocalJSONProvider:',
            error.message,
          );
          return new LocalJSONProvider();
        }
      case 'local':
      default:
        return new LocalJSONProvider();
    }
  }

  /**
   * Get singleton instance of DataProviderService
   * @returns {DataProviderService}
   */
  static getInstance() {
    if (!DataProviderService._instance) {
      new DataProviderService();
    }
    return DataProviderService._instance;
  }

  /**
   * Initialize the provider
   * @param {string|null} mapId
   * @param {import('../data/providers/DataProvider.js').ProviderInitOptions} [options]
   * @returns {() => void} cleanup function
   */
  init(mapId = null, options = {}) {
    this._ensureInitialized();
    this._cleanup = this._provider.init(mapId, options);
    return this._cleanup;
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
    if (this._provider && typeof this._provider.destroy === 'function') {
      this._provider.destroy();
    }
    DataProviderService._instance = null;
  }

  /**
   * Check if service is properly initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._provider !== null;
  }

  /**
   * Subscribe to provider changes with optional snapshot guard
   * @param {(change: {type:'notes'|'connections'|'meta'|'snapshot', origin:'user'|'system', payload:any}) => void} onChange
   * @returns {() => void} unsubscribe function
   */
  subscribe(onChange) {
    this._ensureInitialized();

    // Only add wrapper logic when using advanced features (YjsProvider or debugging)
    if (
      this._providerType === 'yjs' ||
      isDebugEnabled() ||
      this._applyingSnapshot
    ) {
      return this._provider.subscribe((change) => {
        // Guard against feedback loops during snapshot application
        if (this._applyingSnapshot && change.origin === 'system') {
          if (isDebugEnabled()) {
            console.log(
              'DataProviderService: Skipping change during snapshot application',
              change,
            );
          }
          return;
        }

        if (isDebugEnabled()) {
          console.log('DataProviderService: Emitting change', change);
        }

        onChange(change);
      });
    } else {
      // Direct delegation for LocalJSONProvider to maintain backward compatibility
      return this._provider.subscribe(onChange);
    }
  }

  /**
   * Get current state snapshot
   * @returns {{ data: { n:any[], c:any[] } }}
   */
  getSnapshot() {
    this._ensureInitialized();
    return this._provider.getSnapshot();
  }

  /**
   * Import JSON data with snapshot guard to prevent feedback loops
   * @param {string} json
   */
  async importJSON(json) {
    this._ensureInitialized();

    this._applyingSnapshot = true;
    try {
      if (isDebugEnabled()) {
        console.log(
          'DataProviderService: Starting importJSON with snapshot guard',
        );
      }

      const result = await this._provider.importJSON(json);

      if (isDebugEnabled()) {
        console.log('DataProviderService: importJSON completed successfully');
      }

      return result;
    } finally {
      this._applyingSnapshot = false;
      if (isDebugEnabled()) {
        console.log('DataProviderService: Snapshot guard released');
      }
    }
  }

  /**
   * Export current state as JSON
   * @returns {string}
   */
  exportJSON() {
    this._ensureInitialized();
    return this._provider.exportJSON();
  }

  /**
   * Upsert a note
   * @param {{ id:string, content?:string, pos?:[number,number], color?:string }} note
   * @param {{origin?:'user'|'system'}} [opts]
   */
  upsertNote(note, opts = {}) {
    this._ensureInitialized();
    return this._provider.upsertNote(note, opts);
  }

  /**
   * Delete a note
   * @param {string} id
   * @param {{origin?:'user'|'system'}} [opts]
   */
  deleteNote(id, opts = {}) {
    this._ensureInitialized();
    return this._provider.deleteNote(id, opts);
  }

  /**
   * Upsert a connection
   * @param {{ id?:string, from:string, to:string, type:number }} conn
   * @param {{origin?:'user'|'system'}} [opts]
   */
  upsertConnection(conn, opts = {}) {
    this._ensureInitialized();
    return this._provider.upsertConnection(conn, opts);
  }

  /**
   * Delete a connection
   * @param {string} connId
   * @param {{origin?:'user'|'system'}} [opts]
   */
  deleteConnection(connId, opts = {}) {
    this._ensureInitialized();
    return this._provider.deleteConnection(connId, opts);
  }

  /**
   * Set meta data
   * @param {Partial<{ zoomLevel:number, canvasType:string, mapName:string }>} meta
   * @param {{origin?:'user'|'system'}} [opts]
   */
  setMeta(meta, opts = {}) {
    this._ensureInitialized();
    return this._provider.setMeta(meta, opts);
  }

  /**
   * Get meta data
   * @returns {{ zoomLevel:number, canvasType:string, mapName:string }}
   */
  getMeta() {
    this._ensureInitialized();
    return this._provider.getMeta();
  }

  /**
   * Pause autosave operations
   */
  pauseAutosave() {
    this._ensureInitialized();
    return this._provider.pauseAutosave();
  }

  /**
   * Resume autosave operations
   */
  resumeAutosave() {
    this._ensureInitialized();
    return this._provider.resumeAutosave();
  }

  /**
   * Get hydration progress status
   * @returns {boolean}
   */
  get hydrationInProgress() {
    this._ensureInitialized();
    return this._provider.hydrationInProgress;
  }

  /**
   * Get current provider type
   * @returns {'local'|'yjs'}
   */
  getProviderType() {
    return this._providerType;
  }

  /**
   * Check if currently applying snapshot (for debugging)
   * @returns {boolean}
   */
  get isApplyingSnapshot() {
    return this._applyingSnapshot;
  }

  /**
   * Enable collaboration mode when server supports WebSocket
   * @param {string} serverUrl - The collaboration server URL
   * @param {string} mapId - The map to load collaboratively
   * @returns {Promise<boolean>} True if collaboration was enabled, false if fallback to local
   */
  async enableCollaboration(serverUrl, mapId) {
    try {
      console.log(
        'DataProviderService: Attempting to enable collaboration mode',
        { serverUrl, mapId },
      );

      // Clean up current provider
      if (this._cleanup) {
        this._cleanup();
        this._cleanup = null;
      }

      // Create YjsProvider for collaboration
      const newProvider = await this._createProvider('yjs');

      // If YjsProvider was successfully created, switch to it
      if (newProvider.constructor.name === 'YjsProvider') {
        this._provider = newProvider;
        this._providerType = 'yjs';

        console.log(
          'DataProviderService: Successfully switched to YjsProvider for collaboration',
        );
        return true;
      } else {
        console.warn(
          'DataProviderService: Failed to create YjsProvider, staying with LocalJSONProvider',
        );
        return false;
      }
    } catch (error) {
      console.error(
        'DataProviderService: Error enabling collaboration:',
        error,
      );
      return false;
    }
  }

  /**
   * Disable collaboration mode and return to local provider
   */
  disableCollaboration() {
    try {
      console.log('DataProviderService: Disabling collaboration mode');

      // Clean up current provider
      if (this._cleanup) {
        this._cleanup();
        this._cleanup = null;
      }

      // Switch back to local provider
      this._provider = new LocalJSONProvider();
      this._providerType = 'local';

      console.log(
        'DataProviderService: Successfully switched back to LocalJSONProvider',
      );
    } catch (error) {
      console.error(
        'DataProviderService: Error disabling collaboration:',
        error,
      );
    }
  }

  /**
   * Ensure provider is initialized
   * @private
   */
  _ensureInitialized() {
    if (!this._provider) {
      throw new Error('DataProviderService not properly initialized');
    }
  }
}
