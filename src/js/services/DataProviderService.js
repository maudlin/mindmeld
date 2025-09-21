// src/js/services/DataProviderService.js
// Central service for DataProvider operations - Singleton pattern

import { LocalJSONProvider } from '../data/providers/LocalJSONProvider.js';
import { isDebugEnabled, getProviderType } from '../core/featureFlags.js';

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
      // Use feature flags to determine provider type
      this._providerType = getProviderType();

      // For YjsProvider, we need async initialization, so start with local provider
      // and migrate to YjsProvider during init() if needed
      if (this._providerType === 'yjs') {
        console.log(
          'DataProviderService: YjsProvider will be initialized during init()',
        );
        this._provider = new LocalJSONProvider(); // Temporary fallback
        this._needsYjsMigration = true;
      } else {
        this._provider = new LocalJSONProvider();
        this._needsYjsMigration = false;
      }

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
      case 'yjs': {
        // YjsProvider re-enabled with compatibility layer (zero external dependencies)
        const { initializeYjsProvider } = await import(
          '../core/featureFlags.js'
        );
        const YjsProviderClass = await initializeYjsProvider();
        if (!YjsProviderClass) {
          throw new Error('YjsProvider not available');
        }
        return new YjsProviderClass();
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
   * @returns {Promise<() => void>} cleanup function
   */
  async init(mapId = null, options = {}) {
    // Migrate to YjsProvider if needed
    if (this._needsYjsMigration) {
      await this._migrateToYjsProvider();
    }

    this._ensureInitialized();
    this._cleanup = this._provider.init(mapId, options);
    return this._cleanup;
  }

  /**
   * Migrate from LocalJSONProvider to YjsProvider
   * @private
   */
  async _migrateToYjsProvider() {
    if (isDebugEnabled()) {
      console.log('DataProviderService: Migrating to YjsProvider');
    }

    // Export current state from LocalJSONProvider
    const currentState = this._provider.exportJSON();

    // Create YjsProvider
    const yjsProvider = await this._createProvider('yjs');

    // Initialize YjsProvider in offline mode (no server connection for migration)
    yjsProvider.init(null, {});

    // Import state into YjsProvider
    if (currentState && currentState !== '{"data":{"n":[],"c":[]}}') {
      yjsProvider.importJSON(currentState);
    }

    // Replace provider
    this._provider = yjsProvider;
    this._needsYjsMigration = false;

    if (isDebugEnabled()) {
      console.log('DataProviderService: Migration to YjsProvider complete');
    }
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
   * Ensure provider is initialized
   * @private
   */
  _ensureInitialized() {
    if (!this._provider) {
      throw new Error('DataProviderService not properly initialized');
    }
  }
}
