//note.js
import { addNote, updateNote } from '../../data/dataStore.js';
import { calculateOffsetPosition, toBase62 } from '../../utils/utils.js';
import config from '../../core/config.js';
import { NOTE_CONTENT_LIMIT } from '../../core/constants.js';
import { addNoteEventListeners } from './noteEvents.js';
import { createGhostConnectors } from './ghostConnectors.js';
import { saveStateToStorage } from '../../data/storageManager.js';
export { deleteNote, deleteNoteWithConnections } from './noteDeletion.js';

let nextNoteId = 1;
let handDrawn = false;

export function createNoteAtPosition(canvas, event) {
  const { left: x, top: y } = calculateOffsetPosition(canvas, event);
  // Offset the note creation position to centre the note
  return createNote(x - config.noteSize.width / 2, y - 20, canvas);
}

export function createNote(x, y, canvas) {
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

  addNote({
    id: noteId,
    content: '',
    left: note.style.left,
    top: note.style.top,
  });

  noteContent.addEventListener('input', function () {
    if (this.innerText.length > NOTE_CONTENT_LIMIT) {
      this.innerText = this.innerText.slice(0, NOTE_CONTENT_LIMIT);
      // Place the cursor at the end
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(this.childNodes[0], NOTE_CONTENT_LIMIT);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    updateNote(noteId, { content: this.innerHTML });
    saveStateToStorage();
  });

  addNoteEventListeners(note, canvas);

  return note;
}
