// src/js/data/providers/YjsProvider.js
// Real-time collaborative data provider using Yjs and WebSocket
import { DataProvider, ORIGIN, makeConnectionId } from './DataProvider.js';
import { truncateNoteContent } from '../../utils/utils.js';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export class YjsProvider extends DataProvider {
  constructor() {
    super();
    this._ready = false;
    this._onChange = null;
    this._ydoc = null;
    this._wsProvider = null;
    this._serverUrl = null;
    this._mapId = null;

    // Y.Doc maps for collaborative data structures
    this._yNotes = null; // Y.Map for notes
    this._yConnections = null; // Y.Map for connections
    this._yMeta = null; // Y.Map for metadata

    // Local metadata fallback
    this._meta = {
      zoomLevel: 5,
      canvasType: 'Standard Canvas',
      mapName: 'Untitled Map',
    };
  }

  init(mapId, options = {}) {
    // Store connection details
    this._mapId = mapId;
    this._serverUrl = options.serverUrl;

    // For test mode (no mapId or serverUrl), work in offline mode
    if (!mapId || !this._serverUrl) {
      console.log('YjsProvider: Running in offline test mode');
      this._initOfflineMode(options);
      return () => this.destroy();
    }

    // Initialize Y.Doc and data structures
    this._ydoc = new Y.Doc();
    this._yNotes = this._ydoc.getMap('notes');
    this._yConnections = this._ydoc.getMap('connections');
    this._yMeta = this._ydoc.getMap('meta');

    // Set up observers for real-time updates
    this._setupObservers();

    // Connect to WebSocket server at /yjs/:mapId endpoint
    const wsUrl = `${this._serverUrl.replace(/^http/, 'ws')}/yjs/${mapId}`;
    this._wsProvider = new WebsocketProvider(wsUrl, 'mindmeld', this._ydoc);

    // Set up WebSocket event handlers
    this._wsProvider.on('status', (event) => {
      if (event.status === 'connected') {
        console.log(`YjsProvider: Connected to ${wsUrl}`);
        this._ready = true;
        if (typeof options.onReady === 'function') {
          options.onReady();
        }
      }
    });

    this._wsProvider.on('sync', (synced) => {
      if (synced) {
        console.log('YjsProvider: Initial sync complete');
        this._ready = true;
        if (typeof options.onReady === 'function') {
          options.onReady();
        }
      }
    });

    // Return cleanup function
    return () => this.destroy();
  }

  destroy() {
    if (this._wsProvider) {
      this._wsProvider.destroy();
      this._wsProvider = null;
    }
    if (this._ydoc) {
      this._ydoc.destroy();
      this._ydoc = null;
    }
    this._yNotes = null;
    this._yConnections = null;
    this._yMeta = null;
    this._onChange = null;
    this._ready = false;
  }

  /**
   * Initialize in offline mode for testing (no WebSocket connection)
   */
  _initOfflineMode(options = {}) {
    this._ydoc = new Y.Doc();
    this._yNotes = this._ydoc.getMap('notes');
    this._yConnections = this._ydoc.getMap('connections');
    this._yMeta = this._ydoc.getMap('meta');

    // Set up observers
    this._setupObservers();

    // Mark as ready immediately
    this._ready = true;
    if (typeof options.onReady === 'function') {
      setTimeout(options.onReady, 0); // Async callback
    }
  }

  /**
   * Set up observers for Y.Doc changes to emit DataProvider events
   * Enhanced with origin tracking to prevent feedback loops
   */
  _setupObservers() {
    // Observe notes changes
    this._yNotes.observe((event, transaction) => {
      if (!this._onChange) return;

      // CRITICAL: Skip system transactions to prevent feedback loops
      if (transaction.origin === ORIGIN.SYSTEM) {
        console.log(
          'YjsProvider: Skipping system transaction in notes observer',
        );
        return;
      }

      // Determine origin: local USER transactions vs remote updates
      const origin =
        transaction.origin === ORIGIN.USER ? ORIGIN.USER : ORIGIN.SYSTEM;

      event.changes.keys.forEach((change, key) => {
        this._onChange({
          type: 'notes',
          origin, // Use determined origin instead of always SYSTEM
          payload: { id: key, action: change.action },
        });
      });
    });

    // Observe connections changes
    this._yConnections.observe((event, transaction) => {
      if (!this._onChange) return;

      // CRITICAL: Skip system transactions to prevent feedback loops
      if (transaction.origin === ORIGIN.SYSTEM) {
        console.log(
          'YjsProvider: Skipping system transaction in connections observer',
        );
        return;
      }

      // Determine origin: local USER transactions vs remote updates
      const origin =
        transaction.origin === ORIGIN.USER ? ORIGIN.USER : ORIGIN.SYSTEM;

      event.changes.keys.forEach((change, key) => {
        this._onChange({
          type: 'connections',
          origin, // Use determined origin instead of always SYSTEM
          payload: { id: key, action: change.action },
        });
      });
    });

    // Observe metadata changes
    this._yMeta.observe((event, transaction) => {
      if (!this._onChange) return;

      // CRITICAL: Skip system transactions to prevent feedback loops
      if (transaction.origin === ORIGIN.SYSTEM) {
        console.log(
          'YjsProvider: Skipping system transaction in meta observer',
        );
        return;
      }

      // Determine origin: local USER transactions vs remote updates
      const origin =
        transaction.origin === ORIGIN.USER ? ORIGIN.USER : ORIGIN.SYSTEM;

      event.changes.keys.forEach((change, key) => {
        this._onChange({
          type: 'meta',
          origin, // Use determined origin instead of always SYSTEM
          payload: { key, action: change.action },
        });
      });
    });
  }

  /**
   * Wait for server sync to complete before UI interaction
   * @returns {Promise<void>}
   */
  async waitForServerSync() {
    return new Promise((resolve) => {
      if (this._ready && this._wsProvider?.wsconnected) {
        resolve(); // Already synced
        return;
      }

      const handleSync = () => {
        if (this._wsProvider?.wsconnected) {
          this._wsProvider.off('sync', handleSync);
          resolve();
        }
      };

      this._wsProvider?.on('sync', handleSync);
    });
  }

  subscribe(onChange) {
    this._onChange = onChange;
    return () => {
      if (this._onChange === onChange) this._onChange = null;
    };
  }

  getSnapshot() {
    if (!this._yNotes || !this._yConnections) {
      return { data: { n: [], c: [] } };
    }

    // Convert Y.Map data to MindMeld format
    const n = [];
    this._yNotes.forEach((note, id) => {
      n.push({
        i: id,
        p: note.pos || [0, 0],
        c: note.content || '',
        ...(note.color ? { cl: note.color } : {}),
      });
    });

    const c = [];
    this._yConnections.forEach((conn) => {
      c.push([conn.from, conn.to, conn.type]);
    });

    return { data: { n, c } };
  }

  importJSON(json) {
    if (!this._yNotes || !this._yConnections) {
      throw new Error('YjsProvider not initialized - call init() first');
    }

    try {
      const parsed = JSON.parse(json);
      const data = parsed?.data || parsed;

      // Validate basic data structure
      if (data && typeof data === 'object') {
        // Use Y.Doc transaction for atomic updates
        this._ydoc.transact(() => {
          // Clear existing data
          this._yNotes.clear();
          this._yConnections.clear();

          // Import notes with content size limit enforcement
          if (Array.isArray(data.n)) {
            data.n.forEach((note) => {
              if (note && typeof note === 'object' && note.i) {
                this._yNotes.set(String(note.i), {
                  id: String(note.i),
                  content: truncateNoteContent(String(note.c || '')),
                  pos: Array.isArray(note.p) ? note.p : [0, 0],
                  color: note.cl,
                });
              }
            });
          }

          // Import connections
          if (Array.isArray(data.c)) {
            data.c.forEach((triple) => {
              if (Array.isArray(triple) && triple.length >= 3) {
                const [from, to, type] = triple;
                const connId = makeConnectionId(
                  String(from),
                  String(to),
                  Number(type) || 1,
                );
                this._yConnections.set(connId, {
                  from: String(from),
                  to: String(to),
                  type: Number(type) || 1,
                });
              }
            });
          }
        }, ORIGIN.SYSTEM); // Mark as system origin

        if (this._onChange) {
          this._onChange({
            type: 'snapshot',
            origin: ORIGIN.SYSTEM,
            payload: null,
          });
        }
      } else {
        throw new Error(
          'Invalid data structure: expected object with notes and connections',
        );
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`Invalid JSON format: ${e.message}`);
      } else if (e.message.includes('Invalid data structure')) {
        throw e;
      } else {
        console.error('YjsProvider.importJSON error:', e);
        throw new Error(`Import failed: ${e.message}`);
      }
    }
  }

  exportJSON() {
    try {
      const snapshot = this.getSnapshot();
      return JSON.stringify(snapshot);
    } catch (e) {
      console.error('YjsProvider.exportJSON error:', e);
      throw new Error(`Export failed: ${e.message}`);
    }
  }

  upsertNote(note, opts = {}) {
    if (!this._yNotes) {
      throw new Error('YjsProvider not initialized - call init() first');
    }

    const id = String(note.id);
    const origin = opts.origin || ORIGIN.USER;

    // Get existing note or create new one
    const prev = this._yNotes.get(id) || { id };
    const next = { ...prev };

    if (note.content !== undefined) {
      // Enforce content size limit
      next.content = truncateNoteContent(String(note.content));
    }
    if (note.pos !== undefined) next.pos = note.pos;
    if (note.color !== undefined) next.color = note.color;

    // Update in Y.Doc with origin marking
    this._ydoc.transact(() => {
      this._yNotes.set(id, next);
    }, origin);

    if (this._onChange) {
      this._onChange({
        type: 'notes',
        origin,
        payload: { id },
      });
    }
  }

  deleteNote(id, opts = {}) {
    if (!this._yNotes) {
      throw new Error('YjsProvider not initialized - call init() first');
    }

    const key = String(id);
    const origin = opts.origin || ORIGIN.USER;

    this._ydoc.transact(() => {
      this._yNotes.delete(key);
    }, origin);

    if (this._onChange) {
      this._onChange({
        type: 'notes',
        origin,
        payload: { id: key, deleted: true },
      });
    }
  }

  upsertConnection(conn, opts = {}) {
    if (!this._yConnections) {
      throw new Error('YjsProvider not initialized - call init() first');
    }

    const id = conn.id || makeConnectionId(conn.from, conn.to, conn.type);
    const origin = opts.origin || ORIGIN.USER;

    this._ydoc.transact(() => {
      this._yConnections.set(String(id), {
        from: conn.from,
        to: conn.to,
        type: conn.type,
      });
    }, origin);

    if (this._onChange) {
      this._onChange({
        type: 'connections',
        origin,
        payload: { id },
      });
    }
  }

  deleteConnection(connId, opts = {}) {
    if (!this._yConnections) {
      throw new Error('YjsProvider not initialized - call init() first');
    }

    const key = String(connId);
    const origin = opts.origin || ORIGIN.USER;

    this._ydoc.transact(() => {
      this._yConnections.delete(key);
    }, origin);

    if (this._onChange) {
      this._onChange({
        type: 'connections',
        origin,
        payload: { id: key, deleted: true },
      });
    }
  }

  setMeta(meta, opts = {}) {
    if (!this._yMeta) {
      // Fallback to local meta if Y.Doc not initialized
      this._meta = { ...this._meta, ...meta };
      if (this._onChange) {
        this._onChange({
          type: 'meta',
          origin: opts.origin || ORIGIN.USER,
          payload: { meta: this._meta },
        });
      }
      return;
    }

    const origin = opts.origin || ORIGIN.USER;

    this._ydoc.transact(() => {
      Object.entries(meta).forEach(([key, value]) => {
        this._yMeta.set(key, value);
      });
    }, origin);

    if (this._onChange) {
      this._onChange({
        type: 'meta',
        origin,
        payload: { meta: this.getMeta() },
      });
    }
  }

  getMeta() {
    if (!this._yMeta) {
      return { ...this._meta }; // Fallback to local meta
    }

    // Convert Y.Map to plain object safely
    const meta = {};
    this._yMeta.forEach((value, key) => {
      // eslint-disable-next-line security/detect-object-injection
      meta[key] = value;
    });

    return { ...this._meta, ...meta }; // Merge with defaults
  }
}
