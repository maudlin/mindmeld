// src/js/data/providers/WebSocketYjsProvider.js
// WebSocketYjsProvider - WebSocket-only data provider with Y.js CRDT integration

import { Doc } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { ServerConnectionService } from '../../services/ServerConnectionService.js';

/**
 * WebSocketYjsProvider implements the DataProvider interface using Y.js CRDTs
 * with WebSocket-only communication for real-time collaboration.
 *
 * Key Features:
 * - WebSocket-only hydration (no REST calls during map loading)
 * - Real-time collaboration with conflict-free merging
 * - Origin marking to prevent feedback loops
 * - Lazy Y.Doc creation during loadMap()
 * - Compatible with existing DataProvider interface
 */
export class WebSocketYjsProvider {
  constructor() {
    this.doc = null;
    this.wsProvider = null;
    this.mapId = null;
    this.isReady = false;
    this.subscribers = [];
    this.serverConnectionService = ServerConnectionService.getInstance();

    // DataProvider interface properties
    this.hydrationInProgress = false;

    // Provider identification
    this.providerType = 'websocket-yjs';
    this.supportsCollaboration = true;
    this.requiresServer = true;
  }

  /**
   * Set server URL (Phase 1 of two-phase connection)
   * Does not create WebSocket connection yet
   */
  async setServerUrl(url) {
    if (!this.serverConnectionService.isServerConfigured()) {
      this.serverConnectionService.setServerUrl(url);
    }
  }

  /**
   * Load map with WebSocket-only hydration (Phase 2)
   * Creates Y.Doc and WebSocket connection
   */
  async loadMap(mapId) {
    try {
      // Create Y.Doc (lazy creation)
      this.doc = new Doc();
      this.mapId = mapId;

      // Create WebSocket URL
      const wsUrl = this.serverConnectionService.createWebSocketUrl(mapId);

      // Create WebSocket provider
      this.wsProvider = new WebsocketProvider(wsUrl, mapId, this.doc);

      // Set up event handlers
      this._setupEventHandlers();

      // Mark hydration in progress
      this.hydrationInProgress = true;

      return this.wsProvider;
    } catch (error) {
      this.doc = null;
      this.wsProvider = null;
      this.mapId = null;
      throw error;
    }
  }

  /**
   * Wait for initial server synchronization
   */
  waitForServerSync() {
    return new Promise((resolve) => {
      if (this.wsProvider && this.wsProvider.synced) {
        this.isReady = true;
        this.hydrationInProgress = false;
        resolve();
        return;
      }

      const handleSync = () => {
        this.isReady = true;
        this.hydrationInProgress = false;
        this.wsProvider.off('sync', handleSync);
        resolve();
      };

      if (this.wsProvider) {
        this.wsProvider.on('sync', handleSync);
      } else {
        resolve(); // No provider, resolve immediately
      }
    });
  }

  /**
   * Set up WebSocket and Y.Doc event handlers
   */
  _setupEventHandlers() {
    if (!this.wsProvider || !this.doc) return;

    // Handle WebSocket sync events
    this.wsProvider.on('sync', () => {
      this.isReady = true;
      this.hydrationInProgress = false;
    });

    // Handle WebSocket connection errors
    this.wsProvider.on('connection-error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isReady = false;
    });

