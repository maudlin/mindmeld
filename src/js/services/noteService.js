// noteService.js - Service layer for note operations
import { createNote } from '../factories/noteFactory.js';
// Legacy event system disabled - using adapter architecture
// import { addNoteEventListeners } from '../features/note/noteEvents.js';
import { displayAsViewMode } from '../features/note/editViewMode.js';

export class NoteService {
  static createNoteFromData(noteData, canvas) {
    // Temporarily disable event emission during factory call to prevent duplicate events
    const originalEventEmission = globalThis.disableFactoryEvents;
    globalThis.disableFactoryEvents = true;

    // Create DOM note element using factory (will skip event emission due to flag)
    const note = createNote(
      parseFloat(noteData.left || noteData.p[0]),
      parseFloat(noteData.top || noteData.p[1]),
      canvas,
      null, // Legacy event system disabled - adapter system handles events
    );

    // Restore original event emission state
    globalThis.disableFactoryEvents = originalEventEmission;

    // Override with restored ID (both DOM and data attributes)
    const restoredId = noteData.id || noteData.i;
    note.id = restoredId;
    note.dataset.id = restoredId;

    // Load stored markdown content and render as HTML (view mode)
    const noteContent = note.querySelector('.note-content');
    const storedMarkdown = noteData.content || noteData.c || '';
    displayAsViewMode(noteContent, storedMarkdown);

    // Note: No event emission needed during restoration since DataBootstrap
    // already loaded state into appState. This method only creates DOM representation.

    return note;
  }

  static clearAllNotes() {
    document.querySelectorAll('.note').forEach((note) => note.remove());
  }
}
