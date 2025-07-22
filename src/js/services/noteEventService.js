// noteEventService.js - Handles note-related events from the event bus
import { createNoteAtPosition } from '../factories/noteFactory.js';
import { deleteNoteWithConnections } from '../features/note/noteDeletion.js';
import { addNoteEventListeners } from '../features/note/noteEvents.js';
import { eventBus } from '../core/eventBus.js';

export class NoteEventService {
  static initialize() {
    // Handle note creation from events
    eventBus.on('note.createAtPosition', ({ canvas, event }) => {
      console.log('Creating note at position:', { canvas, event }); // Debug log
      const note = createNoteAtPosition(canvas, event, addNoteEventListeners);
      console.log('Note created:', note); // Debug log
    });

    // Handle note deletion from events
    eventBus.on('note.deleteWithConnections', ({ note, canvas }) => {
      deleteNoteWithConnections(note, canvas);
    });
  }
}
