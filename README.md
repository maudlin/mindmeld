# MindMeld

MindMeld is a web-based mind mapping tool that allows users to create, organize, and connect notes in a flexible, freeform manner. This application is designed to help users visually map out their ideas and relationships between them.

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

## Recent Enhancements

### Dynamic Connectors

- **Proximity-Based Connections**: Connections are drawn from the closest proximity points on the notes.
- **Two-Way Dynamic Connection Points**: Both the source and target notes dynamically adjust to connect from their nearest edges.

### Ghost Connectors

- **Hover Indicators**: Four ghost connecting points appear at the center of each side of a note when hovering, serving as visual indicators for initiating connections.
- **Connector Interaction**: Connections can be created by clicking and dragging from any ghost connector to another note.

### Connection Handling

- **Real-Time Updates**: Connections dynamically update as notes are moved around the canvas, maintaining the shortest path between connected notes.
- **Directional Arrows**: Connections feature directional arrows to indicate the flow of connections.

### Zoom and Pan

- **Zoom Levels**: The application starts zoomed in at 5x, and users can zoom out with the mouse scroll wheel.
- **Panning**: Users can pan the canvas in the wider view by clicking and holding the right mouse button.

### Canvas Positioning Improvements

- **Enhanced Logging**: Implemented detailed logging throughout the zoom and positioning processes, which was crucial for diagnosing positioning issues.
- **Refined Positioning Logic**: Developed a more accurate method for positioning the canvas, taking into account the actual rendered position relative to the container.
- **Handling of Transform Properties**: Improved the way we interact with CSS transforms, ensuring more precise control over the canvas position and scale.
- **Initial Positioning**: Revised the initial positioning logic to set the canvas in the correct centered position from the start.
- **Continuous Monitoring**: Implemented a system to monitor the canvas position for a period after initial load, helping to catch any delayed positioning changes.

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

## File Manifest

### .devcontainer

- **devcontainer.json**: Configuration for the development container.
- **Dockerfile**: Docker configuration for the development container.

### css

- **styles.css**: Styles for the application.

### js

- **app.js**: Main application logic.
- **connections.js**: Logic for handling connections between notes.
- **constants.js**: Constants used across the application.
- **contextMenu.js**: Logic for the context menu functionality for connections.
- **dataStore.js**: Data storage handler for managing the state of notes.
- **events.js**: Event handling for user interactions.
- **movement.js**: Logic for handling note movement.
- **note.js**: Logic for creating and managing notes.
- **observableState.js**: State management with observables.
- **utils.js**: Utility functions used across the application.
- **zoomManager.js**: Logic for handling zoom and pan functionality.

### Root Files

- **.eslintrc.json**: ESLint configuration file.
- **.gitignore**: Git ignore file.
- **.prettierrc**: Prettier configuration file.
- **index.html**: Main HTML file for the application.
- **package.json**: Project metadata and dependencies.
- **package-lock.json**: Lockfile for project dependencies.
- **README.md**: Project documentation.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
