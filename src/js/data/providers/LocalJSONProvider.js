// src/js/data/providers/LocalJSONProvider.js
// LocalJSONProvider - Wraps existing dataStore/storageManager behind DataProvider interface

import { DataProvider, ORIGIN } from './DataProvider.js';
import * as dataStore from '../dataStore.js';
import * as storageManager from '../storageManager.js';
import { appState } from '../observableState.js';
import { logger } from '../../services/logger.js';

/**
 * LocalJSONProvider implements DataProvider interface by wrapping existing
 * dataStore and storageManager. Provides autosave race prevention and
 * hydration guards for MM-234.
 */
export class LocalJSONProvider extends DataProvider {
  constructor() {
    super();

    // Hydration state management
    this.hydrationInProgress = false;
    this.autosaveEnabled = true;

    // Subscription management
    this.subscribers = new Set();

    // Canvas reference for DOM operations
    this.canvas = null;
  }

  /**
   * Initialize the provider for a map.
   * @param {string|null} _mapId - Map ID (unused in LocalJSONProvider)
   * @param {import('./DataProvider.js').ProviderInitOptions} [options]
   * @returns {() => void} cleanup unsubscribe
   */
  init(_mapId, options = {}) {
    // Get canvas reference
    this.canvas = document.querySelector('#canvas');

    // Call onReady if provided
    if (options.onReady) {
      options.onReady();
    }

    // Return cleanup function
    return () => {
      this.destroy();
    };
  }

  /**
   * Destroy resources.
   */
  destroy() {
    this.subscribers.clear();
    this.canvas = null;
  }

