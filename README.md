# MindMeld

MindMeld is a web-based mind mapping tool that allows users to create, organize, and connect notes in a flexible, freeform manner. This application is designed to help users visually map out their ideas and relationships between them.

## Features

- **Add Notes**: Double-click anywhere on the canvas to create a new note.
- **Move Notes**: Click and drag notes to reposition them on the canvas.
- **Edit Notes**: Click on a note to enter edit mode and save changes.
- **Delete Notes**: Delete notes by pressing the delete key or clicking a delete button.
- **Style Notes and Canvas**: Notes have a pleasing background color, border, and text style. The canvas has a neutral background with styled hover and focus states for notes.
- **Debounce Mechanism**: Prevents accidental multiple note creations by handling double-click events effectively.
- **Data Store and Export**: Modular data store handler that manages the state of the notes and allows exporting the current state to JSON format. A button is provided to copy the JSON data to the clipboard.

## Recent Enhancements

### Navigation Bar

- Added a top bar with a dark slate color for navigation.
- Included a logo placeholder with the text "mindmeld" in Poppins font.
- Added an "Export" button on the right side with light grey text.

### Watermark

- Added a watermark in the center of the canvas with the text "mindmeld" in a subtle pale grey color.
- Ensured the watermark text is non-interactive to provide a clean user experience.

### Note Management

- Adjusted note creation logic for consistent placement at the cursor position.
- Implemented robust note movement handling to ensure only one note is moved at a time.
- Added global event listeners to ensure notes are dropped when the mouse button is released.
- Refined delete button styling to prevent unwanted text selection issues.

### Data Store and Export Functionality

- Created a modular data store handler to manage the state of the notes.
- Implemented functions to add, update, and delete notes, storing their content and positions.
- Added functionality to export the current state of the mind map to JSON format.
- Included a button to copy the JSON data to the clipboard, with user feedback confirming the action.

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

   - Delete notes by pressing the delete key or clicking a delete button.

5. **Export State**:
   - Click the "Export" button in the navigation bar to copy the current state of the mind map to JSON format and copy it to the clipboard.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
