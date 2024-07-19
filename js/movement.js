import { updateNote } from './dataStore.js';
import { updateConnections } from './connections.js';

let activeNote = null;
let shiftX, shiftY;

export function moveNote(note, event, canvas) {
  activeNote = note;
  shiftX = event.clientX - note.getBoundingClientRect().left;
  shiftY = event.clientY - note.getBoundingClientRect().top;

  document.addEventListener('mousemove', (e) => onMouseMove(e, canvas));
  document.addEventListener('mouseup', onMouseUp);
}

function moveAt(note, pageX, pageY, canvas) {
  note.style.left = pageX - shiftX + 'px';
  note.style.top = pageY - shiftY + 'px';
  updateNote(note.id, { left: note.style.left, top: note.style.top });
  updateConnections(note, canvas); // Update connection positions
}

function onMouseMove(event, canvas) {
  if (activeNote) {
    moveAt(activeNote, event.pageX, event.pageY, canvas);
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
