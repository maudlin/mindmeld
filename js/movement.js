import { updateNote } from './dataStore.js';
import { updateConnections } from './connections.js';

let activeNote = null;
let shiftX, shiftY;
let selectedNotes = [];
let offsets = [];

export function moveNoteStart(note, event) {
  activeNote = note;
  selectedNotes = Array.from(document.querySelectorAll('.note.selected'));
  shiftX = event.clientX - note.getBoundingClientRect().left;
  shiftY = event.clientY - note.getBoundingClientRect().top;

  // Calculate offsets for each selected note relative to the active note
  offsets = selectedNotes.map((selectedNote) => ({
    note: selectedNote,
    offsetX:
      selectedNote.getBoundingClientRect().left -
      note.getBoundingClientRect().left,
    offsetY:
      selectedNote.getBoundingClientRect().top -
      note.getBoundingClientRect().top,
  }));

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

export function moveNoteEnd() {
  activeNote = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

function moveAt(pageX, pageY, canvas) {
  const offsetX = pageX - shiftX;
  const offsetY = pageY - shiftY;

  offsets.forEach(({ note, offsetX: relativeX, offsetY: relativeY }) => {
    const noteShiftX = offsetX + relativeX;
    const noteShiftY = offsetY + relativeY;
    note.style.left = `${noteShiftX}px`;
    note.style.top = `${noteShiftY}px`;
    updateNote(note.id, {
      left: note.style.left,
      top: note.style.top,
    });
    updateConnections(note, canvas);
  });
}

function onMouseMove(event) {
  if (activeNote) {
    moveAt(event.pageX, event.pageY, activeNote.closest('#canvas'));
  }
}

function onMouseUp() {
  if (activeNote) {
    moveNoteEnd();
  }
}

document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
