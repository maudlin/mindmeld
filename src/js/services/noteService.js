// noteService.js - Service layer for note operations
import { createNote } from '../factories/noteFactory.js';
// MM-171: Legacy event system disabled - using adapter architecture
// import { addNoteEventListeners } from '../features/note/noteEvents.js';
import { displayAsViewMode } from '../features/note/editViewMode.js';

export class NoteService {
  static createNoteFromData(noteData, canvas) {
    console.warn('DEPRECATED: NoteService.createNoteFromData() - Use NoteBehavior.createNoteFromData() instead. This service method will be removed in future versions for better ID collision prevention.');
    const note = createNote(
      parseFloat(noteData.left || noteData.p[0]),
      parseFloat(noteData.top || noteData.p[1]),
      canvas,
      null, // MM-171: Legacy event system disabled - adapter system handles events
    );

    note.id = noteData.id || noteData.i;
    note.dataset.id = noteData.id || noteData.i; // Fix: Keep id and data-id in sync
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
