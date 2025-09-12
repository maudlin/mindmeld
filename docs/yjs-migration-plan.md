# Yjs Migration Plan: MindMeld Client and Server

Audience: Client (web app) and Server teams
Status: Draft for review
Owners: Client lead, Server lead

1) Summary
- Goal: Replace fragile whole-document save/load flows with a robust, real-time capable, offline-first data layer based on Yjs, while keeping the app fully usable without a server.
- Strategy: Introduce a clear data provider boundary on the client; add a Yjs provider with local persistence (y-indexeddb) first; then add a minimal y-websocket sync on the server. Keep existing REST /maps for listing and backup export/import.
- Outcome: Stable single-user UX now; easy path to multi-device and multi-user collaboration later.

2) Goals and non-goals
- Goals
  - Preserve standalone (no server) operation; data persists locally.
  - Eliminate autosave/load races and state corruption during hydration.
  - Enable multi-device sync via y-websocket server connection when configured.
  - Maintain export/import compatibility with current JSON data format.
  - Keep Maps REST API for map listing and backups; no hard dependency on it for collaboration.
- Non-goals (initially)
  - Auth/permissions, sharing UI, presence UX.
  - Full CRDT-based fine-grained server-side conflict resolution beyond Yjs’ guarantees.
  - Rich search/indexing of map content.

3) Architecture overview (target)
- Client
  - DataProvider interface consumed by UI/behaviors.
  - LocalJSONProvider (transitional) and YjsProvider (final) implementations.
  - YjsProvider stores state in a Y.Doc:
    - notes: Y.Map<noteId, Y.Map({ id, pos: [x,y], color, content: Y.Text })>
    - connections: Y.Map<connId, Y.Map({ from, to, type })> (or Y.Array of tuples)
    - meta: Y.Map({ zoomLevel, canvasType, mapName })
  - Offline-first via y-indexeddb; optional sync via y-websocket when connected.
- Server
  - Keep /maps REST: POST/GET list/GET by id/PUT with ETag for backups and list UIs.
  - Add y-websocket endpoint /yjs/:mapId for real-time sync.
  - Persist Y.Doc snapshots to SQLite as BLOB (additive), periodic or on demand.
  - Maintain ETag/version for REST reads (derived from snapshot or JSON export).

4) Phased plan (with acceptance criteria)

Phase 0 — Alignment & Interfaces (1–2 days)
- See also: docs/yjs-data-provider-contract.md (contract + schema)
- Define DataProvider interface consumed by the client app (create/update/delete note, create/update/delete connection, getSnapshot, applySnapshot, subscribe(onChange), setMeta/getMeta).
- Decide Y.Doc schema and JSON conversion rules (round-trip compatible with current data: { data: { n:[], c:[] } }).
- Deliverables
  - Interface TypeScript/JS doc in client repo.
  - Schema doc in server design/to-be/.
- Acceptance criteria
  - Interface and schema approved by both teams.
- Define DataProvider interface consumed by the client app (create/update/delete note, create/update/delete connection, getSnapshot, applySnapshot, subscribe(onChange), setMeta/getMeta).
- Decide Y.Doc schema and JSON conversion rules (round-trip compatible with current data: { data: { n:[], c:[] } }).
- Deliverables
  - Interface TypeScript/JS doc in client repo.
  - Schema doc in server design/to-be/.
- Acceptance criteria
  - Interface and schema approved by both teams.

Phase 1 — Client: Provider boundary + LocalJSONProvider (0.5–1.5 days)
- Add DataProvider and implement LocalJSONProvider around existing export/import + appState.
- Suppress programmatic events during hydration; add autosave pause/resume hooks.
- Switch UI/behaviors to go through DataProvider only.
- Deliverables
  - LocalJSONProvider; adapters wired; no user-visible changes.
- Acceptance criteria
  - All tests pass; autosave no longer triggers during import/restore; no regressions.

Phase 2 — Client: Yjs offline-first (2–4 days)
- Add YjsProvider with Y.Doc schema and y-indexeddb persistence.
- Implement JSON <-> Y.Doc converters to support import/export.
- Wire UI subscriptions to Y.Doc updates (single source of truth). Use a guard to avoid feedback loops when applying doc updates to DOM.
- Feature flag: `DATA_PROVIDER=yjs|json` (default json until ready).
- Deliverables
  - YjsProvider behind flag; import/export parity; unit/E2E tests for offline edits and reload.
- Acceptance criteria
  - With DATA_PROVIDER=yjs and no server, user can create/edit/move/color notes, refresh page, and see data restored by y-indexeddb.
  - Export → delete → import round-trips losslessly.

Phase 3 — Server: y-websocket + snapshots (3–5 days)
- Add /yjs/:mapId y-websocket endpoint (using y-websocket). Room per mapId.
- Persistence strategy:
  - Add columns: ydoc_blob BLOB NULL, y_version INTEGER, last_snapshot_at to maps.
  - Implement snapshot save on intervals (e.g., after N ops or T seconds) or on demand.
  - Provide admin/dev endpoint POST /maps/:id/snapshot (optional) for manual persistence.
- Keep REST /maps as-is; ensure CORS for WS if needed.
- Deliverables
  - WebSocket endpoint; snapshot persistence; migration script.
- Acceptance criteria
  - Two local clients connected to the same mapId see live convergence; snapshots written; server restarts do not lose last snapshot.

