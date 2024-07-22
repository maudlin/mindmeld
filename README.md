# MindMeld

MindMeld is a web-based mind mapping tool that allows users to create, organize, and connect notes in a flexible, freeform manner. This application is designed to help users visually map out their ideas and relationships between them.

## Features

- **Add Notes**: Double-click anywhere on the canvas to create a new note.
- **Move Notes**: Click and drag notes to reposition them on the canvas.
- **Edit Notes**: Click on a note to enter edit mode and save changes.
- **Delete Notes**: Delete notes by pressing the delete key.
- **Multiple Select and Group Move**: Select multiple notes using a selection box and move them as a group.
- **Group Delete**: Delete multiple selected notes by pressing the delete key.
- **Draw Connections**: Draw lines between notes to indicate relationships, with dynamic updates and deletion capabilities.
- **Style Notes and Canvas**: Notes have a pleasing background color, border, and text style. The canvas has a neutral background with styled hover and focus states for notes.
- **Debounce Mechanism**: Prevents accidental multiple note creations by handling double-click events effectively.
- **Data Store and Export**: Modular data store handler that manages the state of the notes and allows exporting the current state to JSON format. A button is provided to copy the JSON data to the clipboard.
- **Help Text**: Provides users with instructions on how to use key functionalities.

## Recent Enhancements

### Multiple Note Selection and Movement

- Users can select multiple notes by clicking and dragging a selection box over them.
- Multiple selected notes can be moved together as a group by dragging any of the selected notes.

### Group Delete Functionality

- Users can delete multiple selected notes by pressing the delete key.

### Improved Note Interaction

- Single left-click on a note selects it, and the note can be moved by holding down the mouse button and dragging.
- Left-clicking on a selected note within a group does not deselect the group.
- Single left-click on the canvas (outside any note) will deselect all selected notes.

### Help Text Added

- Added a help text section at the bottom left of the canvas to guide users on how to use key functionalities.
- Styled the help text in 50% gray, 10pt Poppins font for a consistent and user-friendly appearance.

### Miscellaneous Improvements

- Removed the red cross delete button from each note.
- Disabled the browser’s default right-click menu to prevent unintended interactions within the MindMeld application.

### Help Text Content

The help text displayed on the canvas provides the following instructions:

- Create a note: Double-click
- Delete a note: Select a note and press delete
- Connect two notes: Drag a line from one blue connector to another
- Select multiple notes: Click on the canvas and drag to select multiple notes
- Delete multiple notes: With multiple notes selected, press delete

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

   - Click on a connection handle on a note to start a connection.
   - Drag the line to another note to create the connection.
   - Click on the connection line and press the delete key to remove it.

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
