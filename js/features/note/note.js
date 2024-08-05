//note.js
import { addNote, updateNote, deleteNoteById } from '../../data/dataStore.js';
import {
  updateConnections,
  deleteConnectionsByNote,
} from '../connection/connection.js';
import { moveNoteStart } from '../../core/movement.js';
import { calculateOffsetPosition } from '../../utils/utils.js';
import { NoteManager } from '../../core/event.js';
import config from '../../core/config.js';

export function createNoteAtPosition(canvas, event) {
  const { left: x, top: y } = calculateOffsetPosition(canvas, event);
  return createNote(x, y, canvas);
}

export function createNote(x, y, canvas) {
  const note = document.createElement('div');
  note.className = 'note';

  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  noteContent.contentEditable = true;

  note.appendChild(noteContent);
  createGhostConnectors(note);
  canvas.appendChild(note);

  note.style.left = `${x}px`;
  note.style.top = `${y}px`;
  note.style.width = `${config.noteSize.width}px`;
  note.style.padding = `${config.noteSize.padding}px`;

  note.id = `note-${Date.now()}`;
  addNote({
    id: note.id,
    content: '',
    left: note.style.left,
    top: note.style.top,
  });

  noteContent.addEventListener('input', () => {
    updateNote(note.id, { content: noteContent.innerHTML });
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

  note.addEventListener('mousemove', () => {
    updateConnections(note, canvas);
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