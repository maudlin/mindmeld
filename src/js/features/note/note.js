//note.js
import { addNote, updateNote, deleteNoteById } from '../../data/dataStore.js';
import {
  updateConnections,
  deleteConnectionsByNote,
} from '../connection/connection.js';
import { moveNoteStart, moveNoteEnd } from '../../core/movement.js';
import { calculateOffsetPosition, toBase62 } from '../../utils/utils.js';
import { NoteManager } from '../../core/event.js';
import config from '../../core/config.js';
import { NOTE_CONTENT_LIMIT } from '../../core/constants.js';
import { saveStateToStorage } from '../../data/storageManager.js';

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

function createGhostConnectors(note) {
  const positions = ['top', 'bottom', 'left', 'right'];
  positions.forEach((position) => {
    const connector = document.createElement('div');
    connector.className = `ghost-connector ${position}`;
    note.appendChild(connector);
  });
}

export function addNoteEventListeners(note, canvas) {
  note.addEventListener('mousedown', (event) => {
    if (!event.target.classList.contains('ghost-connector')) {
      if (!event.shiftKey) {
        if (!note.classList.contains('selected')) {
          NoteManager.clearSelections();
          NoteManager.selectNote(note);
        }
      }
      moveNoteStart(note, event);
    }
  });

  note.ondragstart = () => false;

  note.addEventListener('blur', () => {
    note.removeAttribute('contenteditable');
  });

  note.addEventListener('dblclick', () => {
    note.contentEditable = true;
    note.focus();
  });

  note.addEventListener('click', (event) => {
    if (event.shiftKey) {
      toggleNoteSelection(note);
    } else {
      if (!note.classList.contains('selected')) {
        NoteManager.clearSelections();
        NoteManager.selectNote(note);
      }
    }
    event.stopPropagation();
  });

  note.addEventListener('mouseup', () => {
    moveNoteEnd();
    updateConnections(note, canvas); // Update connections after move ends
  });
}

function toggleNoteSelection(note) {
  if (note.classList.contains('selected')) {
    NoteManager.deselectNote(note);
  } else {
    NoteManager.selectNote(note);
  }
}

export function deleteNoteWithConnections(note, canvas) {
  deleteConnectionsByNote(note);
  deleteNoteById(note.id);
  note.remove();
  updateConnections(note, canvas);
}

export function deleteNote() {
  const selected = NoteManager.getSelectedNotes()[0];
  if (selected) {
    const canvas = document.getElementById('canvas');
    deleteNoteWithConnections(selected, canvas);
  }
}
