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
      event.preventDefault(); // Prevent default double-click behavior
      event.stopPropagation(); // Stop propagation of the event
      createNoteAtPosition(canvas, event);
    }, 200),
  ); // Increased debounce time to 200ms
}

export function setupDocumentEvents() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Delete') {
      deleteNote();
    }
  });
}