  /**
   * Subscribe to provider changes.
   * @param {(change: {type:'notes'|'connections'|'meta'|'snapshot', origin:'user'|'system', payload:any}) => void} onChange
   * @returns {() => void} unsubscribe
   */
  subscribe(onChange) {
    this.subscribers.add(onChange);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(onChange);
    };
  }

  /**
   * Notify all subscribers of a change.
   * @private
   */
  _notifySubscribers(change) {
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber(change);
      } catch (error) {
        logger.error('Error in provider subscriber:', error);
      }
    });
  }

  /**
   * Trigger autosave if conditions allow.
   * @private
   */
  _triggerAutosave(origin) {
    // Don't autosave during hydration, for system operations, or when disabled
    if (
      this.hydrationInProgress ||
      origin === ORIGIN.SYSTEM ||
      !this.autosaveEnabled
    ) {
      return;
    }

    storageManager.saveStateToStorage();
  }

  /**
   * Get current state snapshot.
   * @returns {{ data: { n:any[], c:any[] } }}
   */
  getSnapshot() {
    const currentState = dataStore.getCurrentState();
    return { data: currentState };
  }

  /**
   * Import JSON data.
   * @param {string} json
   */
  async importJSON(json) {
    try {
      // Set hydration flag to prevent autosave during import
      this.hydrationInProgress = true;

      // Validate JSON before delegating
      try {
        JSON.parse(json);
      } catch (parseError) {
        throw new Error(`Invalid JSON data: ${parseError.message}`);
      }

      // Delegate to existing dataStore.importFromJSON
      await dataStore.importFromJSON(json, this.canvas);

      // Notify subscribers of snapshot change
      this._notifySubscribers({
        type: 'snapshot',
        origin: ORIGIN.SYSTEM,
        payload: this.getSnapshot(),
      });
    } finally {
      // Always reset hydration flag
      this.hydrationInProgress = false;
    }
  }

  /**
   * Export current state as JSON.
   * @returns {string}
   */
  exportJSON() {
    return dataStore.exportToJSON();
  }

  /**
   * Upsert a note.
   * @param {{ id:string, content?:string, pos?:[number,number], color?:string }} note
   * @param {{origin?:'user'|'system'}} [opts]
   */
  upsertNote(note, opts = {}) {
    const origin = opts.origin || ORIGIN.USER;

    if (!note.id) {
      logger.warn('Note missing required id field');
      return;
    }

    // Check if note exists
    const existingNotes = dataStore.getNotes();
    const existingNote = existingNotes.find((n) => n.id === note.id);

    if (existingNote) {
      // Update existing note
      const updateData = {};
      if (note.content !== undefined) updateData.content = note.content;
      if (note.pos) {
        updateData.left = `${note.pos[0]}px`;
        updateData.top = `${note.pos[1]}px`;
      }
      if (note.color !== undefined) updateData.color = note.color;

      dataStore.updateNote(note.id, updateData);
    } else {
      // Add new note
      const newNote = {
        id: note.id,
        content: note.content || '',
        left: note.pos ? `${note.pos[0]}px` : '0px',
        top: note.pos ? `${note.pos[1]}px` : '0px',
      };
      if (note.color) newNote.color = note.color;

      dataStore.addNote(newNote);
    }

    // Notify subscribers
    this._notifySubscribers({
      type: 'notes',
      origin,
      payload: { action: 'upsert', note },
    });

    // Trigger autosave if appropriate
    this._triggerAutosave(origin);
  }

  /**
   * Delete a note.
   * @param {string} id
   * @param {{origin?:'user'|'system'}} [opts]
   */
  deleteNote(id, opts = {}) {
    const origin = opts.origin || ORIGIN.USER;

    dataStore.deleteNoteById(id);

    // Notify subscribers
    this._notifySubscribers({
      type: 'notes',
      origin,
      payload: { action: 'delete', id },
    });

    // Trigger autosave if appropriate
    this._triggerAutosave(origin);
  }

  /**
   * Upsert a connection.
   * @param {{ id?:string, from:string, to:string, type:number }} conn
   * @param {{origin?:'user'|'system'}} [opts]
   */
  upsertConnection(conn, opts = {}) {
    const origin = opts.origin || ORIGIN.USER;

    if (!conn.from || !conn.to) {
      logger.warn(
        'LocalJSONProvider: Connection missing required from/to fields',
      );
      return;
    }

    // Delegate to existing dataStore function
    dataStore.updateConnectionInDataStore(conn.from, conn.to, conn.type);

    // Notify subscribers
    this._notifySubscribers({
      type: 'connections',
      origin,
      payload: { action: 'upsert', connection: conn },
    });

    // Trigger autosave if appropriate
    this._triggerAutosave(origin);
  }

  /**
   * Delete a connection.
   * @param {string} connId
   * @param {{origin?:'user'|'system'}} [opts]
   */
  deleteConnection(connId, opts = {}) {
    const origin = opts.origin || ORIGIN.USER;

    // Parse connection ID (format: "from:to:type")
    const parts = connId.split(':');
    if (parts.length >= 2) {
      const [from, to] = parts;
      // Delete by setting type to null
      dataStore.updateConnectionInDataStore(from, to, null);

      // Notify subscribers
      this._notifySubscribers({
        type: 'connections',
        origin,
        payload: { action: 'delete', id: connId },
      });

      // Trigger autosave if appropriate
      this._triggerAutosave(origin);
    } else {
      logger.warn('LocalJSONProvider: Invalid connection ID format:', connId);
    }
  }

  /**
   * Set meta data.
   * @param {Partial<{ zoomLevel:number, canvasType:string, mapName:string }>} meta
   * @param {{origin?:'user'|'system'}} [opts]
   */
  setMeta(meta, opts = {}) {
    const origin = opts.origin || ORIGIN.USER;

    // Delegate to appState
    appState.setState(meta);

    // Notify subscribers
    this._notifySubscribers({
      type: 'meta',
      origin,
      payload: meta,
    });

    // Trigger autosave if appropriate
    this._triggerAutosave(origin);
  }

  /**
   * Get meta data.
   * @returns {{ zoomLevel:number, canvasType:string, mapName:string }}
   */
  getMeta() {
    const state = appState.getState();
    return {
      zoomLevel: state.zoomLevel || 5,
      canvasType: state.canvasType || 'Standard Canvas',
      mapName: state.mapName || '',
    };
  }

  /**
   * Pause autosave operations.
   */
  pauseAutosave() {
    this.autosaveEnabled = false;
  }

  /**
   * Resume autosave operations.
   */
  resumeAutosave() {
    this.autosaveEnabled = true;
  }
}
