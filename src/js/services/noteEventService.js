// noteEventService.js - Handles note-related events from the event bus
import { createNoteAtPosition } from '../factories/noteFactory.js';
import { deleteNoteWithConnections } from '../features/note/noteDeletion.js';
import { addNoteEventListeners } from '../features/note/noteEvents.js';
import { eventBus } from '../core/eventBus.js';

export class NoteEventService {
  static initialize() {
    console.log('NoteEventService: Initializing event listeners');

    // Handle note creation from events
    eventBus.on('note.createAtPosition', ({ canvas, event }) => {
      console.log('NoteEventService: Received note.createAtPosition event', {
        canvas: canvas?.id,
        event: event?.type,
      });
      createNoteAtPosition(canvas, event, addNoteEventListeners);
    });

    // Handle note deletion from events
    eventBus.on('note.deleteWithConnections', ({ note, canvas }) => {
      console.log(
        'NoteEventService: Received note.deleteWithConnections event',
      );
      deleteNoteWithConnections(note, canvas);
    });

    console.log('NoteEventService: Event listeners initialized');
  }
}
