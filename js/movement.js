import { updateNote } from './dataStore.js';
import { updateConnections } from './connections.js';

let activeNote = null;
let shiftX, shiftY;
let selectedNotes = [];

export function moveNoteStart(note, event) {
  activeNote = note;
  selectedNotes = Array.from(document.querySelectorAll('.note.selected'));
  shiftX = event.clientX - note.getBoundingClientRect().left;
  shiftY = event.clientY - note.getBoundingClientRect().top;

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

  selectedNotes.forEach((selectedNote) => {
    const noteShiftX =
      offsetX +
      (selectedNote.getBoundingClientRect().left -
        activeNote.getBoundingClientRect().left);
    const noteShiftY =
      offsetY +
      (selectedNote.getBoundingClientRect().top -
        activeNote.getBoundingClientRect().top);
    selectedNote.style.left = `${noteShiftX}px`;
    selectedNote.style.top = `${noteShiftY}px`;
    updateNote(selectedNote.id, {
      left: selectedNote.style.left,
      top: selectedNote.style.top,
    });
    updateConnections(selectedNote, canvas);
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
