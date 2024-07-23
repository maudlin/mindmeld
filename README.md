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

## Key Improvements

- **Enhanced User Experience**: Users can create connections more intuitively with dynamic and visually guided connecting points.
- **Improved Accuracy**: The application automatically selects the optimal connection points, ensuring connections are drawn cleanly and efficiently.
- **Bug Fixes**: Addressed and fixed various bugs related to note movement and connection handling, ensuring smoother interactions and more reliable functionality.

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
   - Run the local development server using live-server or a similar tool:
     ```bash
     cd frontend
     live-server
     ```

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

   - Delete notes by pressing the delete key.

5. **Draw Connections**:

   - Hover over a note to reveal ghost connecting points.
   - Click and drag from a ghost connecting point to another note to create a connection.
   - Hover over a connection line to reveal the context menu and toggle connection types.
   - Click within 2px of a connection line to select it.
   - Press the delete key to remove the selected connection line.

6. **Multiple Select and Group Move**:

   - Use a selection box or a modifier key (e.g., Shift) to select multiple notes.
   - Move all selected notes together by dragging any of the selected notes.

7. **Group Delete**:

   - Delete multiple selected notes by pressing the delete key.

8. **Help Text**:

   - Refer to the help text at the bottom left of the canvas for instructions on key functionalities.

9. **Export State**:
   - Click the "Export" button in the navigation bar to copy the current state of the mind map to JSON format and copy it to the clipboard.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
