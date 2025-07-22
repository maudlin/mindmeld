// noteService.js - Service layer for note operations
import { createNote } from '../factories/noteFactory.js';
import { addNoteEventListeners } from '../features/note/noteEvents.js';

export class NoteService {
  static createNoteFromData(noteData, canvas) {
    const note = createNote(
      parseFloat(noteData.left || noteData.p[0]),
      parseFloat(noteData.top || noteData.p[1]),
      canvas,
      addNoteEventListeners, // Pass the callback to avoid circular import
    );

    note.id = noteData.id || noteData.i;
    const noteContent = note.querySelector('.note-content');
    noteContent.textContent = noteData.content || noteData.c;

    return note;
  }

  static clearAllNotes() {
    document.querySelectorAll('.note').forEach((note) => note.remove());
  }
}
