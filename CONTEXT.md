# MindMeld MM-281 Collaboration Implementation Context

## Current Status: Foundation Phase Critical Issues

**Branch**: `feat/MM-281-collaboration-implementation`
**Epic**: MM-281 Real-Time Collaboration Implementation
**Phase**: Phase 1 - Foundation Enhancement (Weeks 1-2)
**Date**: September 28, 2025

## Executive Summary

The MM-281 Real-Time Collaboration epic specifies a **"Hybrid Data Flow"** architecture where YjsProvider handles real-time sync while ServerClient manages sessions and metadata. However, the current implementation has critical foundation issues that must be resolved before Phase 2 real-time features can be implemented.

## Critical Issues Identified

### 1. Map Name Persistence Bug (**MM-294**)

**Problem**: Map names revert to "Untitled Map" after browser refresh when YjsProvider is active.

**Root Cause**: ServerClient metadata extraction logic doesn't integrate with YjsProvider's metadata handling.

**Code Location**: `src/js/services/serverClient.js:497-498`
```javascript
const mapName = parsedState.metadata?.title ||
  `MindMeld Map - ${new Date().toLocaleDateString()}`;
```

**Issue**: This relies on `exportToJSON()` including metadata, but when YjsProvider is active, metadata is stored in Yjs's `_yMeta` map instead of traditional `persistenceService.metadata`.

### 2. Auto-Loading Conflicts (**MM-295**)

**Problem**: Intermittent client state overwriting occurs when ServerClient auto-loading triggers during YjsProvider sessions.

**Root Cause**: Competing persistence mechanisms operating simultaneously:
- **ServerClient**: REST API with auto-save/auto-load
- **YjsProvider**: Real-time WebSocket synchronization
- **PersistenceService**: Local browser storage

**Code Location**: `src/js/services/serverClient.js:1104-1120`
```javascript
if (this.hasUnsavedChanges()) {
  // Skip auto-load
} else if (this.isCanvasEmpty() && this.areServicesReady()) {
  // Auto-load server data - CAN OVERWRITE YJS STATE
  this.loadState(document.getElementById('canvas'))
}
```

### 3. Missing Provider Coordination (**MM-296**)

**Problem**: YjsProvider and ServerClient operate independently without coordination.

**Root Cause**: The system wasn't designed for dual-provider scenarios where both systems operate concurrently.

**Architecture Issue**: No central coordination mechanism exists to manage provider states, transitions, and conflicts.

## Created Jira Tickets

### MM-294: Fix map name persistence bug in YjsProvider-ServerClient integration
- **Type**: Bug
- **Priority**: Critical foundation issue
- **Status**: To Do
- **Focus**: Metadata bridging between YjsProvider `_yMeta` and ServerClient extraction logic

### MM-295: Prevent auto-loading conflicts during YjsProvider-ServerClient transitions
- **Type**: Bug
- **Priority**: Critical foundation issue
- **Status**: To Do
- **Focus**: Race condition prevention and provider detection

### MM-296: Implement comprehensive YjsProvider-ServerClient coordination
- **Type**: Task
- **Priority**: Foundation for real-time collaboration
- **Status**: To Do
- **Focus**: Hybrid data flow architecture implementation

## Current Work in Progress

### Staged Changes Analysis
**File**: `src/js/services/serverClient.js`

**Changes Made**:
1. **Enhanced metadata passing**: Now passes complete `parsedState` including metadata to `updateExistingMap()`
2. **Metadata extraction**: Added logic to extract `mapName` from `parsedState.metadata?.title`
3. **Conditional name updates**: Only includes name in request body when metadata provides one

**Code Changes**:
```javascript
// OLD: Pass only state data
return await this.updateExistingMap(serverUri, stateData);

// NEW: Pass complete state including metadata
return await this.updateExistingMap(serverUri, parsedState);

// NEW: Extract map name from metadata
const mapName = parsedState.metadata?.title;
```

**Progress**: ~50% complete for MM-294 implementation

### Recent Commits Context
1. **b9f3e3b**: "fix: prevent data loss from aggressive auto-loading overwrites" → MM-295 scope
2. **e616dff**: "fix: add missing cache invalidation after auto-save map creation"
3. **80b3687**: "fix: implement complete server persistence for map names" → MM-294 scope
4. **dc6d900**: "fix: implement comprehensive metadata persistence for map names" → MM-296 foundation

## Architecture Analysis

### Current System Components

1. **YjsProvider** (`src/js/data/providers/YjsProvider.js`)
   - Real-time collaborative data provider using Yjs and WebSocket
   - Stores metadata in `_yMeta` Y.Map
   - Handles notes, connections, and metadata via Y.Doc

2. **ServerClient** (`src/js/services/serverClient.js`)
   - REST API interface for map management
   - Auto-save/auto-load functionality
   - Map persistence and session management

3. **PersistenceService** (`src/js/services/PersistenceService.js`)
   - Local browser storage management
   - Fallback persistence layer
   - Metadata handling via `persistenceService.metadata`

