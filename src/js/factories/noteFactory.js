// noteFactory.js - Pure factory for creating note DOM elements
import { toBase62, calculateOffsetPosition } from '../utils/utils.js';
import config from '../core/config.js';
import { NOTE_CONTENT_LIMIT } from '../core/constants.js';
import { eventBus } from '../core/eventBus.js';

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
  canvas.appendChild(note);

  note.style.left = `${x}px`;
  note.style.top = `${y}px`;
  note.style.width = `${config.noteSize.width}px`;
  note.style.padding = `${config.noteSize.padding}px`;

  const noteId = toBase62(nextNoteId++);
  note.id = noteId;

  // Emit event instead of direct dataStore call
  eventBus.emit('note.created', {
    id: noteId,
    content: '',
    left: note.style.left,
    top: note.style.top,
  });

  noteContent.addEventListener('input', function () {
    if (this.innerText.length > NOTE_CONTENT_LIMIT) {
      this.innerText = this.innerText.slice(0, NOTE_CONTENT_LIMIT);

      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(this.firstChild, NOTE_CONTENT_LIMIT);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // Emit events instead of direct calls
    eventBus.emit('note.updated', { id: noteId, content: this.innerHTML });
    eventBus.emit('state.save');
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
