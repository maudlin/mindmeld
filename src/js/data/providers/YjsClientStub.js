// src/js/data/providers/YjsClientStub.js
// Lightweight Yjs client stub for communication with Yjs server
// Implements minimal Y.Doc and Y.Map API surface without full CRDT logic
// The server handles actual CRDT operations

/**
 * Minimal Y.Map implementation
 * Provides Map-like interface for collaborative data
 */
class YMap {
  constructor(name) {
    this._name = name;
    this._data = new Map();
    this._observers = new Set();
  }

  /**
   * Set a value in the map
   */
  set(key, value) {
    const oldValue = this._data.get(key);
    this._data.set(key, value);

    // Notify observers of change
    this._notifyObservers({
      action: 'add',
      key,
      value,
      oldValue,
    });
  }

  /**
   * Get a value from the map
   */
  get(key) {
    return this._data.get(key);
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this._data.has(key);
  }

  /**
   * Delete a key from the map
   */
  delete(key) {
    const oldValue = this._data.get(key);
    const result = this._data.delete(key);

    if (result) {
      this._notifyObservers({
        action: 'delete',
        key,
        oldValue,
      });
    }

    return result;
  }

  /**
   * Clear all entries
   */
  clear() {
    const oldEntries = Array.from(this._data.entries());
    this._data.clear();

    this._notifyObservers({
      action: 'clear',
      oldEntries,
    });
  }

  /**
   * Iterate over entries
   */
  forEach(callback) {
    this._data.forEach((value, key) => {
      callback(value, key, this);
    });
  }

  /**
   * Get map size
   */
  get size() {
    return this._data.size;
  }

  /**
   * Subscribe to changes
   * Returns unsubscribe function
   */
  observe(callback) {
    this._observers.add(callback);
    return () => {
      this._observers.delete(callback);
    };
  }

  /**
   * Notify all observers of a change
   */
  _notifyObservers(event) {
    this._observers.forEach((callback) => {
      try {
        callback(event, null); // transaction parameter not used in our implementation
      } catch (error) {
        console.error('YMap observer error:', error);
      }
    });
  }

  /**
   * Get all entries as plain object
   */
  toJSON() {
    const obj = {};
    this._data.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * Import data from plain object
   */
  fromJSON(obj) {
    this.clear();
    Object.entries(obj).forEach(([key, value]) => {
      this._data.set(key, value);
    });
  }
}

/**
 * Minimal Y.Doc implementation
 * Represents a collaborative document with multiple maps
 */
class YDoc {
  constructor() {
    this._maps = new Map();
    this._transacting = false;
    this._pendingChanges = [];
  }

  /**
   * Get or create a named map
   */
  getMap(name) {
    if (!this._maps.has(name)) {
      this._maps.set(name, new YMap(name));
    }
    return this._maps.get(name);
  }

  /**
   * Execute operations in a transaction
   * Batches multiple changes together
   */
  transact(fn) {
    const wasTransacting = this._transacting;
    this._transacting = true;

    try {
      fn();
    } finally {
      this._transacting = wasTransacting;

      // If this was the outermost transaction, process pending changes
      if (!wasTransacting && this._pendingChanges.length > 0) {
        this._processPendingChanges();
      }
    }
  }

  /**
   * Process accumulated changes from transaction
   */
  _processPendingChanges() {
    // In a full implementation, this would encode changes to binary format
    // and send to server. For now, changes are already applied locally.
    this._pendingChanges = [];
  }

  /**
   * Clean up resources
   */
  destroy() {
    this._maps.clear();
    this._pendingChanges = [];
  }

  /**
   * Get document as JSON
   */
  toJSON() {
    const obj = {};
    this._maps.forEach((map, name) => {
      // eslint-disable-next-line security/detect-object-injection
      obj[name] = map.toJSON();
    });
    return obj;
  }

  /**
   * Import document from JSON
   */
  fromJSON(obj) {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    Object.entries(obj).forEach(([name, data]) => {
      const map = this.getMap(name);
      map.fromJSON(data);
    });
  }
}

/**
 * Minimal WebSocket provider for Yjs
 * Handles connection to Yjs collaboration server
 */
class WebsocketProvider {
  constructor(serverUrl, roomName, doc, options = {}) {
    this.serverUrl = serverUrl;
    this.roomName = roomName;
    this.doc = doc;
    this.options = options;

    this.ws = null;
    this.connected = false;
    this.synced = false;

    this._connect();
  }

  /**
   * Establish WebSocket connection to server
   */
  _connect() {
    try {
      // Construct WebSocket URL
      const wsUrl = this.serverUrl.replace(/^http/, 'ws');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('[YjsProvider] WebSocket connected:', this.roomName);

        // Send initial sync message
        this._sendSyncMessage();
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[YjsProvider] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.synced = false;
        console.log('[YjsProvider] WebSocket disconnected:', this.roomName);

        // Attempt reconnection after delay
        setTimeout(() => {
          if (!this.destroyed) {
            this._connect();
          }
        }, 3000);
      };
    } catch (error) {
      console.error('[YjsProvider] Failed to create WebSocket:', error);
    }
  }

  /**
   * Send initial sync message to server
   */
  _sendSyncMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send sync request
    // In full implementation, this would encode document state as binary
    this.ws.send(
      JSON.stringify({
        type: 'sync',
        room: this.roomName,
      }),
    );
  }

  /**
   * Handle incoming WebSocket messages
   */
  _handleMessage(data) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'sync':
          // Server sent initial state
          if (message.state) {
            this.doc.fromJSON(message.state);
          }
          this.synced = true;
          break;

        case 'update':
          // Server sent update
          if (message.changes) {
            this._applyChanges(message.changes);
          }
          break;

        default:
          console.warn('[YjsProvider] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[YjsProvider] Error handling message:', error);
    }
  }

  /**
   * Apply changes from server to local document
   */
  _applyChanges(changes) {
    // Apply changes to document
    // In full implementation, this would decode binary updates
    // For now, we assume changes are in JSON format
    if (!changes || typeof changes !== 'object') {
      return;
    }
    Object.entries(changes).forEach(([mapName, mapChanges]) => {
      const map = this.doc.getMap(mapName);

      if (mapChanges && typeof mapChanges === 'object') {
        Object.entries(mapChanges).forEach(([key, value]) => {
          if (value === null) {
            map.delete(key);
          } else {
            map.set(key, value);
          }
        });
      }
    });
  }

  /**
   * Send local changes to server
   */
  sendUpdate(changes) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: 'update',
        room: this.roomName,
        changes,
      }),
    );
  }

  /**
   * Disconnect and clean up
   */
  destroy() {
    this.destroyed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Export Yjs-compatible API
 */
export const Y = {
  Doc: YDoc,
  Map: YMap,
};

export { WebsocketProvider };
