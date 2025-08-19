// src/js/features/note/deleteButton.js - Delete button creation following ghost connector pattern

import { eventBus } from '../../core/eventBus.js';
import { createHTMLDeleteButton } from '../../components/deleteButton/deleteButtonFactory.js';

/**
 * Creates a delete button for a note
 * Follows the same pattern as ghost connectors - permanent child element
 */
export function createDeleteButton(note) {
  const button = createHTMLDeleteButton({
    ariaLabel: 'Delete note',
    onClick: () => {
      // Delete this note using existing deletion system
      const canvas = document.getElementById('canvas');
      eventBus.emit('note.deleteWithConnections', {
        note: note,
        canvas: canvas,
      });

      // Announce to screen readers
      announceDelete();
    },
  });

  note.appendChild(button);
}

/**
 * Announce deletion to screen readers
 */
function announceDelete() {
  // Find or create screen reader announcer
  let announcer = document.getElementById('sr-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
  }

  announcer.textContent = 'Note deleted';
  setTimeout(() => (announcer.textContent = ''), 1000);
}
