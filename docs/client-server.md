# MindMeld Real-Time Collaboration & Server Synchronization

## What is Real-Time Collaboration?

MindMeld features **full real-time collaboration** with WebSocket connectivity and conflict-free replicated data types (CRDTs). Multiple users can simultaneously edit the same mind map with changes syncing instantly across all connected clients. The application works completely offline - server connection is an optional enhancement that adds collaborative capabilities to your local mind mapping.

### Collaboration vs. Synchronization

- **Real-Time Collaboration**: Live editing with multiple users via WebSocket (Y.js CRDTs)
- **Server Synchronization**: Backup and cross-device access via REST API (legacy)

## How It Works

### Real-Time Collaboration Mode

When connected to a collaboration server, MindMeld uses **WebSocket connectivity with Y.js CRDTs** for instant synchronization:

- **Instant Updates**: Changes appear immediately on all connected clients
- **Conflict-Free Editing**: Multiple users can edit simultaneously without conflicts
- **Offline Resilience**: Local changes are preserved and sync when reconnecting
- **Zero Data Loss**: Y.js ensures mathematical consistency across all clients

### Legacy REST Synchronization

For non-collaborative servers, MindMeld falls back to REST-based synchronization with automatic background saving every 2 seconds. This legacy mode provides:
- Backup and cross-device access
- Manual save/load operations
- Single-user data persistence

### Manual Save and Load

You can also manually control server operations:

**Save to Server** - Immediately upload your current mind map to the server
**Load from Server** - Download the latest version from the server (replaces your current map)

These options are available in the application menu and are only enabled when you're connected to a server.

## Connecting to a Server

### Finding the Connection Settings

1. Click the menu button (⋯) in the top-right corner
2. Select "Connect to Server"
3. Enter your server URL in the connection dialog

### Server URL Requirements

**For Production/Public Servers:**
- Must use HTTPS (secure connection)
- Example: `https://your-mindmeld-server.com`
- SSL certificates are validated for security

**For Development/Local Servers:**
- Can use HTTP for localhost only
- Examples: `http://localhost:3001` or `http://127.0.0.1:8080`
- This simplifies local development and testing

**Important CORS Note for Local Development:**
If you encounter CORS errors when connecting to localhost servers, this is usually due to origin mismatches. MindMeld provides helpful error messages that will guide you to:
- Access your app at `http://localhost:8080` instead of `http://127.0.0.1:8080` (or vice versa)
- Configure your server to allow both localhost and 127.0.0.1 origins
- Use the suggested server URL that matches your current origin

### Connection Status

The application shows your connection status:
- **Collaborating** (🟢) - WebSocket connected, real-time sync active with other users
- **Connected** (🟢) - Server reachable, REST-based backup sync active
- **Connecting** (🟡) - Attempting to establish connection
- **Disconnected** (🔴) - No server connection, local-only mode
- **Error** (⚠️) - Connection failed with error details

## Data Safety

### Local-First Design

Your mind maps are always saved locally first. Server synchronization is additional backup, not a replacement for local storage. This means:
- The app works perfectly without any server connection
- Your data is never lost if the server becomes unavailable
- All features function normally in offline mode
- Server connection enhances rather than replaces local functionality

### What Gets Synchronized

When saving to a server, MindMeld uploads:
- All notes and their content
- All connections between notes
- Note positions and colors
- Canvas zoom level and position
- Map metadata and settings

### Data Loading Behavior

When loading from a server:
- Your current local map is completely replaced
- The server version becomes your active map
- Local changes not yet saved to server will be lost
- A confirmation dialog appears before replacing local data

## Privacy and Security

### Data Transmission
- All communication with external servers uses HTTPS encryption
- Data is transmitted directly between your browser and your chosen server
- No data passes through MindMeld's servers or third parties

### Local Development
- HTTP connections are only allowed for localhost addresses
- This maintains security while allowing easy local testing
- External servers always require secure HTTPS connections

### Data Control
- You control which server to connect to (if any)
- You control when data is uploaded or downloaded
- Server connection is completely optional
- All data remains in your control

## Error Handling

### When Things Go Wrong

