import { addNote, updateNote, deleteNoteById } from './dataStore.js';
import {
  createConnectionHandle,
  updateConnections,
  deleteConnectionsByNote,
} from './connections.js';
import { moveNoteStart } from './movement.js';

export function createNoteAtPosition(canvas, event) {
  const note = document.createElement('div');
  note.className = 'note';

  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  noteContent.contentEditable = true;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = 'x';
  deleteBtn.addEventListener('click', () => {
    deleteNoteWithConnections(note, canvas);
  });

  note.appendChild(deleteBtn);
  note.appendChild(noteContent);
  createConnectionHandle(note);
  canvas.appendChild(note);

  const noteWidth = note.offsetWidth;
  const noteHeight = note.offsetHeight;

  note.style.left = `${event.clientX - noteWidth / 2}px`;
  note.style.top = `${event.clientY - noteHeight / 2}px`;

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
}

export function addNoteEventListeners(note, canvas) {
  note.addEventListener('mousedown', (event) => {
    if (!event.target.classList.contains('connection-handle')) {
      moveNoteStart(note, event, canvas);
      if (!event.shiftKey) {
        if (!note.classList.contains('selected')) {
          clearSelections();
          selectNote(note);
        }
      } else {
        toggleNoteSelection(note);
      }
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
    if (!event.shiftKey && !note.classList.contains('selected')) {
      clearSelections();
      selectNote(note);
    } else if (event.shiftKey) {
      toggleNoteSelection(note);
    }
    event.stopPropagation();
  });
}

function clearSelections() {
  const selectedNotes = document.querySelectorAll('.note.selected');
  selectedNotes.forEach((note) => {
    note.classList.remove('selected');
  });
}

function toggleNoteSelection(note) {
  if (note.classList.contains('selected')) {
    note.classList.remove('selected');
  } else {
    note.classList.add('selected');
  }
}

export function deleteNoteWithConnections(note, canvas) {
  deleteConnectionsByNote(note);
  deleteNoteById(note.id);
  note.remove();
  updateConnections(note, canvas);
}

export function deleteNote() {
  const selected = document.querySelector('.note.selected');
  if (selected) {
    const canvas = document.getElementById('canvas');
    deleteNoteWithConnections(selected, canvas);
  }
}

export function selectNote(note) {
  const selected = document.querySelector('.note.selected');
  if (selected && selected !== note) {
    selected.classList.remove('selected');
  }
  note.classList.add('selected');
}
