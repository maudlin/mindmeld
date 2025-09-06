# Client-Server Architecture Guide

## Overview

This document outlines the implementation of MindMeld's client-server architecture, providing a comprehensive guide for developers working on the client-server integration features.

**Epic:** [MM-85: Implement Client-Server Architecture](https://ridleyindustries.atlassian.net/browse/MM-85)  
**Phase:** 0 - Basic Client-Server Integration (Proof of Concept)  
**Status:** In Progress - Core API Client Complete

## Architecture Philosophy

The client-server implementation follows a **maps-first approach** with these core principles:

- **Single Source of Truth**: Server stores authoritative map data
- **Optimistic Concurrency**: ETags prevent conflicting updates
- **Graceful Degradation**: Falls back to localStorage when server unavailable
- **Security First**: RFC 7807 error handling with comprehensive validation
- **Test-Driven Development**: 100% test coverage for all API interactions

## Implementation Status

### ✅ Completed: MM-105 - Maps API Client

**Location**: `src/js/services/mapsApi.js`  
**Tests**: `tests/unit/services/mapsApi.test.js` (19/19 passing)  
**Test Coverage**: 100%

#### API Surface

```javascript
import { createMapsApi } from './src/js/services/mapsApi.js';

const api = createMapsApi({
  baseUrl: 'http://localhost:3001',
  fetchImpl: fetch, // Optional, defaults to globalThis.fetch
});

// Health check
const health = await api.health();
// Returns: { status: 'ok', timestamp: '...', uptime: 12345 }

// Create new map
const map = await api.createMap({
  name: 'My Mind Map',
  data: { notes: [], connections: [], zoomLevel: 1 },
});
// Returns: { id: 'map-123', name: '...', data: {...}, etag: '"v1-abc"' }

// Retrieve existing map
const existing = await api.getMap('map-123');
// Returns: { id: 'map-123', name: '...', data: {...}, etag: '"v1-abc"' }

// Update map with optimistic concurrency
const updated = await api.updateMap(
  'map-123',
  {
    name: 'Updated Mind Map',
    data: {
      notes: [
        /*...*/
      ],
      connections: [],
    },
  },
  '"v1-abc"',
); // ETag for concurrency control
// Returns: { id: 'map-123', name: '...', data: {...}, etag: '"v2-def"' }
```

#### Key Features

**🏷️ Automatic ETag Management**

- ETags stored internally per map ID
- If-Match headers sent automatically on updates
- 409 Conflict handling for concurrent modifications

**🛡️ Comprehensive Error Handling**

- **RFC 7807 Problem Details**: `application/problem+json` responses
- **Network Failures**: Graceful handling of connection issues
- **HTTP Errors**: 4xx/5xx status codes with meaningful messages
- **Malformed Responses**: JSON parsing errors handled safely

**🧪 Test-Driven Implementation**

- 19 comprehensive unit tests covering all scenarios
- Mock-based testing with complete error simulation
- 100% code coverage with edge case validation

#### Error Handling Examples

```javascript
try {
  await api.getMap('nonexistent');
} catch (error) {
  console.log(error.message); // "Map not found"
  console.log(error.status); // 404
  console.log(error.problem.detail); // "No map found with the given ID"
}

try {
  await api.updateMap('map-123', data, '"stale-etag"');
} catch (error) {
  if (error.status === 409) {
    // Handle optimistic concurrency conflict
    console.log('Map was modified by another client');
    // Typically: refetch, merge changes, retry
  }
}
```

#### Server API Specification

The client expects a REST API with these endpoints:

```http
GET  /health                 # Health check
POST /maps                   # Create map
GET  /maps/{id}             # Get map by ID
PUT  /maps/{id}             # Update map (requires If-Match)
```

**Request/Response Format:**

- **Content-Type**: `application/json`
- **Concurrency Control**: `If-Match: "etag"` (PUT only)
- **Error Responses**: `application/problem+json` (RFC 7807)
- **ETag Headers**: Required on POST/GET/PUT responses

## Pending Implementation

### 🔄 In Progress Tasks

**MM-104: Server Connection Configuration UI**

- Server URI input field in navigation
- Connection status indicator (connected/disconnected)
- Store server URI in localStorage
- Basic URI validation

**MM-106: Save/Load from Server Buttons**

- Extend Export/Import functionality with server options
- Auto-save to server (Google Docs style)
- "Load from Server" button with connection status
- Reuse existing dataStore methods

**MM-107: Server Operation Feedback**

- Success/error messages for server operations
- Loading indicators during operations
- Graceful fallback to localStorage
- Handle common HTTP errors and network failures

**MM-108: Integration Tests**

- Unit tests for server integration components
- Mock server responses for testing
- Test error handling scenarios
- Integrate with existing Jest test suite

## Integration Architecture

### Data Flow

```
User Action → Adapter → Behavior → EventBus → Services → mapsApi → Server
     ↑                                                      ↓
     ←─── UI Update ←─── EventBus ←─── Service Response ←───┘
```

### Storage Strategy

**Local First with Server Sync:**

1. **Immediate**: Save to localStorage (existing behavior)
2. **Debounced**: Auto-save to server (~500ms delay)
3. **On Load**: Check server for latest version
4. **Conflict Resolution**: ETag-based optimistic concurrency

### Integration Points

**Bootstrap Integration** (`src/js/core/bootstrap/DataBootstrap.js`):

```javascript
// Load from server on startup
const serverData = await mapsApi.getMap('latest');
if (serverData) {
  updateNotesAndConnections(serverData.data);
}
```

**Storage Integration** (`src/js/data/storageManager.js`):

```javascript
// Auto-save to server on state changes
eventBus.on('state.save', async () => {
  const state = getCurrentState();
  try {
    await mapsApi.updateMap(currentMapId, {
      name: 'Untitled Map',
      data: state,
    });
  } catch (error) {
    // Fallback: localStorage already saved
    console.warn('Server save failed, data kept locally');
  }
});
```

## Development Guidelines

### Testing Requirements

**All client-server code must include:**

- Unit tests with 100% coverage
- Mock-based server response testing
- Error scenario coverage (network, HTTP, parsing)
- Integration tests for UI components

**Test Patterns:**

```javascript
// Mock fetch for API testing
const mockFetch = jest.fn();
const api = createMapsApi({
  baseUrl: 'http://localhost:3001',
  fetchImpl: mockFetch,
});

// Test success scenarios
mockFetch.mockResolvedValue({
  ok: true,
  headers: new Map([['ETag', '"v1-abc"']]),
  json: jest.fn().mockResolvedValue({ id: 'map-123' }),
});

// Test error scenarios
mockFetch.mockRejectedValue(new Error('Network error'));
```

### Error Handling Standards

**All server operations must:**

1. **Handle network failures** gracefully
2. **Provide user feedback** for all states (loading, success, error)
3. **Fallback to localStorage** when server unavailable
4. **Log errors** for debugging (console.warn/error)
5. **Never block the UI** with server operations

### Code Organization

**New files follow existing patterns:**

- `src/js/services/` - API clients and business logic
- `src/js/features/` - UI components for server features
- `tests/unit/services/` - Service layer tests
- `tests/unit/features/` - Feature component tests

## Security Considerations

### Input Validation

- All user input passes through existing defang pipeline
- Server responses validated before processing
- Maximum payload sizes enforced (50MB default)

### Error Information Disclosure

- Server errors sanitized before displaying to users
- Detailed error info logged to console for debugging
- No sensitive information exposed in client logs

### Authentication (Future)

- Current implementation: No authentication (PoC only)
- Future: Token-based authentication with secure storage
- CORS properly configured for browser clients

## Configuration

### Environment Variables

```javascript
// Development
const baseUrl = 'http://localhost:3001';

// Production
const baseUrl = process.env.MINDMELD_SERVER_URL || 'https://api.mind-meld.co';
```

### Server Requirements

- **CORS**: Properly configured for browser clients
- **JSON Size Limit**: 50MB maximum (configurable)
- **ETag Support**: Required for optimistic concurrency
- **RFC 7807**: Error responses in `application/problem+json` format

## Performance Considerations

### Client Optimizations

- **Debounced Auto-save**: Prevents excessive server requests
- **ETag Caching**: Reduces unnecessary data transfer
- **Compression**: JSON payloads compressed when possible
- **Offline Mode**: Graceful handling of network unavailability

### Server Integration

- **Connection Pooling**: Reuse HTTP connections when possible
- **Request Deduplication**: Prevent duplicate concurrent requests
- **Background Sync**: Non-blocking server operations
- **Progressive Enhancement**: App works offline-first

## Troubleshooting

### Common Issues

**Server Connection Failed**

- Check network connectivity
- Verify server URL configuration
- Check CORS settings on server
- Review browser console for detailed errors

**ETag Conflicts (409 Errors)**

- Normal behavior for concurrent edits
- Client should refetch latest data
- Implement merge strategies for concurrent changes
- Notify user of conflict resolution

**JSON Parsing Errors**

- Check server response content-type
- Verify JSON payload structure
- Review network tab for malformed responses
- Check for truncated responses

### Debug Logging

Enable detailed logging for development:

```javascript
// Add to mapsApi implementation for debugging
console.log('API Request:', method, url, options);
console.log('API Response:', response.status, await response.clone().text());
```

## Next Steps

1. **Complete UI Integration** (MM-104, MM-106)
2. **Add User Feedback Systems** (MM-107)
3. **Comprehensive Integration Testing** (MM-108)
4. **Performance Optimization**
5. **Authentication Integration** (Future Phase)
6. **Multi-user Collaboration** (Future Phase)

---

**Last Updated**: September 5, 2025  
**Document Version**: 1.0  
**Contributors**: Claude Code Implementation Team
