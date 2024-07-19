import { addNote, updateNote, deleteNoteById } from './dataStore.js';
import {
  createConnectionHandle,
  updateConnections,
  deleteConnectionsByNote,
} from './connections.js';
import { moveNote } from './movement.js';

export function createNoteAtPosition(canvas, event) {
  console.log('Creating note at position:', event.clientX, event.clientY);
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
  createConnectionHandle(note); // Add connection handle
  canvas.appendChild(note);

  // Get the dimensions of the note
  const noteWidth = note.offsetWidth;
  const noteHeight = note.offsetHeight;

  // Adjust the position
  note.style.left = `${event.clientX - noteWidth / 2}px`;
  note.style.top = `${event.clientY - noteHeight / 2}px`;

  note.id = `note-${Date.now()}`;
  console.log('Created note with id:', note.id);
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
      moveNote(note, event, canvas);
      selectNote(note);
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
    selectNote(note);
    event.stopPropagation();
  });
}

export function deleteNoteWithConnections(note, canvas) {
  deleteConnectionsByNote(note);
  deleteNoteById(note.id);
  note.remove();
  updateConnections(note, canvas); // Ensure connections are updated when a note is deleted
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
