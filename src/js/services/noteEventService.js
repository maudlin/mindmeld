// noteEventService.js - Handles note-related events from the event bus
import { createNoteAtPosition } from '../factories/noteFactory.js';
import { deleteNoteWithConnections } from '../features/note/noteDeletion.js';
import { addNoteEventListeners } from '../features/note/noteEvents.js';
import { eventBus } from '../core/eventBus.js';

export class NoteEventService {
  static initialize() {
    // Handle note creation from events
    eventBus.on('note.createAtPosition', ({ canvas, event }) => {
      createNoteAtPosition(canvas, event, addNoteEventListeners);
    });

    // Handle note deletion from events
    eventBus.on('note.deleteWithConnections', ({ note, canvas }) => {
      deleteNoteWithConnections(note, canvas);
    });
  }
}
