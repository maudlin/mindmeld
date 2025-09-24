# MindMeld Server Synchronization

## What is Server Synchronization?

MindMeld can connect to a remote server to automatically save and load your mind maps. This provides data backup, persistence across devices, and enables future collaboration features. The application works completely offline - server connection is an optional enhancement that adds cloud storage capabilities to your local mind mapping.

## How It Works

### Automatic Background Saving

When connected to a server, MindMeld automatically saves your work in the background. Every time you:
- Create, edit, or delete a note
- Add or modify connections between notes  
- Change note colors
- Adjust the canvas view

Your changes are automatically saved to the server after a brief 2-second delay. This prevents excessive server requests while ensuring your work is always backed up. The app continues to work normally even if the server becomes unavailable.

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
- **Connected** (🟢) - Server is reachable, auto-save is active
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

## Real-time Collaboration Foundation

MindMeld now includes **Yjs-based DataProvider infrastructure** that enables future real-time collaboration features:

### Technical Foundation (Available Now)
- **YjsProvider**: Complete implementation with conflict-free replicated data types (CRDTs)
- **WebSocket support**: Ready for real-time synchronization via Yjs WebSocket provider
- **Offline mode**: Full functionality when disconnected from collaboration server
- **Content validation**: Automatic content size limit enforcement (200 characters)
- **Error resilience**: Robust handling of network issues and malformed data

### Architecture Benefits
- **Conflict-free collaboration**: Yjs CRDTs ensure data consistency across multiple users
- **Real-time updates**: Changes sync instantly between connected clients
- **Seamless transitions**: Switch between online and offline modes transparently
- **DataProvider abstraction**: Clean separation allows switching between storage backends

### Current Status
🔧 **Foundation Complete**: YjsProvider implementation with comprehensive test coverage
🚧 **Integration Pending**: UI observers and real-time features (MM-246)
📋 **Future**: Full multi-user collaboration interface

### For Developers
The DataProvider pattern ensures backward compatibility:
- Current LocalJSONProvider handles local storage
- Future YjsProvider enables real-time collaboration
- Applications transparently use either provider
- See [Data Providers](architecture/data-providers.md) for implementation details

---

*Server synchronization is an optional feature that enhances MindMeld with cloud backup and future collaboration capabilities. The application works perfectly without any server connection.*