//event.js
import { createNoteAtPosition, deleteNoteWithConnections } from './note.js';
import { initializeConnectionDrawing } from './connections.js';
import { moveNoteStart, moveNoteEnd } from './movement.js';
import { calculateOffsetPosition } from './utils.js';

let isDebouncing = false;
let selectionBox = null;
let startX, startY;
let isDraggingNote = false;
let isDrawingSelectionBox = false;

function debounce(func, delay) {
  return function (...args) {
    if (isDebouncing) return;
    isDebouncing = true;
    setTimeout(() => {
      func.apply(this, args);
      isDebouncing = false;
    }, delay);
  };
}

export function setupCanvasEvents(canvas) {
  canvas.addEventListener(
    'dblclick',
    debounce((event) => {
      createNoteAtPosition(canvas, event);
    }, 300),
  );

  initializeConnectionDrawing(canvas);

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      // Left mouse button
      const target = event.target;
      if (target.classList.contains('ghost-connector')) {
        // If clicking on a connection handle, start drawing a connection
        // The connection drawing logic will handle the rest
        return; // Exit early to prevent note movement
      } else if (target.classList.contains('note') || target.closest('.note')) {
        // If clicking on a note, start dragging the note
        const note = target.closest('.note');
        if (!event.shiftKey && !note.classList.contains('selected')) {
          clearSelections();
          selectNote(note);
        }
        moveNoteStart(note, event);
      } else {
        // Otherwise, start drawing the selection box
        startSelectionBox(event, canvas);
      }
    }
  });

  // Disable default right-click menu
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
}

export function selectNote(note) {
  note.classList.add('selected');
}

export function clearSelections() {
  const selectedNotes = document.querySelectorAll('.note.selected');
  selectedNotes.forEach((note) => {
    note.classList.remove('selected');
  });
}

function startSelectionBox(event, canvas) {
  clearSelections();

  const { left: startXOffset, top: startYOffset } = calculateOffsetPosition(
    canvas,
    event,
  );

  startX = startXOffset;
  startY = startYOffset;
  selectionBox = document.createElement('div');
  selectionBox.id = 'selection-box';
  selectionBox.style.position = 'absolute';
  selectionBox.style.border = '1px dashed #000';
  selectionBox.style.backgroundColor = 'rgba(0, 0, 255, 0.1)';
  selectionBox.style.left = `${startX}px`;
  selectionBox.style.top = `${startY}px`;
  canvas.appendChild(selectionBox);

  isDrawingSelectionBox = true;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event) {
  if (isDraggingNote) {
    return; // Do nothing if dragging a note
  }

  if (isDrawingSelectionBox && selectionBox) {
    const canvas = document.getElementById('canvas');
    const { left: currentX, top: currentY } = calculateOffsetPosition(
      canvas,
      event,
    );

    const width = currentX - startX;
    const height = currentY - startY;

    selectionBox.style.width = `${Math.abs(width)}px`;
    selectionBox.style.height = `${Math.abs(height)}px`;
    selectionBox.style.left = `${Math.min(currentX, startX)}px`;
    selectionBox.style.top = `${Math.min(currentY, startY)}px`;

    selectNotesWithinBox();
  }
}

function onMouseUp() {
  if (isDraggingNote) {
    moveNoteEnd();
    isDraggingNote = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    return;
  }

  if (isDrawingSelectionBox) {
    isDrawingSelectionBox = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
  }
}

function selectNotesWithinBox() {
  const notes = document.querySelectorAll('.note');
  const boxRect = selectionBox.getBoundingClientRect();

  notes.forEach((note) => {
    const noteRect = note.getBoundingClientRect();
    if (
      noteRect.left >= boxRect.left &&
      noteRect.right <= boxRect.right &&
      noteRect.top >= boxRect.top &&
      noteRect.bottom <= boxRect.bottom
    ) {
      note.classList.add('selected');
    } else {
      note.classList.remove('selected');
    }
  });
}

export function setupDocumentEvents() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Delete') {
      const selectedNotes = document.querySelectorAll('.note.selected');
      selectedNotes.forEach((note) => {
        const canvas = document.getElementById('canvas');
        deleteNoteWithConnections(note, canvas);
      });
    }
  });
}