Phase 4 — Client: enable server sync (2–4 days)
- Extend YjsProvider to connect to /yjs/:mapId when server is configured in the app (menu/connect UI).
- Map selection remains via REST /maps list (unchanged) or separate modal.
- On connect: load existing Y.Doc from server via websocket (server’s state) and continue syncing; on disconnect: remain offline with y-indexeddb.
- Deliverables
  - Working multi-device sync on LAN; menu shows Connected/Disconnected states; conflicts naturally resolved by Yjs.
- Acceptance criteria
  - Two browsers/devices collaborate on the same map with low latency; offline edits resync when connection returns.

Phase 5 — REST bridging: list + backup import/export (1–2 days)
- Keep /maps for listing and metadata (id, name, version, updatedAt, size).
- Implement export from Y.Doc to REST JSON on demand (e.g., “Export to file” or “Backup to server blob”).
- Optional: POST /maps/:id/import to seed or override from JSON (admin/dev usage).
- Deliverables
  - Documented conversion endpoints/workflows; confirm backward compatibility for file exports.
- Acceptance criteria
  - Users can export/backup maps; client import works; no change to existing JSON semantics.

Phase 6 — Cleanup & deprecations (1–2 days)
- Remove legacy ServerClient autosave/ETag flows from the client; minimize duplication.
- Keep Maps REST primarily for list/backup; document deprecation of whole-document autosave.
- Deliverables
  - Deleted legacy paths; documentation updates; CI and docs green.
- Acceptance criteria
  - Client defaults to YjsProvider; unit/E2E suites stable; code paths simplified.

5) Work breakdown (by team)
- Client
  - Define DataProvider + LocalJSONProvider (P1).
  - Implement YjsProvider + y-indexeddb (P2).
  - Hook menu/connect to y-websocket; feature flag (P4).
  - DOM update guard and event-origin strategy; import/export converters (P2).
  - Remove legacy ServerClient autosave (P6).
- Server
  - y-websocket endpoint + room management (P3).
  - SQLite migration for snapshots; snapshot policy (P3).
  - Optional export/import bridge endpoints (P5).
  - Update docs and OpenAPI where applicable.

6) Testing strategy
- Unit
  - JSON<->Y.Doc conversion; note/connection operations; snapshotter.
- Integration
  - y-websocket convergence; snapshot persistence across restarts; REST list/export still correct.
- E2E
  - Client workflows (create/edit/move/color) under Yjs provider; offline reload persists; two-browser collaboration; disconnect/reconnect.
- Regression
  - No autosave triggered during import/hydration; no data corruption from edit/view transitions.

7) Observability & operations
- Metrics
  - Snapshot count/size; room count; connected clients; WS errors; snapshot latency.
- Logs
  - Map room connect/disconnect; snapshot events; REST bridge usage.
- Backups
  - SQLite backup schedule; snapshot compaction strategy (optional) to bound DB size.

8) Security & compliance (initial)
- CORS and WS origin restrictions aligned with client origin.
- No auth initially; plan for API key/OIDC later without changing paths.
- Input validation on REST bridge endpoints.

9) Risks & mitigations
- Binary snapshot growth: mitigate with periodic compaction; store latest snapshot only; optional Delta storage later.
- WS infra and NAT issues: provide robust reconnect and offline fallback (y-indexeddb source of truth local-first).
- Feedback loops: enforce DOM update guards and source metadata to avoid self-triggered event storms.
- Timeline slip: parallelize Phase 2 (client Yjs) and Phase 3 (server WS) after Phase 0 aligns the interfaces.

10) Rollout & feature flags
- Flags
  - DATA_PROVIDER=yjs|json
  - SERVER_SYNC=on|off
- Environments
  - Local/dev first; then staging; then production.
- Rollback
  - Switch provider flag back to json; server keeps REST /maps unaffected.

11) Timeline (rough, single squad)
- P0: 1–2 days
- P1: 0.5–1.5 days
- P2: 2–4 days
- P3: 3–5 days
- P4: 2–4 days
- P5: 1–2 days
- P6: 1–2 days
Total: ~10–20 days depending on team size and overlap. Parallelization: P2 and P3 can overlap after P0.

12) Acceptance criteria recap
- Offline-first: Edits persist via y-indexeddb; reload restores; no autosave-on-load.
- Real-time: Two clients converge via /yjs/:mapId; disconnect/reconnect works.
- Compatibility: JSON export/import parity maintained; REST /maps list and backups intact.
- Simplicity: Legacy save/load path removed from client; provider boundary enforced.

13) Jira epic draft (to be created)
- Epic: “Yjs migration: offline-first and real-time sync”
  - Story: Define DataProvider and Y.Doc schema
  - Story: Implement LocalJSONProvider; wire UI
  - Story: Implement YjsProvider + y-indexeddb; converters; tests
  - Story: Add /yjs/:mapId endpoint and snapshots; DB migration; tests
  - Story: Client-server sync integration; connect UI; reconnection
  - Story: REST bridge for export/import; docs
  - Story: Cleanup legacy autosave; finalize docs; rollout
  - Task templates per story: code, tests, docs, operational runbook

14) Appendix: Data schema mapping
- JSON export/import (existing):
  - data.n: [{ i, p:[x,y], c, cl? }]
  - data.c: [[from, to, type]]
- Y.Doc mapping:
  - notes: Map<id → { id, pos:[x,y], color, content: Y.Text(markdown) }>
  - connections: Map<connId → { from, to, type }>
  - meta: { zoomLevel, canvasType, mapName }
- Rendering & security: continue to store markdown only and use existing safe renderer (defang pipeline unchanged).

