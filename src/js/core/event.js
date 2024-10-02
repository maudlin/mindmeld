// src/js/core/event.js.js
import {
  createNoteAtPosition,
  deleteNoteWithConnections,
} from '../features/note/note.js';
import { initializeConnectionDrawing } from '../features/connection/connection.js';
import { calculateOffsetPosition, throttle, isMobileDevice } from '../utils/utils.js';
import { saveStateToStorage } from '../data/storageManager.js';

let selectionBox = null;
let isDrawingSelectionBox = false;
let startX, startY;
let lastUpdateTime = 0;
const updateInterval = 16; // ~60fps

export const NoteManager = {
  selectedNotes: new Set(),

  selectNote(note) {
    note.classList.add('selected');
    this.selectedNotes.add(note);
  },

  deselectNote(note) {
    note.classList.remove('selected');
    this.selectedNotes.delete(note);
  },

  clearSelections() {
    this.selectedNotes.forEach((note) => note.classList.remove('selected'));
    this.selectedNotes.clear();
  },

  getSelectedNotes() {
    return Array.from(this.selectedNotes);
  },
};

export function setupCanvasEvents(canvas) {
  // Remove existing event listeners
  canvas.removeEventListener('dblclick', handleDoubleClick);
  canvas.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('mouseup', clearSelectionBox);
  document.removeEventListener('mouseleave', clearSelectionBox);
  document.removeEventListener('contextmenu', preventDefault);

  // Add event listeners
  canvas.addEventListener('dblclick', handleDoubleClick);
  canvas.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', clearSelectionBox);
  document.addEventListener('mouseleave', clearSelectionBox);
  document.addEventListener('contextmenu', preventDefault);

  // Add touch event listeners for mobile
  if (isMobileDevice()) {
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchmove', handleTouchMove);
  }

  // Re-initialize connection drawing
  initializeConnectionDrawing(canvas);
}

const throttledHandleDoubleClick = throttle((event) => {
  const canvas = event.target.closest('#canvas');
  if (canvas) {
    createNoteAtPosition(canvas, event);
    saveStateToStorage();
  }
}, 500); // 500ms throttle

function handleDoubleClick(event) {
  // Check if the click is directly on the canvas, not on a note
  if (
    event.target.id === 'canvas' ||
    event.target.classList.contains('background-layout')
  ) {
    throttledHandleDoubleClick(event);
  }
}

function preventDefault(event) {
  event.preventDefault();
}

function handleMouseDown(event) {
  if (event.button !== 0) return; // Only handle left mouse button

  const target = event.target;
  if (
    !target.classList.contains('ghost-connector') &&
    !target.classList.contains('note') &&
    !target.closest('.note')
  ) {
    startSelectionBox(event, event.currentTarget);
  }
}

function startSelectionBox(event, canvas) {
  document.body.classList.add('dragging');
  NoteManager.clearSelections();
  clearExistingSelectionBox();

  const { left: startXOffset, top: startYOffset } = calculateOffsetPosition(
    canvas,
    event,
  );

  startX = startXOffset;
  startY = startYOffset;
  selectionBox = document.createElement('div');
  selectionBox.id = 'selection-box';
  Object.assign(selectionBox.style, {
    position: 'absolute',
    border: '1px dashed #000',
    backgroundColor: 'rgba(0, 0, 255, 0.1)',
    left: `${startX}px`,
    top: `${startY}px`,
  });
  canvas.appendChild(selectionBox);

  isDrawingSelectionBox = true;
  document.addEventListener('mousemove', onMouseMove);
}

function clearSelectionBox() {
  document.body.classList.remove('dragging');
  if (isDrawingSelectionBox) {
    isDrawingSelectionBox = false;
    document.removeEventListener('mousemove', onMouseMove);
    clearExistingSelectionBox();
  }
}

function clearExistingSelectionBox() {
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

function onMouseMove(event) {
  if (!isDrawingSelectionBox || !selectionBox) return;

  const now = Date.now();
  if (now - lastUpdateTime < updateInterval) return;
  lastUpdateTime = now;

  const canvas = document.getElementById('canvas');
  const { left: currentX, top: currentY } = calculateOffsetPosition(
    canvas,
    event,
  );

  const width = currentX - startX;
  const height = currentY - startY;

  Object.assign(selectionBox.style, {
    width: `${Math.abs(width)}px`,
    height: `${Math.abs(height)}px`,
    left: `${Math.min(currentX, startX)}px`,
    top: `${Math.min(currentY, startY)}px`,
  });

  selectNotesWithinBox();
}

function selectNotesWithinBox() {
  const notes = document.querySelectorAll('.note');
  const boxRect = selectionBox.getBoundingClientRect();

  notes.forEach((note) => {
    const noteRect = note.getBoundingClientRect();
    const isSelected =
      noteRect.left >= boxRect.left &&
      noteRect.right <= boxRect.right &&
      noteRect.top >= boxRect.top &&
      noteRect.bottom <= boxRect.bottom;

    if (isSelected) {
      NoteManager.selectNote(note);
    } else {
      NoteManager.deselectNote(note);
    }
  });
}

export function setupDocumentEvents() {
  document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(event) {
  const isEditing = isEditingNoteContent(event.target);

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (!isEditing) {
      // Not editing: delete the selected note(s)
      event.preventDefault();
      const canvas = document.getElementById('canvas');
      NoteManager.getSelectedNotes().forEach((note) =>
        deleteNoteWithConnections(note, canvas),
      );
      saveStateToStorage();
    } else if (event.key === 'Delete') {
      // Editing and Delete key: allow default behavior (delete forward)
      return;
    } else if (
      event.key === 'Backspace' &&
      event.target.textContent.length === 0
    ) {
      // Editing, Backspace key, and content is empty: delete the note
      event.preventDefault();
      const note = event.target.closest('.note');
      if (note) {
        const canvas = document.getElementById('canvas');
        deleteNoteWithConnections(note, canvas);
        saveStateToStorage();
      }
    }
    // If editing and Backspace with content, allow default behavior
  }
}

function isEditingNoteContent(element) {
  return (
    element.classList.contains('note-content') && element.isContentEditable
  );
}

// Touch event handlers for mobile
function handleTouchStart(event) {
  const touch = event.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);

  if (
    !target.classList.contains('ghost-connector') &&
    !target.classList.contains('note') &&
    !target.closest('.note')
  ) {
    startSelectionBox(touch, event.currentTarget);
  }
}

function handleTouchEnd(event) {
  clearSelectionBox();
}

function handleTouchMove(event) {
  if (!isDrawingSelectionBox || !selectionBox) return;

  const touch = event.touches[0];
  const canvas = document.getElementById('canvas');
  const { left: currentX, top: currentY } = calculateOffsetPosition(
    canvas,
    touch,
  );

  const width = currentX - startX;
  const height = currentY - startY;

  Object.assign(selectionBox.style, {
    width: `${Math.abs(width)}px`,
    height: `${Math.abs(height)}px`,
    left: `${Math.min(currentX, startX)}px`,
    top: `${Math.min(currentY, startY)}px`,
  });

  selectNotesWithinBox();
}
