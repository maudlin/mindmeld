// noteEventService.js - Handles note-related events from the event bus
import { createNoteAtPosition } from '../factories/noteFactory.js';
import {
  deleteNoteWithConnections,
  deleteNote,
} from '../features/note/noteDeletion.js';
// MM-171: Legacy event system disabled - using adapter architecture
// import { addNoteEventListeners } from '../features/note/noteEvents.js';
import { eventBus } from '../core/eventBus.js';

/**
 * Get NoteBehavior instance from InteractionController
 * Unified note creation through behavior system
 */
function getNoteBehavior() {
  try {
    if (
      typeof window !== 'undefined' &&
      window.mindMeldDebug?.interactionController
    ) {
      return window.mindMeldDebug.interactionController.getBehavior('note');
    }
  } catch (error) {
    console.warn('noteEventService: Failed to get NoteBehavior:', error);
  }
  return null;
}

export class NoteEventService {
  static initialize() {
    console.log('NoteEventService: Initializing event listeners');

    // Handle note creation from events using NoteBehavior for unified creation path
    eventBus.on('note.createAtPosition', ({ canvas, event }) => {
      console.log('NoteEventService: Received note.createAtPosition event', {
        canvas: canvas?.id,
        event: event?.type,
      });

      const noteBehavior = getNoteBehavior();
      if (noteBehavior) {
        noteBehavior.createNoteAtPosition(canvas, event);
      } else {
        console.warn(
          'NoteEventService: NoteBehavior not available, falling back to factory',
        );
        createNoteAtPosition(canvas, event, null); // MM-171: Legacy disabled
      }
    });

    // Handle note deletion from events
    eventBus.on('note.deleteWithConnections', ({ note, canvas }) => {
      console.log(
        'NoteEventService: Received note.deleteWithConnections event',
      );
      deleteNoteWithConnections(note, canvas);
    });

    // Handle selected note deletion from keyboard shortcuts
    eventBus.on('notes.deleteSelected', () => {
      console.log('NoteEventService: Received notes.deleteSelected event');
      deleteNote();
    });

    console.log('NoteEventService: Event listeners initialized');
  }
}
