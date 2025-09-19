# Yjs Client Migration Plan: MindMeld Frontend

**Audience**: Frontend team, Product team  
**Status**: Ready for Jira epic creation  
**Owner**: Frontend lead  
**Dependencies**: Server Yjs migration plan (docs/yjs-migration-plan.md)

## 1) Executive Summary

**Objective**: Replace fragile autosave/load system with robust Yjs-based data layer that eliminates race conditions while maintaining offline-first functionality.

**Strategy**: Implement DataProvider abstraction, migrate from DOM-based state to Yjs CRDT, add real-time collaboration capability.

**Timeline**: 10-15 development days across 6 phases

**Success Metrics**: 
- Zero autosave race conditions during map loading
- Offline-first functionality preserved 
- Real-time multi-device collaboration enabled
- No user-facing regressions

## 2) Current Problems Being Solved

**Critical Issues**:
- **Autosave races**: Loading maps triggers note creation events → incremental autosaves → ETag conflicts
- **State fragmentation**: DOM, appState, localStorage, and server state inconsistencies  
- **Event storms**: importFromJSON triggers cascading save events during hydration
- **Complex conflict resolution**: Manual ETag handling with recursive retry logic

**User Impact**:
- Map loading sometimes fails with "ETag conflict" errors
- Inconsistent data persistence across browser refreshes
- Performance degradation during large map imports
- Unreliable offline/online state transitions

## 3) Architecture Overview

### Current State (Problematic)
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    DOM      │ ←→ │  appState   │ ←→ │ localStorage│
│ (source of  │    │ (parallel   │    │  (backup)   │
│  truth)     │    │  state)     │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
       ↕                    ↕
┌─────────────┐    ┌─────────────┐
│ ServerClient│    │EventBus race│
│ (autosave)  │    │ conditions  │
└─────────────┘    └─────────────┘
```

### Target State (Clean)
```
┌─────────────────────────────────────────┐
│              DataProvider               │
│  ┌─────────────┐    ┌─────────────────┐ │
│  │LocalJSON    │    │  YjsProvider    │ │
│  │Provider     │    │  (Y.Doc + IDB)  │ │
│  └─────────────┘    └─────────────────┘ │
└─────────────────────────────────────────┘
                   ↕
            ┌─────────────┐
            │ DOM Renderer│
            │ (read-only) │
            └─────────────┘
                   ↕
            ┌─────────────┐
            │ WebSocket   │
            │(per map ID) │
            └─────────────┘
