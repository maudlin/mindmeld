// src/js/data/providers/YjsProvider.js
// Skeleton implementation to satisfy contract tests; behavior will be implemented in MS-63.
import { DataProvider, ORIGIN, makeConnectionId } from './DataProvider.js';

export class YjsProvider extends DataProvider {
  constructor() {
    super();
    this._ready = false;
    this._onChange = null;
    this._meta = {
      zoomLevel: 5,
      canvasType: 'Standard Canvas',
      mapName: 'Untitled Map',
    };
    this._notes = new Map(); // id -> { id, content, pos, color }
    this._connections = new Map(); // connId -> { from, to, type }
  }

  init(_mapId, options = {}) {
    // For now, just mark ready and call onReady; real hydration added in MS-63
    this._ready = true;
    if (typeof options.onReady === 'function') {
      options.onReady();
    }
    return () => this.destroy();
  }

  destroy() {
    this._onChange = null;
  }

  subscribe(onChange) {
    this._onChange = onChange;
    return () => {
      if (this._onChange === onChange) this._onChange = null;
    };
  }

  getSnapshot() {
    const n = Array.from(this._notes.values()).map((n) => ({
      i: n.id,
      p: n.pos || [0, 0],
      c: n.content || '',
      ...(n.color ? { cl: n.color } : {}),
    }));
    const c = Array.from(this._connections.values()).map((conn) => [
      conn.from,
      conn.to,
      conn.type,
    ]);
    return { data: { n, c } };
  }

  importJSON(json) {
    try {
      const parsed = JSON.parse(json);
      const data = parsed?.data || parsed;
      // Replace state transactionally
      this._notes.clear();
      this._connections.clear();
      (data.n || []).forEach((note) => {
        this._notes.set(String(note.i), {
          id: String(note.i),
          content: String(note.c || ''),
          pos: note.p || [0, 0],
          color: note.cl,
        });
      });
      (data.c || []).forEach((triple) => {
        const [from, to, type] = triple;
        const id = makeConnectionId(String(from), String(to), Number(type));
        this._connections.set(id, {
          from: String(from),
          to: String(to),
          type: Number(type),
        });
      });
      if (this._onChange)
        this._onChange({
          type: 'snapshot',
          origin: ORIGIN.SYSTEM,
          payload: null,
        });
    } catch (e) {
      console.error('YjsProvider.importJSON parse error:', e);
      throw e;
    }
  }

  exportJSON() {
    return JSON.stringify(this.getSnapshot());
  }

  upsertNote(note) {
    const id = String(note.id);
    const prev = this._notes.get(id) || { id };
    const next = { ...prev };
    if (note.content !== undefined) next.content = String(note.content);
    if (note.pos !== undefined) next.pos = note.pos;
    if (note.color !== undefined) next.color = note.color;
    this._notes.set(id, next);
    if (this._onChange)
      this._onChange({ type: 'notes', origin: ORIGIN.USER, payload: { id } });
  }

  deleteNote(id) {
    const key = String(id);
    this._notes.delete(key);
    if (this._onChange)
      this._onChange({
        type: 'notes',
        origin: ORIGIN.USER,
        payload: { id: key, deleted: true },
      });
  }

  upsertConnection(conn) {
    const id = conn.id || makeConnectionId(conn.from, conn.to, conn.type);
    this._connections.set(String(id), {
      from: conn.from,
      to: conn.to,
      type: conn.type,
    });
    if (this._onChange)
      this._onChange({
        type: 'connections',
        origin: ORIGIN.USER,
        payload: { id },
      });
  }

  deleteConnection(connId) {
    const key = String(connId);
    this._connections.delete(key);
    if (this._onChange)
      this._onChange({
        type: 'connections',
        origin: ORIGIN.USER,
        payload: { id: key, deleted: true },
      });
  }

  setMeta(meta) {
    this._meta = { ...this._meta, ...meta };
    if (this._onChange)
      this._onChange({
        type: 'meta',
        origin: ORIGIN.USER,
        payload: { meta: this._meta },
      });
  }

  getMeta() {
    return { ...this._meta };
  }
}
