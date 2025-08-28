// noteFactory.js - Pure factory for creating note DOM elements
import { toBase62, calculateOffsetPosition } from '../utils/utils.js';
import config from '../core/config.js';
import { NOTE_CONTENT_LIMIT } from '../core/constants.js';
import { eventBus } from '../core/eventBus.js';
import { createDeleteButton } from '../features/note/deleteButton.js';
import { displayAsViewMode } from '../features/note/editViewMode.js';

let nextNoteId = 1;
let handDrawn = false;

export function createNoteAtPosition(canvas, event, addEventListeners = null) {
  const { left: x, top: y } = calculateOffsetPosition(canvas, event);
  // Offset the note creation position to centre the note
  return createNote(
    x - config.noteSize.width / 2,
    y - 20,
    canvas,
    addEventListeners,
  );
}

export function createNote(x, y, canvas, addEventListeners = null) {
  const note = document.createElement('div');
  note.className = 'note';

  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  if (handDrawn) {
    noteContent.classList.add('note-content-handdrawn');
  }

  noteContent.contentEditable = true;

  note.appendChild(noteContent);
  createGhostConnectors(note);
  createDeleteButton(note);

  // Initialize in view mode with empty content
  displayAsViewMode(noteContent, '');

  canvas.appendChild(note);

  note.style.left = `${x}px`;
  note.style.top = `${y}px`;
  note.style.width = `${config.noteSize.width}px`;
  note.style.padding = `${config.noteSize.padding}px`;

  const noteId = toBase62(nextNoteId++);
  note.id = noteId;
  note.dataset.id = noteId;

  // Emit event instead of direct dataStore call
  eventBus.emit('note.created', {
    id: noteId,
    content: '',
    left: note.style.left,
    top: note.style.top,
  });

  // Prevent accidental note deletion with backspace/delete on empty content
  noteContent.addEventListener('keydown', function (event) {
    // Check for textarea in edit mode
    const textarea = this.querySelector('textarea.edit-textarea');
    const content = textarea ? textarea.value : this.textContent;
    const isEmpty = !content || content.trim() === '';

    // Prevent backspace and delete (Mac) when content is empty
    if (isEmpty && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault();
      event.stopPropagation();
      console.log('Prevented accidental note deletion - content is empty');
      return;
    }
  });

  noteContent.addEventListener('input', function () {
    // Only handle content length limiting - NO SAVING ON EVERY KEYSTROKE
    const textarea = this.querySelector('textarea.edit-textarea');
    if (textarea) {
      // Handle textarea length limiting
      if (textarea.value.length > NOTE_CONTENT_LIMIT) {
        textarea.value = textarea.value.slice(0, NOTE_CONTENT_LIMIT);
        // Set cursor to end
        textarea.setSelectionRange(NOTE_CONTENT_LIMIT, NOTE_CONTENT_LIMIT);
      }
    } else {
      // Handle contentEditable (fallback for view mode)
      if (this.textContent.length > NOTE_CONTENT_LIMIT) {
        this.textContent = this.textContent.slice(0, NOTE_CONTENT_LIMIT);

        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(this.firstChild, NOTE_CONTENT_LIMIT);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    // Content length limiting only - save happens on blur/exit
    // This prevents real-time corruption feedback loops
  });

  // Add event listeners if callback provided
  if (addEventListeners) {
    addEventListeners(note, canvas);
  }

  return note;
}

function createGhostConnectors(note) {
  const positions = ['top', 'bottom', 'left', 'right'];
  positions.forEach((position) => {
    const connector = document.createElement('div');
    connector.className = `ghost-connector ${position}`;
    note.appendChild(connector);
  });
}
