// noteService.js - Service layer for note operations
import { createNote } from '../factories/noteFactory.js';
// MM-171: Legacy event system disabled - using adapter architecture
// import { addNoteEventListeners } from '../features/note/noteEvents.js';
import { displayAsViewMode } from '../features/note/editViewMode.js';

export class NoteService {
  static createNoteFromData(noteData, canvas) {
    const note = createNote(
      parseFloat(noteData.left || noteData.p[0]),
      parseFloat(noteData.top || noteData.p[1]),
      canvas,
      null, // MM-171: Legacy event system disabled - adapter system handles events
    );

    note.id = noteData.id || noteData.i;
    const noteContent = note.querySelector('.note-content');
    // Load stored markdown content and immediately render as HTML (view mode)
    const storedMarkdown = noteData.content || noteData.c || '';
    displayAsViewMode(noteContent, storedMarkdown);

    return note;
  }

  static clearAllNotes() {
    document.querySelectorAll('.note').forEach((note) => note.remove());
  }
}