**Server Becomes Unavailable**
- App continues working normally in local mode
- Changes are queued and will sync when connection returns
- Clear notification that you're working offline
- No data or functionality is lost

**Network Problems**
- Automatic retry with reasonable delays
- Clear error messages explaining the issue
- Fallback to local-only operation
- User guidance for resolving connection issues

**Data Conflicts**
- If the server has newer data than your local version
- Clear warnings before overwriting local changes  
- Option to save local changes before loading server data
- Future versions will include merge capabilities

## Common Use Cases

### Personal Backup
Connect to your own server or cloud hosting to ensure your mind maps are safely backed up and accessible from multiple devices.

### Team Sharing (Future)
Share server URLs with team members to enable collaborative mind mapping. Each person can save and load shared maps.

### Development and Testing
Use local HTTP servers during development to test server integration without SSL certificate complexity.

### Cross-Device Access
Access your mind maps from different computers by connecting to the same server and loading your saved maps.

## Troubleshooting

### Cannot Connect to Server
- Verify the server URL is correct and accessible
- Check that external servers use HTTPS
- Ensure localhost servers are running if using HTTP
- Look for specific error messages in the connection dialog

### Save/Load Operations Fail
- Check your connection status indicator  
- Verify the server is responding (try connecting again)
- Look at browser console for detailed error information
- Try manual save/load to test server connectivity

### Data Not Synchronizing
- Confirm you see "Connected" status
- Make a change and wait 2-3 seconds for auto-save
- Check for error notifications or status changes
- Try manual save to test server communication

## Real-Time Collaboration (Production Ready)

MindMeld includes **full real-time collaboration** powered by Y.js CRDTs and WebSocket connectivity:

### ✅ Available Features
- **Multi-User Editing**: Multiple users can simultaneously edit the same mind map
- **Instant Synchronization**: Changes appear immediately across all connected clients
- **Conflict-Free Operations**: Y.js CRDTs mathematically guarantee consistency
- **Offline Resilience**: Local changes preserved and synced when reconnecting
- **Graceful Fallback**: Automatic switching between collaborative and local modes
- **Content Validation**: Automatic enforcement of content size limits (200 characters)
- **Error Recovery**: Robust handling of network issues and connection failures

### 🛠 Technical Implementation
- **YjsProvider**: Production-ready implementation with WebSocket connectivity
- **ServerConnectionService**: Centralized collaboration infrastructure
- **DataProviderService**: Dynamic switching between local and collaborative modes
- **UI Integration**: Kebab menu server connection with real-time status indicators
- **Map Loading**: Collaborative map loading with graceful REST fallback

### 🎯 User Experience
- **Easy Setup**: Connect via kebab menu → "Connect to Server" → Enter server URL
- **Status Awareness**: Clear "Collaborating" vs "Connected" indicators
- **Seamless Operation**: No learning curve - mind mapping works exactly the same
- **Multi-Device**: Access and collaborate across phones, tablets, and desktops

### 🏗 Architecture Benefits
- **DataProvider Abstraction**: Clean separation between UI and storage backends
- **Backward Compatibility**: Existing workflows continue working unchanged
- **Server Flexibility**: Works with any Y.js WebSocket server implementation
- **Local-First**: Always maintains local state for offline operation

### 📊 Current Status
✅ **Real-Time Collaboration**: Full production implementation (MM-237, MM-249)
✅ **UI Integration**: Complete server connection and status system
✅ **Testing**: Comprehensive unit and E2E test coverage
🎯 **Ready for Use**: Connect to any Y.js WebSocket server and start collaborating

### 🧑‍💻 For Developers
The collaboration system is built on proven patterns:
- **Y.js CRDTs**: Industry-standard conflict-free data structures
- **WebSocket Provider**: Standard y-websocket implementation
- **Event-Driven Architecture**: Clean separation of concerns with zero circular dependencies
- **See [Developer Guide](developer-guide.md#collaboration-architecture)** for implementation details

---

*Real-time collaboration and server synchronization are optional features that enhance MindMeld with multi-user editing and cloud backup capabilities. The application works perfectly without any server connection.*