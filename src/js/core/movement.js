// movement.js
import { updateNote } from '../data/dataStore.js';
import { NoteManager } from './event.js';
import { throttle } from '../utils/utils.js';
import { getZoomLevel } from '../features/zoom/zoomManager.js';
import { updateConnections } from '../features/connection/connection.js';
import { appState } from '../data/observableState.js';

const throttledUpdateConnections = throttle(updateConnections, 16); // ~60fps

let activeNote = null;
let shiftX = 0,
  shiftY = 0;
let offsets = [];
let hasStateChanged = false;

export function moveNoteEnd() {
  if (activeNote) {
    updateConnections(activeNote, activeNote.closest('#canvas'));
    if (hasStateChanged) {
      appState.saveToLocalStorage(); // Explicitly save state after movement
    }
  }
  activeNote = null;
  hasStateChanged = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

function onMouseMove(event) {
  if (activeNote) {
    moveAt(event.clientX, event.clientY, activeNote.closest('#canvas'));
    throttledUpdateConnections(activeNote);
    hasStateChanged = true;
  }
}

function onMouseUp() {
  if (activeNote) {
    moveNoteEnd();
  }
}

export function moveNoteStart(note, event) {
  if (!note.classList.contains('selected')) {
    NoteManager.clearSelections();
    NoteManager.selectNote(note);
  }

  activeNote = note;
  const selectedNotes = NoteManager.getSelectedNotes();

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

  hasStateChanged = false;
}

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
    updateNote(
      note.id,
      {
        left: note.style.left,
        top: note.style.top,
      },
      false,
    );
    updateConnections(note, canvas);
  });
}
