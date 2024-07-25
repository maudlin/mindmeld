import { updateNote } from './dataStore.js';
import { updateConnections } from './connections.js';
import { getZoomLevel } from './zoomManager.js';

let activeNote = null;
let shiftX = 0,
  shiftY = 0;
let selectedNotes = [];
let offsets = [];

function onMouseMove(event) {
  if (activeNote) {
    moveAt(event.clientX, event.clientY, activeNote.closest('#canvas'));
  }
}

function onMouseUp() {
  if (activeNote) {
    moveNoteEnd();
  }
}

export function moveNoteStart(note, event) {
  activeNote = note;
  selectedNotes = Array.from(document.querySelectorAll('.note.selected'));

  const zoomLevel = getZoomLevel();
  const scale = zoomLevel / 5;

  const canvas = note.closest('#canvas');
  const canvasRect = canvas.getBoundingClientRect();
  const noteRect = note.getBoundingClientRect();

  // Calculate the shift relative to the canvas, accounting for zoom
  shiftX =
    (event.clientX - canvasRect.left) / scale -
    (noteRect.left - canvasRect.left) / scale;
  shiftY =
    (event.clientY - canvasRect.top) / scale -
    (noteRect.top - canvasRect.top) / scale;

  // Calculate offsets for each selected note relative to the active note
  offsets = selectedNotes.map((selectedNote) => {
    const rect = selectedNote.getBoundingClientRect();
    return {
      note: selectedNote,
      offsetX: (rect.left - noteRect.left) / scale,
      offsetY: (rect.top - noteRect.top) / scale,
    };
  });

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

export function moveNoteEnd() {
  activeNote = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

function moveAt(pageX, pageY, canvas) {
  const zoomLevel = getZoomLevel();
  const scale = zoomLevel / 5;

  const canvasRect = canvas.getBoundingClientRect();

  // Calculate the position relative to the canvas, accounting for zoom
  const canvasX = (pageX - canvasRect.left) / scale;
  const canvasY = (pageY - canvasRect.top) / scale;

  // Adjust for the initial click offset within the note
  const offsetX = canvasX - shiftX;
  const offsetY = canvasY - shiftY;

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

document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
