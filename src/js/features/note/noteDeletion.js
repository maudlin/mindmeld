// noteDeletion.js - Handles note deletion logic
import { deleteNoteById } from '../../data/dataStore.js';
import { deleteConnectionsByNote } from '../connection/connection.js';
import { connectionManager } from '../connection/connectionManager.js';
import { noteManager } from '../../services/noteManager.js';

export function deleteNoteWithConnections(note, canvas) {
  deleteConnectionsByNote(note);
  deleteNoteById(note.id);
  note.remove();
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
