// src/js/services/DataProviderService.js
// Central service for DataProvider operations - Singleton pattern

import { LocalJSONProvider } from '../data/providers/LocalJSONProvider.js';

/**
 * DataProviderService - Central integration point for DataProvider operations
 * Implements singleton pattern and provides unified interface to LocalJSONProvider
 */
export class DataProviderService {
  static _instance = null;

  constructor() {
    if (DataProviderService._instance) {
      throw new Error('Use DataProviderService.getInstance() instead of new');
    }

    try {
      this._provider = new LocalJSONProvider();
      this._cleanup = null;
      DataProviderService._instance = this;
    } catch (error) {
      throw new Error(
        `Failed to initialize DataProviderService: ${error.message}`,
      );
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
   * Subscribe to provider changes
   * @param {(change: {type:'notes'|'connections'|'meta'|'snapshot', origin:'user'|'system', payload:any}) => void} onChange
   * @returns {() => void} unsubscribe function
   */
  subscribe(onChange) {
    this._ensureInitialized();
    return this._provider.subscribe(onChange);
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
   * Import JSON data
   * @param {string} json
   */
  async importJSON(json) {
    this._ensureInitialized();
    return this._provider.importJSON(json);
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
   * Ensure provider is initialized
   * @private
   */
  _ensureInitialized() {
    if (!this._provider) {
      throw new Error('DataProviderService not properly initialized');
    }
  }
}