```

### Y.Doc Schema (Final)
```javascript
// Agreed schema with server team
{
  notes: Y.Map<noteId, Y.Map({
    id: string,
    pos: [x: number, y: number], 
    color?: string,
    content: Y.Text  // Markdown only, no HTML
  })>,
  
  connections: Y.Map<connId, Y.Map({
    from: string,
    to: string, 
    type: 'none' | 'from_to' | 'to_from' | 'bidirectional'
  })>,  // connId format: "${fromId}:${toId}:${type}"
  
  meta: Y.Map({
    zoomLevel: number,
    canvasType: string,
    mapName: string
  })
}
```

## 4) Phased Implementation Plan

### Phase 0: Interface Design & Schema Alignment (1-2 days)
**Epic**: Foundation Setup  
**Goal**: Define contracts between client/server teams incorporating server feedback

**Stories**:
- **Story**: Define concrete DataProvider interface specification
  - Task: Create DataProvider class with concrete method signatures
  - Task: Define init(mapId, options) with connection management
  - Task: Define upsert/delete methods with idempotent operations
  - Task: Define subscribe(onChange) with normalized payloads
  - **AC**: Interface matches server team's contract requirements

- **Story**: Establish Y.Doc schema with connection ID format
  - Task: Define stable connection ID format: `"${fromId}:${toId}:${type}"`
  - Task: Map current JSON to Y.Map structure (not Y.Array for performance)
  - Task: Define Y.Text content handling for markdown-only policy
  - Task: Create bidirectional JSON conversion utilities
  - **AC**: Schema approved by server team, supports their snapshot strategy

- **Story**: Define origin marking and event semantics
  - Task: Document transaction origin='system' requirement for Y.Doc updates
  - Task: Define guard patterns to prevent feedback loops
  - Task: Specify debouncing policy (at adapter boundary, not provider)
  - **AC**: Event handling contract prevents user event triggering during hydration

**Deliverables**:
- `src/js/data/DataProvider.js` - Concrete interface with signatures
- `src/js/data/YjsSchema.js` - Final schema with connection ID format
- `src/js/data/YjsConverters.js` - JSON conversion utilities
- Event semantics documentation

### Phase 1: Provider Abstraction + LocalJSONProvider (1-2 days)
**Epic**: Fix Current Issues  
**Goal**: Eliminate autosave races immediately while adding provider abstraction

**Stories**:
- **Story**: Implement LocalJSONProvider wrapper
  - Task: Wrap existing dataStore/storageManager behind DataProvider interface
  - Task: Add hydration guards to prevent autosave during import
  - Task: Implement pause/resume autosave hooks
  - **AC**: All existing functionality works through provider interface

- **Story**: Refactor UI components to use DataProvider
  - Task: Update NoteService to call provider methods
  - Task: Update ConnectionService to use provider
  - Task: Replace direct dataStore calls in behaviors
  - **AC**: No direct dataStore/storageManager access remains in UI layer

- **Story**: Add autosave race condition prevention
  - Task: Implement hydrationInProgress flag in LocalJSONProvider
  - Task: Suppress programmatic events during applySnapshot()
  - Task: Add unit tests for race condition scenarios
  - **AC**: importFromJSON no longer triggers autosave events

**Deliverables**:
- `src/js/data/LocalJSONProvider.js`
- Updated NoteService, ConnectionService 
- **Critical**: Fixes current autosave-during-load issues

**Risk Mitigation**: This phase solves the immediate problem while building toward Yjs

### Phase 2: YjsProvider + Offline Persistence (3-4 days)
**Epic**: Yjs Foundation  
**Goal**: Replace localStorage with Yjs + IndexedDB persistence

**Stories**:
- **Story**: Implement YjsProvider core functionality
  - Task: Set up Y.Doc with notes/connections/meta maps
  - Task: Implement CRUD operations using Y.Map/Y.Array
  - Task: Add IndexedDB persistence with y-indexeddb
  - **AC**: All note/connection operations work through Yjs

- **Story**: Create JSON ↔ Y.Doc converters
  - Task: Implement fromMindMeldJSON() for import functionality
  - Task: Implement toMindMeldJSON() for export compatibility  
  - Task: Handle note content as Y.Text for CRDT benefits
  - **AC**: Export → delete → import round-trips losslessly

- **Story**: Add DOM update observers
  - Task: Set up Y.Doc observers to trigger DOM renders
  - Task: Implement feedback loop prevention (applyingSnapshot guards)
  - Task: Ensure UI updates only from Yjs changes, not DOM events
  - **AC**: DOM stays in sync with Y.Doc without event storms

- **Story**: Feature flag integration
  - Task: Add DATA_PROVIDER=json|yjs environment variable
  - Task: Update bootstrap to select provider based on flag
  - Task: Add runtime provider switching for testing
  - **AC**: Can toggle between providers without code changes

**Deliverables**:
- `src/js/data/YjsProvider.js`
- `src/js/data/YjsConverters.js`
- `src/js/core/featureFlags.js` updates
- Comprehensive unit tests

**Testing Focus**: Offline persistence, page refresh, import/export parity, content size limits, Y.Map performance

### Phase 3: UI Integration + Event System Overhaul (2-3 days)
**Epic**: Clean UI Architecture  
**Goal**: Remove DOM as source of truth, clean up event-driven complexity

**Stories**:
- **Story**: Refactor DOM rendering to be read-only
  - Task: Update note rendering to be driven by DataProvider changes
  - Task: Update connection rendering to use provider events
  - Task: Remove direct DOM queries in getCurrentState()
  - **AC**: DOM is pure view layer, never queried for state

- **Story**: Simplify event system
  - Task: Replace complex event cascades with provider subscriptions
  - Task: Remove note/connection creation events (replaced by provider)
  - Task: Clean up debounced save logic (provider handles persistence)
  - **AC**: Event system simplified, fewer event listeners overall

- **Story**: Update color system for Yjs
  - Task: Store colors in Y.Doc note properties instead of separate service
  - Task: Update ColorService to work with provider-based notes
  - Task: Maintain color persistence through provider interface
  - **AC**: Color changes persist and sync properly

**Deliverables**:
- Refactored rendering system
- Simplified event architecture
- Updated ColorService integration

### Phase 4: Server Sync Integration (2-3 days) 
**Epic**: Real-time Collaboration  
**Goal**: Connect to server WebSocket for multi-device sync with our UX flow

**Dependencies**: Server Phase 3 (y-websocket endpoint) must be complete

**Stories**:
- **Story**: Implement two-phase server connection supporting our UX flow
  - Task: Add testServerConnection() method for initial server validation
  - Task: Add setServerUrl() to store connection without initializing Y.Doc
  - Task: Modify init(mapId, options) to use stored server URL
  - Task: Ensure WebSocket connects to /yjs/:mapId only after map selection
  - **AC**: "Connect to Server" → "Browse Maps" → "Load Map" flow works technically

- **Story**: Add WebSocket-only hydration (no double-hydration)  
  - Task: Remove REST+WebSocket loading approach
  - Task: Let y-websocket provide initial state from server snapshot
  - Task: Add waitForServerSync() to ensure doc ready before UI interaction
  - **AC**: Map loading uses only WebSocket, no REST /maps/:id/export calls

- **Story**: Implement origin marking and feedback loop prevention
  - Task: Add origin='system' marking for all Y.Doc updates from server
  - Task: Update observers to ignore transactions with origin='system'  
  - Task: Add applyingFromDoc guard flags during programmatic updates
  - **AC**: Remote changes don't trigger user event handlers or autosave logic

- **Story**: Update server connection UI for real-time status
  - Task: Show connection status for server (not individual maps)
  - Task: Update menu to show "Browse Maps" after server connection
  - Task: Add real-time sync indicators and reconnection handling
  - **AC**: User sees clear server connected → map syncing states

**Deliverables**:
- Two-phase connection system supporting our UX
- WebSocket-only hydration with origin marking
- Updated connection UI preserving user-friendly flow
- Multi-device collaboration functionality

**Testing Focus**: Our UX flow (connect→browse→load), two-browser collaboration, origin marking prevents loops

### Phase 5: REST API Bridge + Import/Export (1-2 days)
**Epic**: Backwards Compatibility  
**Goal**: Maintain existing export/import workflows with clear REST boundaries

**Stories**:
- **Story**: Update export functionality with Y.Doc source of truth
  - Task: Export from Y.Doc using toMindMeldJSON converter (not DOM)
  - Task: Maintain current JSON format: { data: { n:[], c:[] } }
  - Task: Enforce content size limits during export (NOTE_CONTENT_LIMIT)
  - **AC**: Exported files match current structure, no DOM dependencies

- **Story**: Update import with transactional Y.Doc replacement
  - Task: Replace entire Y.Doc state transactionally during import
  - Task: Suppress user-level events during importJSON() operation  
  - Task: Use origin='system' marking for import transactions
  - Task: Support import in both offline and collaborative modes
  - **AC**: Import replaces Y.Doc cleanly, no user events during hydration

- **Story**: Clarify REST as backup/listing only (not source of truth)
  - Task: Document that ETag/version apply to exported JSON view
  - Task: Position REST endpoints as backup/metadata, not live state
  - Task: Ensure REST export reflects Y.Doc snapshots, not independent state
  - **AC**: Clear documentation that Y.Doc is source of truth once active

**Deliverables**:
- Y.Doc-based import/export (no DOM queries)
- Transactional import with event suppression
- Clear REST boundary documentation

### Phase 6: Legacy Cleanup + Production Readiness (1-2 days)
**Epic**: Finalization  
**Goal**: Remove old code paths, optimize for production

**Stories**:
- **Story**: Remove legacy ServerClient code
  - Task: Delete ServerClient.js and related autosave logic
  - Task: Remove ETag conflict resolution code
  - Task: Clean up old server connection management
  - **AC**: Legacy server sync code completely removed

- **Story**: Performance optimization  
  - Task: Optimize Y.Doc operations for large documents
  - Task: Add lazy loading for large maps
  - Task: Implement efficient diff rendering
  - **AC**: Maps with 1000+ notes perform well

- **Story**: Production configuration
  - Task: Set YjsProvider as default (DATA_PROVIDER=yjs)
  - Task: Add monitoring hooks and error handling
  - Task: Update deployment documentation
  - **AC**: Production deployment ready with Yjs as default

**Deliverables**:
- Cleaned codebase with legacy code removed
- Performance optimizations
- Production-ready configuration

## 5) Testing Strategy

### Unit Tests
**New Test Files**:
- `DataProvider.test.js` - Interface compliance, concrete method signatures
- `LocalJSONProvider.test.js` - Wrapper functionality, race condition prevention
- `YjsProvider.test.js` - CRUD operations, persistence, observers, origin marking
- `YjsConverters.test.js` - JSON conversion accuracy, stable connection IDs
- `ConnectionIdFormat.test.js` - Validate "${fromId}:${toId}:${type}" format

**Updated Test Files**:
- Update existing service tests to work with provider abstraction
- Add provider integration tests to existing behavior tests
- Add content size limit tests (NOTE_CONTENT_LIMIT enforcement)
- Add Y.Map vs Y.Array performance comparison tests

### Integration Tests  
**Key Scenarios**:
- Provider switching (JSON ↔ Yjs) maintains functionality
- Offline persistence across browser restarts
- Import/export round-trip accuracy with stable connection IDs
- Real-time collaboration convergence with origin='system' marking
- Two-phase connection flow (server connect → browse → map load)
- WebSocket-only hydration (no double-hydration via REST)
- Connection loss/recovery handling

### E2E Tests
**Critical User Flows**:
- Create/edit/move notes with YjsProvider
- Page refresh preserves state via IndexedDB  
- Two-browser collaboration scenarios
- Export/import maintains functionality
- Server connection/disconnection handling

### Regression Tests
**Specific Issues Being Prevented**:
- No autosave triggered during importFromJSON
- No state corruption during loading operations
- No event storms during DOM updates
- No data loss during provider transitions

## 6) Risk Management

### Technical Risks
- **Y.Doc feedback loops**: Mitigate with applyingSnapshot guards and event source tracking
- **Performance with large documents**: Implement incremental rendering and lazy loading
- **Browser compatibility**: Test thoroughly on Safari, older Chrome versions
- **Memory usage**: Monitor Y.Doc memory footprint, implement cleanup

### Migration Risks  
- **Data corruption during transition**: Extensive backup/restore testing
- **User workflow disruption**: Feature flags enable safe rollback
- **Timeline dependencies**: Phase 1 provides immediate value, reducing pressure on later phases

### Rollback Strategy
- Feature flag `DATA_PROVIDER=json` reverts to current system
- LocalJSONProvider maintains full functionality parity
- Server migration can proceed independently

## 7) Success Metrics & Acceptance Criteria

### Immediate Success (Phase 1)
- ✅ Zero autosave race conditions during map loading
- ✅ All existing functionality preserved through provider interface
- ✅ No user-visible changes or regressions

### Core Migration Success (Phase 2)
- ✅ Offline-first: Edits persist via IndexedDB, page refresh works
- ✅ Data integrity: Export → delete → import is lossless
- ✅ Performance: No degradation in single-user scenarios

### Collaboration Success (Phase 4)
- ✅ Real-time: Two clients see changes within 100ms
- ✅ Conflict-free: Simultaneous edits merge automatically
- ✅ Resilient: Offline edits sync when connection restored

### Production Ready (Phase 6)
- ✅ Legacy code removed, codebase simplified
- ✅ Maps with 1000+ notes perform well
- ✅ Error handling and monitoring in place

## 8) Jira Epic Structure

### Epic 1: Foundation & Quick Wins (Phases 0-1)
**Stories**: 4 stories, ~2-4 days
- DataProvider interface design
- Y.Doc schema specification  
- LocalJSONProvider implementation
- UI component refactoring

### Epic 2: Yjs Core Implementation (Phase 2)
**Stories**: 4 stories, ~3-4 days  
- YjsProvider core functionality
- JSON conversion utilities
- DOM observer system
- Feature flag integration

### Epic 3: UI Architecture Overhaul (Phase 3)
**Stories**: 3 stories, ~2-3 days
- DOM rendering refactor
- Event system simplification
- Color system integration

### Epic 4: Real-time Collaboration (Phase 4)
**Stories**: 3 stories, ~2-3 days
- WebSocket integration
- Server connection UI
- Multi-device sync

### Epic 5: Production Polish (Phases 5-6) 
**Stories**: 5 stories, ~2-3 days
- Export/import updates
- Legacy code cleanup
- Performance optimization
- Production configuration

## 9) Dependencies & Coordination

### External Dependencies
- Server team completes y-websocket endpoint (for Phase 4)
- DevOps support for feature flag deployment
- QA support for multi-browser testing

### Internal Dependencies  
- Phase 1 must complete before UI team can fully adopt provider pattern
- Phase 2 testing requires stable provider interface from Phase 1
- Phase 4 requires server WebSocket completion

### Communication Points
- Daily standups during active development
- Weekly demo of collaboration functionality
- Architecture review before Phase 2 begins

## 10) Timeline Summary

**Total Effort**: 10-15 development days
**Timeline**: 2-3 weeks with 1 developer, 1-2 weeks with 2 developers
**Critical Path**: Phases 0→1→2 must be sequential, Phases 3-4 can partially overlap

**Milestone Schedule**:
- Week 1: Phases 0-1 complete → immediate autosave issues resolved
- Week 2: Phase 2 complete → full offline Yjs functionality  
- Week 3: Phases 3-6 complete → real-time collaboration live

This plan provides immediate value (fixing current issues) while building toward the future collaboration vision.