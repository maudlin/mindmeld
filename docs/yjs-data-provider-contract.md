# Yjs Data Provider Contract (Client) — Draft

Audience: Client and Server teams
Status: Draft for review (MS-61)

Summary
- This document defines the client-side DataProvider interface and the Y.Doc schema used by the Yjs-based data layer.
- It also documents event-origin semantics, the initial sync handshake rules, and the connection ID scheme used to uniquely identify connections.

Goals
- Provide a stable boundary between UI/behaviors and data persistence/sync.
- Enable offline-first operation via y-indexeddb and real-time sync via y-websocket when connected.
- Preserve export/import compatibility with the existing JSON format.

Non-goals (initial)
- Auth/permissions, presence UX, advanced search.

Contract: DataProvider (TypeScript-like signatures)
```ts path=null start=null
export interface DataProvider {
  // lifecycle
  init(
    mapId: string | null,
    options?: {
      serverUrl?: string | null;
      serverSync?: boolean;            // default false
      onReady?: () => void;            // fires when doc hydrated and ready for UI
    }
  ): () => void;                       // returns unsubscribe/cleanup

  destroy(): void;

  // observation
  subscribe(
    onChange: (change: {
      type: 'notes' | 'connections' | 'meta' | 'snapshot';
      origin: 'user' | 'system';
      payload: unknown;                // normalized delta or compact snapshot hash
    }) => void,
  ): () => void;

  // snapshot/io
  getSnapshot(): { data: { n: any[]; c: any[] } };
  importJSON(json: string): void;      // transactional apply; origin=system; no user events
  exportJSON(): string;                // built from Y.Doc, not DOM

  // notes
  upsertNote(
    note: { id: string; content?: string; pos?: [number, number]; color?: string },
    opts?: { origin?: 'user' | 'system' },
  ): void;
  deleteNote(id: string, opts?: { origin?: 'user' | 'system' }): void;

  // connections (connId = `${from}:${to}:${type}`)
  upsertConnection(
    conn: { id?: string; from: string; to: string; type: number },
    opts?: { origin?: 'user' | 'system' },
  ): void;
  deleteConnection(connId: string, opts?: { origin?: 'user' | 'system' }): void;

  // meta
  setMeta(
    meta: Partial<{ zoomLevel: number; canvasType: string; mapName: string }>,
    opts?: { origin?: 'user' | 'system' },
  ): void;
  getMeta(): { zoomLevel: number; canvasType: string; mapName: string };
}
```

Y.Doc schema (client)
```ts path=null start=null
// ydoc structure
const notes = ydoc.getMap('notes');         // Map<noteId, Y.Map({ id, pos:[x,y], color, content: Y.Text })>
const connections = ydoc.getMap('connections'); // Map<connId, Y.Map({ from, to, type })>
// connId must be direction-inclusive: `${from}:${to}:${type}`
const meta = ydoc.getMap('meta');           // zoomLevel, canvasType, mapName

// constraints
// - content: markdown-only (HTML disallowed; keep defang renderer pipeline)
// - enforce NOTE_CONTENT_LIMIT at provider write boundaries
```

Connection ID scheme
- Use a stable, direction-inclusive key: `${fromId}:${toId}:${type}`.
- Guarantees uniqueness for pairs and simplifies updates/removals.

Event origin semantics
- origin must be provided on all provider-driven notifications.
- Any updates applied from Y.Doc into the DOM must be dispatched as origin=system to avoid autosave/UI logic treating them as user edits.
- DOM → provider writes may debounce/throttle at the adapter boundary. The provider should not debounce internally (Yjs batching suffices).

Initial sync handshake rules
- Offline-only: initialize from y-indexeddb; suppress user events during hydration; call onReady when hydrated.
- Connected: init(mapId, { serverSync: true, serverUrl }); do NOT REST GET the map; rely on y-websocket (/yjs/:mapId) to hydrate from server snapshot; call onReady when doc first syncs.

Export/import bridge
- exportJSON builds the JSON view directly from Y.Doc (no DOM dependence).
- importJSON transactionally replaces doc state and must suppress user-level events during apply.

Acceptance criteria (MS-61)
- This document approved by both teams.
- A scaffolding interface exists in code (DataProvider with stubs and utilities) and is covered by contract-shape tests.
