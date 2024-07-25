//movement.js
import { updateNote } from './dataStore.js';
import { updateConnections } from './connections.js';
import { getZoomLevel } from './zoomManager.js';
import { selectNote, clearSelections } from './events.js';

let activeNote = null;
let shiftX = 0,
  shiftY = 0;
let selectedNotes = [];
let offsets = [];

/**
 * Handles mouse movement when dragging a note.
 * @param {MouseEvent} event - The mouse event.
 */
function onMouseMove(event) {
  if (activeNote) {
    moveAt(event.clientX, event.clientY, activeNote.closest('#canvas'));
  }
}

/**
 * Handles mouse up event when dragging a note.
 */
function onMouseUp() {
  if (activeNote) {
    moveNoteEnd();
  }
}

/**
 * Starts the note movement process.
 * @param {HTMLElement} note - The note being moved.
 * @param {MouseEvent} event - The mousedown event.
 */
export function moveNoteStart(note, event) {
  if (!note.classList.contains('selected')) {
    clearSelections();
    selectNote(note);

  activeNote = note;
  selectedNotes = Array.from(document.querySelectorAll('.note.selected'));

  const zoomLevel = getZoomLevel();
  const scale = zoomLevel / 5;

  const canvas = note.closest('#canvas');
  const canvasRect = canvas.getBoundingClientRect();
  const noteRect = note.getBoundingClientRect();

  shiftX =
    (event.clientX - canvasRect.left) / scale -
    (noteRect.left - canvasRect.left) / scale;
  shiftY =
    (event.clientY - canvasRect.top) / scale -
    (noteRect.top - canvasRect.top) / scale;

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

/**
 * Ends the note movement process.
 */
export function moveNoteEnd() {
  activeNote = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

/**
 * Moves the note to a new position.
 * @param {number} pageX - The x-coordinate of the mouse.
 * @param {number} pageY - The y-coordinate of the mouse.
 * @param {HTMLElement} canvas - The canvas element.
 */
function moveAt(pageX, pageY, canvas) {
  const zoomLevel = getZoomLevel();
  const scale = zoomLevel / 5;

  const canvasRect = canvas.getBoundingClientRect();

  const canvasX = (pageX - canvasRect.left) / scale;
  const canvasY = (pageY - canvasRect.top) / scale;

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
