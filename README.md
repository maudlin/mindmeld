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

## File Manifest

```
.
├── js/
│   ├── app.js                 # Main application entry point
│   ├── data/
│   │   ├── observableState.js # Manages application state
│   │   └── dataStore.js       # Handles data persistence (import/export)
│   ├── features/
│   │   ├── canvas/
│   │   │   └── templates/     # Contains different canvas types
│   │   │       ├── standardCanvas/
│   │   │       │   ├── canvas.js
│   │   │       │   └── canvas.css
│   │   │       └── herosJourney/
│   │   │           ├── canvas.js
│   │   │           └── canvas.css
│   │   ├── connection/
│   │   │   ├── connection.js  # Manages connections between notes
│   │   │   └── contextMenu.js # Handles context menu for connections
│   │   ├── note/
│   │   │   └── note.js        # Defines note creation and behavior
│   │   └── zoom/
│   │       └── zoomManager.js # Manages zoom and pan functionality
│   ├── utils/
│   │   └── utils.js           # Utility functions used across the app
│   └── core/
│       ├── event.js           # Core event handling
│       ├── config.js          # Central configuration
│       ├── canvasManager.js   # Manages different canvas types
│       ├── canvasModule.js    # Base class for canvas modules
│       ├── constants.js       # Application-wide constants
│       └── movement.js        # Handles note movement
├── package.json               # Node.js dependencies and scripts
├── eslint.config.js           # ESLint configuration
├── .devcontainer/
│   ├── devcontainer.json      # VS Code dev container configuration
│   └── Dockerfile             # Docker configuration for dev environment
├── package-lock.json
├── index.html                 # Main HTML file
├── README.md                  # Project documentation
├── .prettierrc                # Prettier configuration
└── img/                       # Contains application icons and images
```

## Implementing New Canvas Template Modules

To add a new canvas template to MindMeld, follow these steps:

### 1. Create the Module Files

Create a new directory for your module in `js/features/canvas/templates/[your-module-name]/`. In this directory, create two files:

- `[YourModuleName]Canvas.js`: The main module file
- `[YourModuleName]Canvas.css`: The CSS styles for your module

### 2. Implement the Canvas Module

In your `[YourModuleName]Canvas.js` file:

```javascript
import { CanvasModule } from '../../../../core/canvasModule.js';

class YourModuleNameCanvas extends CanvasModule {
  constructor() {
    super(
      'Your Module Name',
      width,
      height,
      './js/features/canvas/templates/[your-module-name]/[YourModuleName]Canvas.css',
    );
  }

  createBackgroundLayout() {
    const layout = super.createBackgroundLayout();
    layout.classList.add('your-module-name');

    // Add your custom layout elements here
    // For example:
    // const element = document.createElement('div');
    // element.className = 'custom-element';
    // layout.appendChild(element);

    return layout;
  }
}

export default YourModuleNameCanvas;
```

Replace `width` and `height` with the desired dimensions for your canvas.

### 3. Add CSS Styles

In your `[YourModuleName]Canvas.css` file, add the styles for your canvas layout:

```css
.background-layout.your-module-name {
  /* Add your custom styles here */
}

/* Add more specific styles as needed */
```

### 4. Register the New Module

Update the `config.js` file to include your new module:

```javascript
export default {
  // ... other config options ...
  canvasTypes: {
    // ... existing canvas types ...
    yourModuleName: {
      name: 'Your Module Name',
      path: '../js/features/canvas/templates/[your-module-name]/[YourModuleName]Canvas.js',
    },
  },
};
```

### 5. Best Practices and Considerations

- Ensure your module name is unique and descriptive.
- Keep your CSS scoped to your module to avoid conflicts with other styles.
- Use semantic HTML elements in your `createBackgroundLayout` method.
- Consider the impact of your layout on existing notes and connections.
- Test your module thoroughly with different zoom levels and canvas sizes.
- Document any specific interactions or features unique to your module.

### 6. Testing Your New Module

After implementing your module:

1. Rebuild and restart the application.
2. Use the canvas style dropdown to select your new module.
3. Verify that the layout renders correctly and CSS styles are applied.
4. Test interactions with notes and connections within your new layout.

By following these steps, you can create and integrate new canvas template modules into the MindMeld application, extending its functionality with custom layouts and designs.
