import { updateNote } from './dataStore.js';
import { updateConnections } from './connections.js';

let activeNote = null;
let shiftX = 0,
  shiftY = 0;
let selectedNotes = [];
let offsets = [];

export function moveNoteStart(note, event) {
  activeNote = note;
  selectedNotes = Array.from(document.querySelectorAll('.note.selected'));

  // Capture the initial offset between the cursor and the note
  const noteRect = note.getBoundingClientRect();
  shiftX = event.clientX - noteRect.left;
  shiftY = event.clientY - noteRect.top;

  console.log(
    `Cursor location at mousedown: (${event.clientX}, ${event.clientY})`,
  );
  console.log(`Note initial position: (${noteRect.left}, ${noteRect.top})`);
  console.log(`Shift values: (shiftX: ${shiftX}, shiftY: ${shiftY})`);

  // Calculate offsets for each selected note relative to the active note
  offsets = selectedNotes.map((selectedNote) => {
    const rect = selectedNote.getBoundingClientRect();
    return {
      note: selectedNote,
      offsetX: rect.left - noteRect.left,
      offsetY: rect.top - noteRect.top,
    };
  });

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

export function moveNoteEnd() {
  activeNote = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup');
}

function moveAt(pageX, pageY, canvas) {
  const canvasRect = canvas.getBoundingClientRect();
  const offsetX = pageX - shiftX;
  const offsetY = pageY - shiftY - canvasRect.y;

  console.log(`Mouse move at: (${pageX}, ${pageY})`);
  console.log(`New note position: (left: ${offsetX}, top: ${offsetY})`);

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
    moveAt(event.clientX, event.clientY, activeNote.closest('#canvas'));
  }
}

function onMouseUp() {
  if (activeNote) {
    moveNoteEnd();
  }
}

document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
