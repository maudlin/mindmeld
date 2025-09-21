// src/js/core/yjs-compatibility/YjsCompat.js
// Minimal Y.js compatibility layer for zero external dependencies
// Provides local CRDT-like functionality and WebSocket synchronization

/**
 * Minimal Y.Map implementation that behaves like Yjs Y.Map
 * Supports local collaborative operations and change observers
 */
export class YMap {
  constructor() {
    this._data = new Map();
    this._observers = [];
    this._doc = null; // Will be set by parent Doc
  }

  /**
   * Set a value in the map
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    const oldValue = this._data.get(key);
    this._data.set(key, value);

    // Emit change event to observers
    this._emitChange('set', key, value, oldValue);
  }

  /**
   * Get a value from the map
   * @param {string} key
   * @returns {any}
   */
  get(key) {
    return this._data.get(key);
  }

  /**
   * Delete a key from the map
   * @param {string} key
   */
  delete(key) {
    const oldValue = this._data.get(key);
    const deleted = this._data.delete(key);

    if (deleted) {
      this._emitChange('delete', key, undefined, oldValue);
    }
  }

  /**
   * Clear all data from the map
   */
  clear() {
    const keys = Array.from(this._data.keys());
    this._data.clear();

    // Emit delete events for all keys
    keys.forEach((key) => {
      this._emitChange('delete', key, undefined, undefined);
    });
  }

  /**
   * Check if key exists
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this._data.has(key);
  }

  /**
   * Iterate over entries
   * @param {Function} callback
   */
  forEach(callback) {
    this._data.forEach(callback);
  }

  /**
   * Observe changes to this map
   * @param {Function} observer - Called with (event, transaction)
   */
  observe(observer) {
    this._observers.push(observer);
  }

  /**
   * Remove observer
   * @param {Function} observer
   */
  unobserve(observer) {
    const index = this._observers.indexOf(observer);
    if (index >= 0) {
      this._observers.splice(index, 1);
    }
  }

  /**
   * Emit change event to observers
   * @param {string} action - 'set' or 'delete'
   * @param {string} key
   * @param {any} newValue
   * @param {any} oldValue
   * @private
   */
  _emitChange(action, key, newValue, oldValue) {
    if (this._observers.length === 0) return;

    // Create YJS-compatible event structure
    const event = {
      changes: {
        keys: new Map([[key, { action, oldValue }]]),
      },
    };

    // Create transaction context (origin tracking)
    const transaction = {
      origin: this._doc?._currentTransactionOrigin || 'user',
    };

    // Notify all observers
    this._observers.forEach((observer) => {
      try {
        observer(event, transaction);
      } catch (error) {
        console.error('YMap observer error:', error);
      }
    });
  }

  /**
   * Export data as plain object for serialization
   * @returns {Object}
   */
  toJSON() {
    const result = {};
    this._data.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Import data from plain object
   * @param {Object} data
   */
  fromJSON(data) {
    this.clear();
    Object.entries(data).forEach(([key, value]) => {
      this._data.set(key, value); // Direct set without events during import
    });
  }
}

/**
 * Minimal Y.Doc implementation that behaves like Yjs Y.Doc
 * Manages Y.Map instances and transactions
 */
export class YDoc {
  constructor() {
    this._maps = new Map();
    this._observers = [];
    this._currentTransactionOrigin = null;
  }

  /**
   * Get or create a Y.Map with the given name
   * @param {string} name
   * @returns {YMap}
   */
  getMap(name) {
    if (!this._maps.has(name)) {
      const ymap = new YMap();
      ymap._doc = this; // Link back to doc for transaction context
      this._maps.set(name, ymap);
    }
    return this._maps.get(name);
  }

  /**
   * Execute operations within a transaction
   * @param {Function} fn - Function to execute
   * @param {string} origin - Transaction origin ('user' or 'system')
   */
  transact(fn, origin = 'user') {
    const previousOrigin = this._currentTransactionOrigin;
    this._currentTransactionOrigin = origin;

    try {
      fn();
    } finally {
      this._currentTransactionOrigin = previousOrigin;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this._maps.clear();
    this._observers.length = 0;
    this._currentTransactionOrigin = null;
  }

  /**
   * Export entire document as JSON
   * @returns {Object}
   */
  toJSON() {
    const result = {};
    this._maps.forEach((ymap, name) => {
      result[name] = ymap.toJSON();
    });
    return result;
  }

  /**
   * Import document from JSON
   * @param {Object} data
   */
  fromJSON(data) {
    Object.entries(data).forEach(([name, mapData]) => {
      const ymap = this.getMap(name);
      ymap.fromJSON(mapData);
    });
  }
}

/**
 * Minimal WebSocket provider for Y.Doc synchronization
 * Uses simple JSON protocol instead of Y.js binary protocol
 */
export class WebsocketProvider {
  constructor(url, room, doc) {
    this.url = url;
    this.room = room;
    this.doc = doc;
    this.ws = null;
    this.wsconnected = false;
    this.listeners = new Map();

    this._connect();
  }

  /**
   * Connect to WebSocket server
   * @private
   */
  _connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.wsconnected = true;
        this._emit('status', { status: 'connected' });
        this._emit('sync', true);

        // Send initial join message
        this._send({
          type: 'join',
          room: this.room,
          data: this.doc.toJSON(),
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this._handleMessage(message);
        } catch (error) {
          console.error('WebsocketProvider message parse error:', error);
        }
      };

      this.ws.onclose = () => {
        this.wsconnected = false;
        this._emit('status', { status: 'disconnected' });
      };

      this.ws.onerror = (error) => {
        console.error('WebsocketProvider error:', error);
        this._emit('status', { status: 'error', error });
      };
    } catch (error) {
      console.error('WebsocketProvider connection failed:', error);
    }
  }

  /**
   * Handle incoming WebSocket message
   * @param {Object} message
   * @private
   */
  _handleMessage(message) {
    switch (message.type) {
      case 'sync':
        // Apply remote changes to local document
        this.doc.transact(() => {
          this.doc.fromJSON(message.data);
        }, 'system'); // Mark as system origin to prevent loops
        break;

      case 'update':
        // Apply incremental update
        this._applyUpdate(message.update);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Apply incremental update to document
   * @param {Object} update
   * @private
   */
  _applyUpdate(update) {
    // Simple update application - in a real implementation,
    // this would handle conflict resolution
    this.doc.transact(() => {
      Object.entries(update).forEach(([mapName, mapUpdates]) => {
        const ymap = this.doc.getMap(mapName);
        Object.entries(mapUpdates).forEach(([key, value]) => {
          if (value === null) {
            ymap.delete(key);
          } else {
            ymap.set(key, value);
          }
        });
      });
    }, 'system');
  }

  /**
   * Send message to server
   * @param {Object} message
   * @private
   */
  _send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Add event listener
   * @param {string} event
   * @param {Function} listener
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
  }

  /**
   * Remove event listener
   * @param {string} event
   * @param {Function} listener
   */
  off(event, listener) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event
   * @param {any} data
   * @private
   */
  _emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`WebsocketProvider ${event} listener error:`, error);
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsconnected = false;
    this.listeners.clear();
  }
}

// Export as default Y namespace for compatibility
export default {
  Doc: YDoc,
  Map: YMap,
};
