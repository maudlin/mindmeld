// event.js
import {
  createNoteAtPosition,
  deleteNoteWithConnections,
} from '../features/note/note.js';
import { initializeConnectionDrawing } from '../features/connection/connection.js';
import { calculateOffsetPosition } from '../utils/utils.js';

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
  canvas.addEventListener('dblclick', (event) =>
    createNoteAtPosition(canvas, event)
  );
  canvas.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', clearSelectionBox);
  document.addEventListener('mouseleave', clearSelectionBox);
  document.addEventListener('contextmenu', (event) => event.preventDefault());

  initializeConnectionDrawing(canvas);
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
    event
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
    event
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
  if (event.key === 'Delete') {
    const activeElement = document.activeElement;
    const isEditingNoteContent =
      activeElement.classList.contains('note-content') &&
      activeElement.isContentEditable;

    if (!isEditingNoteContent) {
      const canvas = document.getElementById('canvas');
      NoteManager.getSelectedNotes().forEach((note) =>
        deleteNoteWithConnections(note, canvas)
      );
    }
    // If we are editing note content, do nothing and let the default delete behavior occur
  }
}