    // Handle Y.Doc updates with origin marking
    this.doc.on('update', (update, origin, doc, transaction) => {
      // Mark all server updates with origin=system
      if (!transaction.origin) {
        transaction.origin = 'system';
      }

      this.handleUpdate(transaction);
    });
  }

  /**
   * Handle Y.Doc updates with origin-based filtering
   */
  handleUpdate(transaction) {
    if (this.shouldTriggerUILogic(transaction)) {
      // Notify subscribers of user-initiated changes
      this._notifySubscribers({
        origin: transaction.origin,
        data: this.getSnapshot(),
      });
    }
  }

  /**
   * Determine if update should trigger UI logic
   * Prevents feedback loops from server/collaboration updates
   */
  shouldTriggerUILogic(transaction) {
    if (!transaction.origin) return false;

    // Only trigger UI logic for user-initiated changes
    return transaction.origin === 'user';
  }

  /**
   * Get current data snapshot (DataProvider interface)
   */
  getSnapshot() {
    if (!this.doc) {
      return {
        data: { n: [], c: [] },
        meta: {},
      };
    }

    try {
      const dataMap = this.doc.getMap('data');
      const metaMap = this.doc.getMap('meta');

      const data = dataMap.toJSON();
      const meta = metaMap.toJSON();

      return {
        data: {
          n: data.notes || [],
          c: data.connections || [],
        },
        meta: meta || {},
      };
    } catch (error) {
      console.error('Error getting snapshot:', error);
      return {
        data: { n: [], c: [] },
        meta: {},
      };
    }
  }

  /**
   * Subscribe to data changes (DataProvider interface)
   */
  subscribe(callback) {
    this.subscribers.push(callback);

    // Set up Y.Doc observation
    if (this.doc) {
      const dataMap = this.doc.getMap('data');
      const observeHandler = () => {
        callback({
          origin: 'collaboration',
          data: this.getSnapshot(),
        });
      };

      dataMap.observe(observeHandler);

      // Return unsubscribe function
      return () => {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) {
          this.subscribers.splice(index, 1);
        }
        dataMap.unobserve(observeHandler);
      };
    }

    // Return simple unsubscribe for no doc case
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers
   */
  _notifySubscribers(event) {
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Upsert note (DataProvider interface)
   */
  async upsertNote(noteData, options = {}) {
    if (!this.doc) {
      throw new Error('Provider not initialized');
    }

    this.doc.transact(() => {
      const dataMap = this.doc.getMap('data');
      let notesArray = dataMap.get('notes');

      if (!notesArray) {
        notesArray = [];
        dataMap.set('notes', notesArray);
      }

      // Find existing note index
      const existingIndex = notesArray.findIndex((n) => n.id === noteData.id);

      if (existingIndex >= 0) {
        // Update existing note
        notesArray[existingIndex] = {
          ...notesArray[existingIndex],
          ...noteData,
        };
      } else {
        // Add new note
        notesArray.push(noteData);
      }

      dataMap.set('notes', notesArray);
    }, options.origin);
  }

  /**
   * Delete note (DataProvider interface)
   */
  async deleteNote(noteId, options = {}) {
    if (!this.doc) {
      throw new Error('Provider not initialized');
    }

    this.doc.transact(() => {
      const dataMap = this.doc.getMap('data');
      let notesArray = dataMap.get('notes') || [];

      notesArray = notesArray.filter((n) => n.id !== noteId);
      dataMap.set('notes', notesArray);
    }, options.origin);
  }

  /**
   * Upsert connection (DataProvider interface)
   */
  async upsertConnection(connectionData, options = {}) {
    if (!this.doc) {
      throw new Error('Provider not initialized');
    }

    this.doc.transact(() => {
      const dataMap = this.doc.getMap('data');
      let connectionsArray = dataMap.get('connections');

      if (!connectionsArray) {
        connectionsArray = [];
        dataMap.set('connections', connectionsArray);
      }

      // Find existing connection index
      const connectionId = `${connectionData.from}:${connectionData.to}:${connectionData.type}`;
      const existingIndex = connectionsArray.findIndex(
        (c) => `${c.from}:${c.to}:${c.type}` === connectionId,
      );

      if (existingIndex >= 0) {
        // Update existing connection
        connectionsArray[existingIndex] = {
          ...connectionsArray[existingIndex],
          ...connectionData,
        };
      } else {
        // Add new connection
        connectionsArray.push(connectionData);
      }

      dataMap.set('connections', connectionsArray);
    }, options.origin);
  }

  /**
   * Delete connection (DataProvider interface)
   */
  async deleteConnection(connectionId, options = {}) {
    if (!this.doc) {
      throw new Error('Provider not initialized');
    }

    this.doc.transact(() => {
      const dataMap = this.doc.getMap('data');
      let connectionsArray = dataMap.get('connections') || [];

      connectionsArray = connectionsArray.filter(
        (c) => `${c.from}:${c.to}:${c.type}` !== connectionId,
      );

      dataMap.set('connections', connectionsArray);
    }, options.origin);
  }

  /**
   * Set metadata (DataProvider interface)
   */
  async setMeta(metaData, options = {}) {
    if (!this.doc) {
      throw new Error('Provider not initialized');
    }

    this.doc.transact(() => {
      const metaMap = this.doc.getMap('meta');

      for (const [key, value] of Object.entries(metaData)) {
        metaMap.set(key, value);
      }
    }, options.origin);
  }

  /**
   * Get metadata (DataProvider interface)
   */
  getMeta() {
    if (!this.doc) {
      return {};
    }

    const metaMap = this.doc.getMap('meta');
    return metaMap.toJSON();
  }

  /**
   * Import JSON data (DataProvider interface)
   */
  async importJSON(jsonString) {
    if (!this.doc) {
      throw new Error('Provider not initialized');
    }

    try {
      const importData = JSON.parse(jsonString);

      this.doc.transact(() => {
        const dataMap = this.doc.getMap('data');
        const metaMap = this.doc.getMap('meta');

        // Import data
        if (importData.data) {
          if (importData.data.n) {
            dataMap.set('notes', importData.data.n);
          }
          if (importData.data.c) {
            dataMap.set('connections', importData.data.c);
          }
        }

        // Import metadata
        if (importData.meta) {
          for (const [key, value] of Object.entries(importData.meta)) {
            metaMap.set(key, value);
          }
        }
      }, 'import');
    } catch (error) {
      throw new Error(`Failed to import JSON: ${error.message}`);
    }
  }

  /**
   * Export JSON data (DataProvider interface)
   */
  exportJSON() {
    const snapshot = this.getSnapshot();
    return JSON.stringify(snapshot);
  }

  /**
   * Initialize provider (DataProvider interface)
   */
  init(mapId, options = {}) {
    // For WebSocket provider, initialization happens in loadMap
    if (options.onReady) {
      options.onReady();
    }

    return () => this.destroy();
  }

  /**
   * Destroy provider and cleanup resources
   */
  destroy() {
    if (this.wsProvider) {
      this.wsProvider.destroy();
      this.wsProvider = null;
    }

    if (this.doc) {
      this.doc.destroy();
      this.doc = null;
    }

    this.mapId = null;
    this.isReady = false;
    this.subscribers = [];
    this.hydrationInProgress = false;
  }

  /**
   * Pause autosave (DataProvider interface)
   */
  pauseAutosave() {
    // WebSocket provider doesn't have traditional autosave
    // Changes are automatically synchronized via WebSocket
  }

  /**
   * Resume autosave (DataProvider interface)
   */
  resumeAutosave() {
    // WebSocket provider doesn't have traditional autosave
    // Changes are automatically synchronized via WebSocket
  }
}
