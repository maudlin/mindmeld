//note.js
import { addNote, updateNote, deleteNoteById } from './dataStore.js';
import { updateConnections, deleteConnectionsByNote } from './connections.js';
import { moveNoteStart } from './movement.js';
import { calculateOffsetPosition } from './utils.js';

export function createNoteAtPosition(canvas, event) {
  const { left: x, top: y } = calculateOffsetPosition(canvas, event);

  const note = document.createElement('div');
  note.className = 'note';

  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  noteContent.contentEditable = true;

  note.appendChild(noteContent);
  createGhostConnectors(note);
  canvas.appendChild(note);

  const leftPosition = x;
  const topPosition = y;

  note.style.left = `${leftPosition}px`;
  note.style.top = `${topPosition}px`;

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
          clearSelections();
          selectNote(note);
        }
      }
      moveNoteStart(note, event, canvas);
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
        clearSelections();
        selectNote(note);
      }
    }
    event.stopPropagation();
  });

  note.addEventListener('mousemove', () => {
    updateConnections(note, canvas);
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
