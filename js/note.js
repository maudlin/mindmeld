import { addNote, updateNote, deleteNoteById } from './dataStore.js';
import { createConnectionHandle, isConnecting } from './connections.js';
import { moveNote } from './movement.js';

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
    note.remove();
    deleteNoteById(note.id);
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
  addNote({
    id: note.id,
    content: '',
    left: note.style.left,
    top: note.style.top,
  });

  noteContent.addEventListener('input', () => {
    updateNote(note.id, { content: noteContent.innerHTML });
  });

  addNoteEventListeners(note);
}

export function addNoteEventListeners(note) {
  note.addEventListener('mousedown', (event) => {
    if (!isConnecting) {
      moveNote(note, event);
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

export function deleteNote() {
  const selected = document.querySelector('.note.selected');
  if (selected) {
    deleteNoteById(selected.id);
    selected.remove();
  }
}

export function selectNote(note) {
  const selected = document.querySelector('.note.selected');
  if (selected && selected !== note) {
    selected.classList.remove('selected');
  }
  note.classList.add('selected');
}
