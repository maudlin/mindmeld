// noteEventService.js - Handles note-related events from the event bus
import { createNoteAtPosition } from '../factories/noteFactory.js';
import { logger } from './logger.js';
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
    logger.warn('noteEventService: Failed to get NoteBehavior:', error);
  }
  return null;
}

export class NoteEventService {
  static initialize() {
    logger.info('NoteEventService: Initializing event listeners');

    // Handle note creation from events using NoteBehavior for unified creation path
    eventBus.on('note.createAtPosition', ({ canvas, event }) => {
      logger.info('Received note.createAtPosition event', {
        canvas: canvas?.id,
        event: event?.type,
      });

      const noteBehavior = getNoteBehavior();
      if (noteBehavior) {
        noteBehavior.createNoteAtPosition(canvas, event);
      } else {
        logger.warn(
          'NoteEventService: NoteBehavior not available, falling back to factory',
        );
        createNoteAtPosition(canvas, event, null); // MM-171: Legacy disabled
      }
    });

    // Handle note deletion from events using NoteBehavior
    eventBus.on('note.deleteWithConnections', ({ note, canvas }) => {
      logger.info(
        'NoteEventService: Received note.deleteWithConnections event',
      );
      const noteBehavior = getNoteBehavior();
      if (noteBehavior) {
        noteBehavior.deleteNoteWithConnections(note, canvas);
      } else {
        logger.warn(
          'NoteEventService: NoteBehavior not available for deletion',
        );
      }
    });

    // Handle selected note deletion from keyboard shortcuts using NoteBehavior
    eventBus.on('notes.deleteSelected', () => {
      logger.info('NoteEventService: Received notes.deleteSelected event');
      const noteBehavior = getNoteBehavior();
      if (noteBehavior) {
        noteBehavior.deleteSelectedNotes();
      } else {
        logger.warn(
          'NoteEventService: NoteBehavior not available for selected deletion',
        );
      }
    });

    logger.info('NoteEventService: Event listeners initialized');
  }
}