4. **DataProvider Abstraction** (`src/js/data/providers/DataProvider.js`)
   - Abstract interface for data providers
   - Origin tracking (USER vs SYSTEM)
   - Connection ID generation utilities

### Provider Coordination Gaps

**Missing Coordination Points**:
1. **Metadata synchronization** between YjsProvider `_yMeta` and ServerClient metadata extraction
2. **Provider detection logic** to determine active provider and prevent conflicts
3. **State transition management** for safe provider switching
4. **Event bus coordination** for cross-provider communication

## Implementation Strategy

### Phase 1 Foundation (Immediate - Week 1)

#### MM-294: Metadata Bridge Implementation
1. **Enhanced metadata extraction** in ServerClient:
   ```javascript
   const mapName =
     parsedState.metadata?.title ||           // Traditional path
     window.dataProvider?.getMeta?.()?.mapName || // YjsProvider path
     this.currentMapName ||                   // Current state
     `MindMeld Map - ${new Date().toLocaleDateString()}`;
   ```

2. **Bi-directional metadata sync**:
   ```javascript
   // In YjsProvider: Listen for server metadata updates
   eventBus.on('map.loaded', ({ metadata }) => {
     this.setMeta(metadata, { origin: ORIGIN.SYSTEM });
   });
   ```

#### MM-295: Conflict Prevention
1. **Provider detection logic**:
   ```javascript
   // Check if YjsProvider is active
   const isYjsActive = window.dataProvider instanceof YjsProvider;
   if (isYjsActive) {
     // Disable ServerClient auto-loading
     return;
   }
   ```

2. **Safe auto-loading conditions**:
   - Verify no active YjsProvider session
   - Check for unsaved changes
   - Validate canvas state before loading

### Phase 2 Coordination (Week 2)

#### MM-296: Comprehensive Coordination
1. **ProviderCoordinator service** (new file):
   ```javascript
   // src/js/services/ProviderCoordinator.js
   export class ProviderCoordinator {
     static currentProvider = null;
     static providerStack = [];

     static registerProvider(provider) { /* */ }
     static switchProvider(newProvider) { /* */ }
     static resolveConflicts(conflict) { /* */ }
   }
   ```

2. **Event-driven coordination**:
   - `provider.switched` - Provider change notification
   - `metadata.synced` - Cross-provider metadata sync
   - `state.conflict` - State conflict detection

## Success Criteria

### MM-294 Success Criteria
- [ ] Map names persist correctly after browser refresh in YjsProvider mode
- [ ] Map name changes sync between YjsProvider and ServerClient
- [ ] No regressions in traditional (non-collaborative) mode
- [ ] Unit tests cover both metadata paths

### MM-295 Success Criteria
- [ ] Auto-loading disabled when YjsProvider is active
- [ ] No state overwriting during provider transitions
- [ ] Graceful degradation when providers conflict
- [ ] Integration tests for transition scenarios

### MM-296 Success Criteria
- [ ] Seamless provider transitions without data loss
- [ ] Metadata consistency across all providers
- [ ] Clear user feedback during state transitions
- [ ] Comprehensive test coverage for all scenarios

## Files Requiring Changes

### Immediate Changes (MM-294, MM-295)
- `src/js/services/serverClient.js` - Metadata extraction and auto-loading logic
- `src/js/data/providers/YjsProvider.js` - Metadata event handling
- `src/js/data/dataStore.js` - exportToJSON metadata integration

### Future Changes (MM-296)
- `src/js/services/ProviderCoordinator.js` - New coordination service
- `src/js/core/bootstrap/DataBootstrap.js` - Provider initialization
- `src/js/core/eventBus.js` - Coordination events

## Testing Strategy

### Unit Tests Required
- Metadata extraction with different provider states
- Provider detection logic
- State transition validation
- Conflict resolution mechanisms

### Integration Tests Required
- Browser refresh behavior with YjsProvider active
- Provider switching scenarios
- Multi-tab coordination
- Network interruption recovery

## Risk Mitigation

### High Priority Risks
1. **Data Loss**: Implement comprehensive state validation before any provider switches
2. **Performance**: Ensure provider coordination doesn't impact real-time performance
3. **Complexity**: Keep coordination logic simple and well-documented

### Mitigation Strategies
- Incremental implementation with feature flags
- Comprehensive test coverage for all transition scenarios
- Clear rollback procedures for each change
- User feedback for any state conflicts

## Next Steps

1. **Commit current staged changes** - Foundation for MM-294
2. **Complete MM-294 implementation** - Metadata bridging
3. **Implement MM-295** - Auto-loading conflict prevention
4. **Build MM-296** - Comprehensive coordination layer
5. **Validate Phase 1 completion** before moving to Phase 2 real-time features

This foundation work is **critical** for the success of MM-281 Phase 2 and Phase 3 collaboration features. Without resolving these coordination issues, real-time collaboration will be unstable and cause data loss.