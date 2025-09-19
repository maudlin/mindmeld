// noteDeletion.js - Handles note deletion logic
import { DataProviderService } from '../../services/DataProviderService.js';
import { deleteConnectionsByNote } from '../connection/connection.js';
import { connectionManager } from '../connection/connectionManager.js';
import { noteManager } from '../../services/noteManager.js';

export function deleteNoteWithConnections(note, canvas) {
  // Clean up connections first
  deleteConnectionsByNote(note);

  // Delete note from data provider
  try {
    const dataProviderService = DataProviderService.getInstance();
    dataProviderService.deleteNote(note.id, { origin: 'user' });
  } catch (error) {
    console.error('Failed to delete note from data provider:', error);
    // Continue with DOM cleanup even if provider deletion fails
  }

  // Remove note from DOM
  note.remove();

  // Update connection visualizations
  connectionManager.updateConnections(note, canvas);
}

export function deleteNote() {
  const selectedNotes = noteManager.getSelectedNotes();
  if (selectedNotes.length > 0) {
    const canvas = document.getElementById('canvas');
    // Delete all selected notes
    selectedNotes.forEach((note) => {
      deleteNoteWithConnections(note, canvas);
    });
  }
}
