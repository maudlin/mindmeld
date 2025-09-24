# Data Providers

## Context

MindMeld uses a **DataProvider pattern** to abstract data persistence and enable different storage backends. This architecture supports both local storage and real-time collaboration while maintaining a consistent interface.

**Location:** `src/js/data/providers/`
**Service:** `src/js/services/DataProviderService.js`

## Available Providers

### LocalJSONProvider (Production)

**File:** `src/js/data/providers/LocalJSONProvider.js`

Local browser storage with enterprise-grade features:

- ✅ Autosave with race condition prevention
- ✅ Content size limit enforcement (200 chars per note)
- ✅ Hydration state management (prevents autosave during imports)
- ✅ Origin tracking (USER vs SYSTEM operations)
- ✅ Comprehensive error handling
- ✅ Browser compatibility across all major browsers

**Use Cases:**
- Single-user mind mapping
- Offline-first functionality
- Development and testing
- Privacy-sensitive scenarios

### YjsProvider (Foundation Ready)

**File:** `src/js/data/providers/YjsProvider.js`

Real-time collaboration foundation:

- ✅ Yjs CRDT integration for conflict-free data structures
- ✅ WebSocket support for real-time synchronization
- ✅ Offline mode for testing and development
- ✅ Content size limit enforcement
- ✅ Full DataProvider contract compliance
- ✅ Automatic conflict resolution

**Use Cases:**
- Real-time collaboration
- Multi-user editing
- Distributed team workflows
- Conflict-free data synchronization

## DataProvider Contract

**File:** `src/js/data/providers/DataProvider.js`

All providers implement the same interface for consistent usage:

```javascript
class DataProvider {
  // Initialization
  init(mapId, options) { /* Setup and return cleanup function */ }
  destroy() { /* Cleanup resources */ }
  subscribe(onChange) { /* Subscribe to changes, return unsubscribe */ }

  // CRUD Operations
  upsertNote(note, {origin: 'user'|'system'}) { /* Create/update note */ }
  deleteNote(id, {origin: 'user'|'system'}) { /* Delete note */ }
  upsertConnection(conn, opts) { /* Create/update connection */ }
  deleteConnection(id, opts) { /* Delete connection */ }

  // Data Operations
  getSnapshot() { /* Get current state */ }
  importJSON(json) { /* Import data with validation */ }
  exportJSON() { /* Export current state */ }

  // Meta Operations
  setMeta(meta, opts) { /* Update metadata */ }
  getMeta() { /* Get metadata */ }
}
```

### Origin Constants

```javascript
import { ORIGIN } from './DataProvider.js';

// Use these constants for all provider operations
ORIGIN.USER    // User-initiated changes (clicks, typing)
ORIGIN.SYSTEM  // System-initiated changes (imports, sync)
```

## Using DataProviders

### Basic Usage

Access through the singleton DataProviderService:

```javascript
import { DataProviderService } from './services/DataProviderService.js';

const service = DataProviderService.getInstance();
service.init('map-id', { onReady: () => console.log('Ready!') });

// Subscribe to changes
const unsubscribe = service.subscribe((change) => {
  console.log('Data changed:', change.type, change.origin);
});

// Perform operations
service.upsertNote({
  id: 'note-1',
  content: 'Hello World',
  pos: [100, 200]
}, { origin: ORIGIN.USER });
```

### Advanced Configuration

```javascript
// LocalJSON Provider with custom options
service.init('map-id', {
  provider: 'local',
  autosave: true,
  contentLimit: 200,
  onReady: () => console.log('Local storage ready'),
  onError: (error) => console.error('Storage error:', error)
});

// Yjs Provider with WebSocket
service.init('map-id', {
  provider: 'yjs',
  serverUrl: 'wss://collaboration-server.com',
  room: 'mindmap-session-123',
  onReady: () => console.log('Collaboration ready'),
  onSync: (synced) => console.log('Sync status:', synced)
});
```

## Data Flow Architecture

### Write Operations

```
User Action → Behavior → DataProvider → Storage → Change Event → UI Update
```

**Example: Creating a Note**
1. User double-clicks canvas → `CanvasBehavior.handleCanvasDoubleClick()`
2. Behavior creates note data → calls `dataProvider.upsertNote(noteData, {origin: 'user'})`
3. Provider validates and stores → emits change event
4. UI subscribes to changes → updates DOM with new note

### Read Operations

