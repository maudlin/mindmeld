// src/js/features/note/deleteButton.js - Delete button creation following ghost connector pattern

import { eventBus } from '../../core/eventBus.js';
import { createHTMLDeleteButton } from '../../components/deleteButton/deleteButtonFactory.js';
import { noteManager } from '../../services/noteManager.js';
import { deleteNote } from './noteDeletion.js';

/**
 * Creates a delete button for a note
 * Follows the same pattern as ghost connectors - permanent child element
 */
export function createDeleteButton(note) {
  const button = createHTMLDeleteButton({
    ariaLabel: 'Delete note',
    onClick: () => {
      // Check if multiple notes are selected
      const selectedNotes = noteManager.getSelectedNotes();

      if (selectedNotes.length > 1) {
        // Multiple notes selected - delete all selected notes
        deleteNote();
        announceMultiDelete(selectedNotes.length);
      } else {
        // Single note or no selection - delete this specific note
        const canvas = document.getElementById('canvas');
        eventBus.emit('note.deleteWithConnections', {
          note: note,
          canvas: canvas,
        });
        announceDelete();
      }
    },
  });

  note.appendChild(button);
}

/**
 * Announce deletion to screen readers
 */
function announceDelete() {
  announce('Note deleted');
}

/**
 * Announce multiple note deletion to screen readers
 */
function announceMultiDelete(count) {
  announce(`${count} notes deleted`);
}

/**
 * Generic announce function for screen readers
 */
function announce(message) {
  // Find or create screen reader announcer
  let announcer = document.getElementById('sr-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
  }

  announcer.textContent = message;
  setTimeout(() => (announcer.textContent = ''), 1000);
}
