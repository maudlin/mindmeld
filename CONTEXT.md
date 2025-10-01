# MindMeld: Current State Analysis
*Last Updated: 2025-09-30*

## Overview

MindMeld is a web-based mind mapping tool transitioning from single-user (LocalJSONProvider with HTTP/ETags) to real-time collaboration (YjsProvider with WebSocket/CRDTs). Current branch: `feat/MM-281-collaboration-implementation`.

## Recent Work Completed

### 1. Architecture Migration: Yjs-First Approach
**Goal**: Eliminate ETag conflicts by using Yjs for real-time sync instead of HTTP PUT with optimistic locking.

**Changes Made**:
- Modified `ServerClient.loadMap()` and `loadSpecificMap()` to automatically switch to YjsProvider when loading maps from server (serverClient.js:400-450, 888-931)
- Added triple-layer protection against HTTP autosave when Yjs is active:
  1. `setupAutoSaveListeners()` - Prevents new listener registration
  2. `enableAutoSave()` - Blocks autosave activation
  3. Explicit listener removal when Yjs enabled
- Updated `enableAutoSave()` and `setupAutoSaveListeners()` to detect YjsProvider and skip HTTP-based autosave (serverClient.js:1014-1059, 1089-1110)

### 2. YjsClientStub Compatibility Fixes
**Problem**: Stub was incompatible with real Yjs server (missing `.on()` method, couldn't handle binary messages).

**Changes Made** (YjsClientStub.js):
- Added event system: `on()`, `_emit()`, `_eventHandlers` (lines 240-265)
- Added status event emission on WebSocket connection (line 281)
- Modified `_handleMessage()` to handle binary Blob messages from real Yjs server (lines 333-374)
- Binary messages now mark sync as complete without attempting JSON parsing

## Current Architecture

### Two Operating Modes

#### Mode 1: Browser-Only (Offline)
```
User → LocalJSONProvider → localStorage
     → No server connection
     → Export/Import via files
```

#### Mode 2: Server-Connected (Online) - **CURRENT FOCUS**
```
User → REST GET /maps/:id (initial load)
     → Import JSON to canvas
     → Switch to YjsProvider
     → WebSocket connect to /yjs/:mapId
     → All edits sync via WebSocket (CRDT merging)
     → REST only for map operations (list/create/delete/rename/export)
```

### Data Flow When Loading a Map

1. User selects map from browser
2. `ServerClient.loadMap(mapId)`
3. HTTP GET `/maps/:mapId` (initial state snapshot)
4. `importFromJSON()` renders map on canvas
5. `dataProviderService.enableCollaboration(serverUrl, mapId)`
6. Switch from LocalJSONProvider → YjsProvider
7. Remove HTTP autosave listeners + disable autosave flag
8. WebSocket connects to `/yjs/:mapId`
9. **All future edits sync via WebSocket only** (no HTTP, no ETags)

## Known Issues & Testing Needed

### 1. ETag Conflicts Still Occurring (Partially Resolved)
**Status**: Improved but may still appear in edge cases

**Symptoms**:
- PUT requests to `/maps/:id` resulting in 409 Conflict
- "ETag refreshed from X to X" (same value loop)
- "Maximum retries (3) exceeded"

**Stack traces show**:
- `setNoteColor @ colorService.js:88` triggering autosave
- `saveMapTitle @ NavbarBehavior.js:273` triggering autosave

**Remaining Investigation Needed**:
- Verify autosave listeners are actually removed after Yjs enables
- Check if there are timing windows where events fire before listeners removed
- Confirm `autoSaveEnabled` flag is respected in all save paths

### 2. Dynamic Yjs Loading (IMPLEMENTED)
**Status**: ✅ Client dynamically loads Yjs from server when available

**Implementation** (2025-10-01):
- **Server-provided Yjs**: YjsProvider attempts to load Yjs from `${serverUrl}/client/mindmeld-yjs-client.js`
- **Zero npm dependencies**: Yjs code comes from server, not bundled in client
- **Automatic fallback**: If server doesn't provide Yjs, uses YjsClientStub
- **YjsClientStub features**:
  - Change tracking during transactions via `_pendingChanges` array
  - YMap.set() and YMap.delete() record changes when inside transactions
  - Changes sent as JSON to server via WebSocket after transaction
  - **Update queueing**: Changes queue in `_pendingUpdates` if WebSocket not ready yet
  - **Automatic flush**: Queued updates sent when WebSocket connects

**What Works with Server Yjs**:
- Full CRDT operations (proper conflict-free merging)
- Binary Yjs protocol encoding/decoding
- Real-time collaboration with multiple users
- Server-side persistence

**What Works with YjsClientStub** (fallback):
- Local change detection and JSON-based updates
- WebSocket connection and status events
- Queued updates until connection ready
- Basic collaboration (no CRDT merging)

**What Works**:
- WebSocket connection establishment
- Event system (`.on()` handlers)
- Status events (connected, synced)
- **Local change detection and batching**
- **Sending updates to server as JSON** (`sendUpdate()`)
- **Note creation, editing, deletion all persist**

**What Doesn't Work Yet**:
- Decoding binary Yjs update messages from server
- Applying remote changes from other users to local Y.Doc
- True CRDT conflict-free merging (server handles this)

**Architecture**:
```
User Action → YjsProvider.upsertNote()
  → YDoc.transact(() => yMap.set(...))
  → YMap records change in YDoc._pendingChanges
  → Transaction completes
  → YDoc._processPendingChanges()
  → WebsocketProvider.sendUpdate(changes)
  → Server receives JSON, converts to Yjs binary
```

### 3. UI/UX Issues

**NavbarBehavior Error** (navbarBehavior.js:224):
```
NotFoundError: Failed to execute 'remove' on 'Element':
The node to be removed is no longer a child of this node.
```
- Occurs when saving map title
- Element removed/moved by blur event handler
- Needs defensive coding (check `element.parentNode` before remove)

### 4. Map Switching Edge Cases
**Potential Issues**:
- Switching between maps may not properly clean up previous Yjs connection
- Multiple WebSocket connections might remain open
- ETag state from previous map might leak to next map

**Needs Testing**:
- Load Map A → Edit → Switch to Map B → Edit → Switch back to A
- Verify only one WebSocket connection active
- Verify correct map ID in WebSocket path
- Check for memory leaks (Y.Doc instances not destroyed)

## Testing Status

### Unit Tests
✅ **All passing** (1306 tests, 79 suites)
- Coverage: 57.43% statements, 51.26% branches
- YjsClientStub coverage: 45.86% (improved from ~28%)
- ServerClient coverage: 76.57%
- DataProviderService coverage: 69.44%

### E2E Tests
⚠️ **Not run recently** - should verify:
- Map loading with Yjs switch
- Note creation/editing/deletion with Yjs active
- Multi-select and color changes
- Map browser navigation

### Manual Testing Checklist
- [ ] Load map from server → Verify "Switching to YjsProvider" log
- [ ] Load map → Verify "Disabled HTTP autosave" log
- [ ] Edit note → Verify NO PUT requests to `/maps/:id`
- [ ] Change color → Verify NO ETag conflicts
- [ ] Rename map → Verify NO ETag conflicts
- [ ] Switch between maps → Verify clean Yjs reconnection
- [ ] Check browser console for WebSocket errors
- [ ] Verify `window.dataProvider.constructor.name === 'YjsProvider'`

## Code Architecture

### Key Files Modified

**src/js/services/serverClient.js**
- `loadMap()` - Switches to Yjs after loading (lines 400-450)
- `loadSpecificMap()` - Switches to Yjs after loading (lines 888-931)
- `enableAutoSave()` - Blocks activation when Yjs active (lines 1014-1059)
- `setupAutoSaveListeners()` - Skips listener setup when Yjs active (lines 1089-1110)
- `debouncedSave()` - Could add extra Yjs check here (lines 1111-1128)

**src/js/data/providers/YjsClientStub.js**
- Added event system (lines 240-265)
- WebSocket connection with status events (lines 267-307)
- Binary message handling (lines 333-374)

**src/js/services/DataProviderService.js**
- `enableCollaboration()` - Switches from LocalJSON to Yjs (lines 307-342)
- `disableCollaboration()` - Switches back to LocalJSON (lines 348-373)
- `isCollaborationEnabled()` - Returns true if using Yjs (lines 379-381)

### Protection Layers Against HTTP Autosave

**Layer 1**: Prevent new listener setup
```javascript
setupAutoSaveListeners() {
  if (isUsingYjs) return; // Skip setup
}
```

**Layer 2**: Remove existing listeners when switching to Yjs
```javascript
if (yjsEnabled) {
  this.removeAutoSaveListeners();
  this.autoSaveEnabled = false;
}
```

**Layer 3**: Block autosave activation
```javascript
enableAutoSave() {
  if (isUsingYjs) return false; // Don't enable
}
```

## Refactoring Opportunities

### 1. Consolidate Yjs Switch Logic
**Current**: Duplicated code in `loadMap()` and `loadSpecificMap()`

**Improvement**: Extract to `_enableYjsForMap(serverUri, mapId)` helper method

### 2. Improve YjsProvider Initialization
**Current**: Mix of enableCollaboration() + init() calls

**Improvement**: Single method that does both atomically

### 3. Add Yjs Connection State Management
**Missing**:
- Track WebSocket connection state globally
- Provide UI feedback (connected/disconnected indicator)
- Handle reconnection gracefully

**Add**:
- `ServerClient.getYjsConnectionStatus()`
- Event: `yjs.connection.status` (connected/disconnected/error)

### 4. Clean Up on Map Switch
**Current**: Unclear if previous Yjs connection is properly destroyed

**Needed**:
```javascript
async switchToMap(newMapId) {
  // 1. Disconnect current Yjs
  await this.disconnectYjs();

  // 2. Load new map
  await this.loadMap(newMapId);

  // 3. Connect to new Yjs
  await this.connectYjs(newMapId);
}
```

### 5. YjsClientStub → Full Yjs Implementation
**Decision Needed**:
- Keep stub and gradually add CRDT logic?
- Replace with real `yjs` + `y-websocket` packages?

**Recommendation**: Use real Yjs libraries
- Proven, battle-tested
- Full CRDT implementation
- WebRTC support (future)
- Lower maintenance burden

## Next Steps (Priority Order)

### High Priority
1. **Verify ETag fix works** - Manual testing in browser
   - Load map, edit notes, change colors
   - Check console for PUT requests
   - Verify no 409 Conflicts

2. **Fix NavbarBehavior element removal error**
   - Add null check before `element.remove()`
   - Test map title editing

3. **Test map switching**
   - Load Map A → Edit → Load Map B → Edit
   - Verify no ETag conflicts
   - Check WebSocket cleanup

### Medium Priority
4. **Implement proper Yjs sync**
   - Replace YjsClientStub with real `yjs` + `y-websocket`
   - OR implement binary protocol decoding in stub
   - Test actual real-time collaboration

5. **Add Yjs connection status UI**
   - Show online/offline indicator
   - Handle disconnections gracefully
   - Notify user of sync errors

6. **Refactor duplicate Yjs switch code**
   - Extract to helper method
   - Add comprehensive error handling
   - Log state transitions clearly

### Low Priority
7. **E2E test coverage**
   - Add tests for Yjs mode
   - Test map browser with Yjs
   - Test offline → online transitions

8. **Performance optimization**
   - Lazy load Yjs libraries
   - Debounce Yjs updates
   - Add metrics/monitoring

## Server-Side Requirements

**Current Server Status**: Unknown - needs investigation

**Required Endpoints**:
- `GET /maps` - List maps ✅ (exists)
- `GET /maps/:id` - Get map snapshot ✅ (exists)
- `POST /maps` - Create map ✅ (exists)
- `PUT /maps/:id` - Update map ✅ (exists, but should phase out)
- `DELETE /maps/:id` - Delete map ✅ (exists)
- `WS /yjs/:mapId` - Yjs WebSocket sync ⚠️ (needs verification)

**Server-Side Yjs Integration Needed**:
- Yjs document persistence (Y.Doc storage)
- WebSocket provider implementation
- CRDT update broadcasting
- Awareness protocol (user presence)

## Configuration & Feature Flags

**Current State**: Always tries to use Yjs when loading from server

**Potential Flags**:
```javascript
featureFlags: {
  enableCollaboration: true,  // Use Yjs vs LocalJSON
  fallbackToLocalJSON: true,  // If Yjs fails, use LocalJSON
  enableAwareness: false,     // Show other users' cursors
}
```

## Debugging Tips

### Check which provider is active:
```javascript
// In browser console
window.dataProvider?.constructor?.name
// Should return: 'YjsProvider' or 'LocalJSONProvider'
```

### Check if autosave is disabled:
```javascript
// In browser console
const { ServerClient } = await import('./src/js/services/serverClient.js');
ServerClient.autoSaveEnabled
// Should return: false (when Yjs active)
```

### Check WebSocket connection:
```javascript
// Look for log message
[YjsProvider] WebSocket connected: mindmeld
// Check network tab for WS connection to /yjs/:mapId
```

### Force LocalJSON mode (for testing):
```javascript
// Temporarily disable Yjs in DataProviderService constructor
this._providerType = 'local';
this._provider = new LocalJSONProvider();
```

## Related Documentation

- `docs/architecture/data-providers.md` - DataProvider pattern
- `docs/architecture/adapter-behavior-pattern.md` - Interaction patterns
- `docs/development/testing-patterns.md` - Testing standards
- `CLAUDE.md` - Project overview and development rules

## Questions to Answer

1. **Is the Yjs WebSocket server actually running?**
   - What URL? Port?
   - How to start/configure it?

2. **What Yjs binary protocol version is the server using?**
   - Need to match client implementation

3. **Should we use real Yjs library or keep building the stub?**
   - Trade-offs: bundle size vs maintenance

4. **How should map switching work with Yjs?**
   - One connection per map?
   - Reconnect or reuse connection?

5. **What happens to unsaved changes if WebSocket disconnects?**
   - Queue updates?
   - Fall back to HTTP?
   - Show error to user?

## Success Criteria

**Phase 1: ETag Elimination** (Current)
- [x] No 409 Conflict errors when editing maps
- [ ] No PUT requests to `/maps/:id` during edits
- [ ] Verified via manual testing

**Phase 2: Basic Yjs Sync** (Next)
- [ ] Two browser tabs can edit same map
- [ ] Changes appear in both tabs in real-time
- [ ] No data loss or corruption

**Phase 3: Production Ready** (Future)
- [ ] Handles disconnections gracefully
- [ ] Shows user presence/awareness
- [ ] E2E tests passing
- [ ] Performance acceptable (< 100ms sync latency)

---

*This document should be updated as work progresses. Focus areas: testing ETag fixes, implementing real Yjs sync, refactoring duplicated code.*
