# MindMeld

MindMeld is a web-based mind mapping tool that allows users to create, organize, and connect notes in a flexible, freeform manner. This application is designed to help users visually map out their ideas and relationships between them.

A demo of the latest stable version is available to try at: https://mind-meld.co/

## Features

- **Add Notes**: Double-click anywhere on the canvas to create a new note.
- **Move Notes**: Click and drag notes to reposition them on the canvas.
- **Edit Notes**: Click on a note to enter edit mode and save changes.
- **Delete Notes**: Delete notes by pressing the delete key.
- **Multiple Select and Group Move**: Select multiple notes using a selection box and move them as a group.
- **Group Delete**: Delete multiple selected notes by pressing the delete key.
- **Dynamic Connectors**: Connections are drawn from the closest proximity points on the notes, ensuring clean and optimal connections.
- **Ghost Connectors**: Four ghost connecting points appear at the center of each side of a note when hovering, allowing intuitive connection creation.
- **Directional Arrows**: Connections feature directional arrows to indicate the flow of connections.
- **Real-Time Updates**: Connections dynamically update as notes are moved around the canvas, maintaining the shortest path between connected notes.
- **Zoom**: The application starts zoomed in at 5x, and users can zoom out with the mouse scroll wheel.
- **Pan**: Users can pan the canvas in the wider view by clicking and holding the right mouse button.
- **Style Notes and Canvas**: Notes have a pleasing background color, border, and text style. The canvas has a neutral background with styled hover and focus states for notes.
- **Debounce Mechanism**: Prevents accidental multiple note creations by handling double-click events effectively.
- **Data Store and Export**: Modular data store handler that manages the state of the notes and allows exporting the current state to JSON format. A button is provided to copy the JSON data to the clipboard.
- **Help Text**: Provides users with instructions on how to use key functionalities.
- **Modular Canvas System**: Support for different canvas types with a modular approach, including Standard Canvas and Hero's Journey.
- **Canvas Switching**: Seamlessly switch between different canvas types using a dropdown menu.
- **Zoom and Pan Enhancements**: Improved zoom level handling and canvas positioning when switching canvases.
- **Event Handling Enhancements**: Idempotent setup of event listeners for proper reattachment during canvas switching.

## Recent Enhancements

### Canvas Module System Refactoring

- Implemented a more modular approach for handling different canvas types (e.g., Standard Canvas, Hero's Journey).
- Updated config.js to include definitions for different canvas types and their respective file paths.

### Canvas Manager Improvements

- Modified canvasManager.js to handle dynamic loading and registration of canvas modules.
- Implemented error handling and fallback mechanisms for canvas module loading and rendering.

### Event Handling Enhancements

- Updated setupCanvasEvents in event.js to be idempotent, allowing for proper reattachment of event listeners when switching canvases.
- Modified initializeConnectionDrawing in connections.js to properly handle SVG container creation and event listener attachment across canvas switches.

### Zoom and Pan Functionality

- Refactored zoomManager.js to improve zoom level handling and canvas positioning when switching canvases.

### Canvas Switching Logic

- Updated the canvas switching process in app.js (within populateCanvasStyleDropdown) to properly handle module changing, zoom resetting, and event reattachment.

### Asynchronous Loading Handling

- Introduced asynchronous handling in canvas initialization and switching to ensure proper rendering and positioning.

### Configuration Centralization

- Utilized config.js more effectively for storing canvas-related configurations, improving maintainability and flexibility.

## Installation

### Prerequisites

- Docker
- VSCode with Remote - Containers extension

### Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/mindmeld.git
   cd mindmeld
   ```

2. **Open in DevContainer**:
   - Open VSCode.
   - Open the command palette (`Ctrl + Shift + P`).
   - Select "Remote-Containers: Open Folder in Container..." and choose the `mindmeld` folder.

### Running the Application

1. **Start Development Server**:

   - Open the command palette (`Ctrl + Shift + P`).
   - Type "Remote-Containers: Rebuild Container" and select the option to rebuild without cache.
   - Run the local development server using "npm start"

2. **Access the Application**:
   - Open your browser and navigate to `http://localhost:8080`.

## Usage

1. **Add Notes**:

   - Double-click anywhere on the canvas to create a new note.

2. **Move Notes**:

   - Click and drag notes to reposition them on the canvas.

3. **Edit Notes**:

   - Click on a note to enter edit mode and save changes.

4. **Delete Notes**:

   - Delete notes by interacting with the delete icon in the hover menu

5. **Draw Connections**:

   - Hover over a note to reveal ghost connecting points.
   - Click and drag from a ghost connecting point to another note to create a connection.
   - Hover over the connection line hotspot to reveal the context menu and toggle connection types.
   - Click the delete menu button to delete a line, or other buttons to change the arrow directionality

6. **Multiple Select and Group Move**:

   - Left click and box-select notes together
   - Move all selected notes together by dragging any of the selected notes.

7. **Zoom and Pan**:

   - Use the mouse scroll wheel to zoom in and out of the canvas.
   - Click and hold the right mouse button to pan the canvas.

8. **Help Text**:

   - Refer to the help text at the bottom left of the canvas for instructions on key functionalities.

9. **Export State**:

   - Click the "Export" button in the navigation bar to copy the current state of the mind map to JSON format and copy it to the clipboard.

10. **Import State**:
    - Click the "Import" button in the navigation bar to load a previously saved mind map from a JSON file.

## JSON Schema Description
Schema Explanation: The JSON represents a diagram with two main components: "notes" (n) and "connections" (c).

Notes (n):

ID (i): A unique base-62 identifier for each note, starting at "1".
Position (p): An array representing the x and y coordinates of the note on the canvas.
Content (c): A string containing the text or label of the note.
Connections (c):

Each connection is an array with three elements:
From ID: The i value of the starting note.
To ID: The i value of the ending note.
Type: An integer representing the connection type (e.g., directional, non-directional).

## File Manifest

```

```

Please also see CANVAS_TEMPLATE.md for instructions on how to create custom templates and PLAYWRIGHT_SETUP.md for instructions on how to implement end to end browser tests.
