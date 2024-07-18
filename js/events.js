import { createNoteAtPosition, deleteNote } from './note.js';

let isDebouncing = false;

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
    }, 100),
  );

  document.addEventListener('click', () => {
    const selected = document.querySelector('.note.selected');
    if (selected) {
      selected.classList.remove('selected');
    }
  });
}

export function setupDocumentEvents() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Delete') {
      deleteNote();
    }
  });
}
