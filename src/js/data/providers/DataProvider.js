import { logger, errorHandler } from '../../services/logger.js';
// src/js/data/providers/DataProvider.js
// Abstract interface for data providers (LocalJSONProvider, YjsProvider)
// This file purposefully contains JSDoc-only contracts and minimal runtime stubs.

/**
 * @typedef {Object} ProviderInitOptions
 * @property {string|null} [serverUrl]
 * @property {boolean} [serverSync]
 * @property {() => void} [onReady]
 */

/**
 * Origin constants used for provider notifications and writes.
 */
export const ORIGIN = /** @type {{USER:'user', SYSTEM:'system'}} */ ({
  USER: 'user',
  SYSTEM: 'system',
});

/**
 * Validate origin value.
 * @param {any} origin
 * @returns {origin is 'user'|'system'}
 */
export function isValidOrigin(origin) {
  return origin === ORIGIN.USER || origin === ORIGIN.SYSTEM;
}

/**
 * Compute a stable, direction-inclusive connection ID.
 * @param {string} from
 * @param {string} to
 * @param {number|string} type
 * @returns {string}
 */
export function makeConnectionId(from, to, type) {
  const f = String(from || '');
  const t = String(to || '');
  const ty = String(type ?? '');
  return `${f}:${t}:${ty}`;
}

/**
 * Abstract Provider base. Methods throw unless implemented by subclasses.
 */
export class DataProvider {
  constructor() {
    if (new.target === DataProvider) {
      console.warn(
        'DataProvider is an abstract base; use a concrete implementation',
      );
    }
  }

  /**
   * Initialize the provider for a map.
   * @param {string|null} _mapId
   * @param {ProviderInitOptions} [_options]
   * @returns {() => void} cleanup unsubscribe
   */
  init() {
    throw new Error('Not implemented: init');
  }

  /**
   * Destroy resources.
   */
  destroy() {
    // optional for implementations
  }

  /**
   * Subscribe to provider changes.
   * @param {(change: {type:'notes'|'connections'|'meta'|'snapshot', origin:'user'|'system', payload:any}) => void} _onChange
   * @returns {() => void} unsubscribe
   */
  subscribe() {
    throw new Error('Not implemented: subscribe');
  }

  /** @returns {{ data: { n:any[], c:any[] } }} */
  getSnapshot() {
    throw new Error('Not implemented: getSnapshot');
  }

  /** @param {string} _json */
  importJSON() {
    throw new Error('Not implemented: importJSON');
  }

  /** @returns {string} */
  exportJSON() {
    throw new Error('Not implemented: exportJSON');
  }

  /** @param {{ id:string, content?:string, pos?:[number,number], color?:string }} _note @param {{origin?:'user'|'system'}} [_opts] */
  upsertNote() {
    throw new Error('Not implemented: upsertNote');
  }

  /** @param {string} _id @param {{origin?:'user'|'system'}} [_opts] */
  deleteNote() {
    throw new Error('Not implemented: deleteNote');
  }

  /** @param {{ id?:string, from:string, to:string, type:number }} _conn @param {{origin?:'user'|'system'}} [_opts] */
  upsertConnection() {
    throw new Error('Not implemented: upsertConnection');
  }

  /** @param {string} _connId @param {{origin?:'user'|'system'}} [_opts] */
  deleteConnection() {
    throw new Error('Not implemented: deleteConnection');
  }

  /** @param {Partial<{ zoomLevel:number, canvasType:string, mapName:string }>} _meta @param {{origin?:'user'|'system'}} [_opts] */
  setMeta() {
    throw new Error('Not implemented: setMeta');
  }

  /** @returns {{ zoomLevel:number, canvasType:string, mapName:string }} */
  getMeta() {
    throw new Error('Not implemented: getMeta');
  }
}
