import { createNoteAtPosition, deleteNote } from './note.js';

export function setupCanvasEvents(canvas) {
  canvas.addEventListener('dblclick', (event) => {
    createNoteAtPosition(canvas, event);
  });
}

export function setupDocumentEvents() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Delete') {
      deleteNote();
    }
  });
}
