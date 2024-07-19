import { updateNote } from './dataStore.js';
import { updateConnections } from './connections.js';

let activeNote = null;
let shiftX, shiftY;

export function moveNote(note, event) {
  activeNote = note;
  shiftX = event.clientX - note.getBoundingClientRect().left;
  shiftY = event.clientY - note.getBoundingClientRect().top;

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function moveAt(note, pageX, pageY) {
  note.style.left = pageX - shiftX + 'px';
  note.style.top = pageY - shiftY + 'px';
  updateNote(note.id, { left: note.style.left, top: note.style.top });
  updateConnections(note); // Update connection positions
}

function onMouseMove(event) {
  if (activeNote) {
    moveAt(activeNote, event.pageX, event.pageY);
  }
}

function onMouseUp() {
  if (activeNote) {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    activeNote = null;
  }
}

document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