```
Component Request → DataProvider → Storage → Data Return
```

**Example: Loading Saved Data**
1. App initialization → `dataProvider.getSnapshot()`
2. Provider retrieves from storage → returns current state
3. Bootstrap uses data → restores UI state

## Origin Tracking

### Why Origin Matters

Origin tracking prevents infinite loops and enables intelligent behavior:

- **USER** changes trigger autosave and UI updates
- **SYSTEM** changes (imports, sync) don't trigger autosave
- Collaboration providers can differentiate local vs remote changes

### Usage Patterns

```javascript
// User typing in note
dataProvider.upsertNote(noteData, { origin: ORIGIN.USER });

// Importing file
dataProvider.importJSON(jsonData); // Automatically uses ORIGIN.SYSTEM

// Collaboration sync
dataProvider.upsertNote(remoteNoteData, { origin: ORIGIN.SYSTEM });
```

## Error Handling

### Provider Errors

All providers implement consistent error handling:

```javascript
service.subscribe((change) => {
  if (change.type === 'error') {
    console.error('Provider error:', change.payload);
    // Implement fallback behavior
  }
});
```

### Common Error Scenarios

1. **Storage Quota Exceeded**: LocalJSONProvider switches to memory-only mode
2. **Network Issues**: YjsProvider maintains offline queue
3. **Content Size Limits**: Both providers reject oversized content
4. **Validation Failures**: Invalid data structures are rejected

## Migration Status

### Current State (2025)

🎯 **Production (LocalJSONProvider)**: Full feature set, battle-tested
🔄 **Foundation (YjsProvider)**: Core functionality complete, integration in progress
📋 **Migration**: Legacy `storageManager.js` being replaced (see [CONTEXT.md](../../CONTEXT.md) MM-266)

### Legacy Migration

**From:** Mixed `storageManager.js` + direct localStorage calls
**To:** Unified DataProvider pattern
**Status:** Active migration (MM-266, MM-268, MM-269)

```javascript
// OLD: Direct storage access
const data = JSON.parse(localStorage.getItem('mindmap-data'));

// NEW: DataProvider pattern
const data = dataProvider.getSnapshot();
```

## Testing DataProviders

### Contract Testing

**File:** `tests/unit/providers/DataProvider.contract.test.js`

All providers must pass the same contract tests:

```javascript
// Example contract test
test('upsertNote creates and updates notes correctly', async () => {
  const provider = new LocalJSONProvider(); // or YjsProvider
  await provider.init('test-map');

  // Test create
  await provider.upsertNote({ id: '1', content: 'Test' });
  const snapshot = await provider.getSnapshot();
  expect(snapshot.notes).toHaveLength(1);

  // Test update
  await provider.upsertNote({ id: '1', content: 'Updated' });
  const updated = await provider.getSnapshot();
  expect(updated.notes[0].content).toBe('Updated');
});
```

### Provider-Specific Tests

**LocalJSONProvider:** Storage limits, autosave, browser compatibility
**YjsProvider:** Conflict resolution, real-time sync, offline handling

## Performance Considerations

### LocalJSONProvider

- **Autosave debouncing**: 500ms delay to prevent excessive writes
- **Content limits**: 200 char per note prevents localStorage bloat
- **JSON serialization**: Efficient for typical mind map sizes (<1MB)

### YjsProvider

- **Memory efficiency**: Yjs uses binary encoding for network transport
- **Conflict resolution**: CRDT operations are O(log n) complexity
- **Network optimization**: Delta sync reduces bandwidth usage

## Best Practices

### Provider Selection

```javascript
// Development: Local provider for fast iteration
const provider = 'local';

// Production: Choose based on requirements
const provider = needsCollaboration ? 'yjs' : 'local';
```

### Error Recovery

```javascript
// Implement graceful degradation
service.subscribe((change) => {
  if (change.type === 'error') {
    // Fall back to memory-only storage
    console.warn('Storage failed, switching to memory mode');
    // Implement fallback logic
  }
});
```

### Content Management

```javascript
// Respect size limits
const MAX_CONTENT_LENGTH = 200;

function sanitizeNoteContent(content) {
  return content.length > MAX_CONTENT_LENGTH
    ? content.substring(0, MAX_CONTENT_LENGTH) + '...'
    : content;
}
```

## Related Documentation

- [Testing Patterns](../development/testing-patterns.md) - Testing provider implementations