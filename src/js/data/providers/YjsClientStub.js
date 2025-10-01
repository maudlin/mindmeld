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
    this._doc = null; // Reference to parent YDoc (set by YDoc.getMap)
  }

  /**
   * Set a value in the map
   */
  set(key, value) {
    const oldValue = this._data.get(key);
    this._data.set(key, value);

    // Record change for transmission to server
    if (this._doc && this._doc._transacting) {
      this._doc._pendingChanges.push({
        mapName: this._name,
        key,
        value,
        action: 'add',
      });
    }

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
      // Record change for transmission to server
      if (this._doc && this._doc._transacting) {
        this._doc._pendingChanges.push({
          mapName: this._name,
          key,
          action: 'delete',
        });
      }

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
    this._provider = null; // Reference to WebsocketProvider for sending updates
  }

  /**
   * Get or create a named map
   */
  getMap(name) {
    if (!this._maps.has(name)) {
      const yMap = new YMap(name);
      yMap._doc = this; // Give map reference to doc for change tracking
      this._maps.set(name, yMap);
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
    if (this._pendingChanges.length === 0) {
      return;
    }

    // Group changes by map name
    const changesByMap = {};
    this._pendingChanges.forEach((change) => {
      if (!changesByMap[change.mapName]) {
        changesByMap[change.mapName] = {};
      }
      changesByMap[change.mapName][change.key] =
        change.action === 'delete' ? null : change.value;
    });

    // Send updates to server via WebsocketProvider
    if (this._provider) {
      this._provider.sendUpdate(changesByMap);
    }

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
    this.destroyed = false;

    // Queue for updates sent before WebSocket is ready
    this._pendingUpdates = [];

    // Event handlers for compatibility with YjsProvider expectations
    this._eventHandlers = {
      status: [],
      sync: [],
    };

    // Connect doc to this provider for sending updates
    this.doc._provider = this;

    this._connect();
  }

  /**
   * Register event handler (compatibility with real Yjs WebsocketProvider)
   */
  on(event, handler) {
    if (this._eventHandlers[event]) {
      this._eventHandlers[event].push(handler);
    }
  }

  /**
   * Emit event to registered handlers
   */
  _emit(event, data) {
    if (this._eventHandlers[event]) {
      this._eventHandlers[event].forEach((handler) => handler(data));
    }
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

        // Emit status event for YjsProvider
        this._emit('status', { status: 'connected' });

        // Send initial sync message
        this._sendSyncMessage();

        // Flush any pending updates that were queued before connection
        this._flushPendingUpdates();
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
  async _handleMessage(data) {
    try {
      // Handle binary messages (Blob from real Yjs server)
      if (data instanceof Blob) {
        console.log('[YjsProvider] Received binary message (Yjs protocol)');
        // Real Yjs uses binary protocol - for now, just mark as synced
        // Full implementation would decode the Yjs binary update format
        if (!this.synced) {
          this.synced = true;
          this._emit('sync', true);
          console.log('[YjsProvider] Sync complete (binary protocol)');
        }
        return;
      }

      // Handle JSON messages (for testing or custom protocols)
      const message = JSON.parse(data);

      switch (message.type) {
        case 'sync':
          // Server sent initial state
          if (message.state) {
            this.doc.fromJSON(message.state);
          }
          this.synced = true;
          this._emit('sync', true);
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
      // Queue update for later if WebSocket not ready yet
      console.log(
        '[YjsProvider] Queueing update until WebSocket ready:',
        changes,
      );
      this._pendingUpdates.push(changes);
      return;
    }

    console.log('[YjsProvider] Sending update to server:', changes);
    this.ws.send(
      JSON.stringify({
        type: 'update',
        room: this.roomName,
        changes,
      }),
    );
  }

  /**
   * Flush pending updates after WebSocket connects
   */
  _flushPendingUpdates() {
    if (this._pendingUpdates.length === 0) {
      return;
    }

    console.log(
      `[YjsProvider] Flushing ${this._pendingUpdates.length} pending updates`,
    );

    // Send all queued updates
    this._pendingUpdates.forEach((changes) => {
      this.sendUpdate(changes);
    });

    this._pendingUpdates = [];
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
