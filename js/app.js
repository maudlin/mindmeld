import { setupCanvasEvents, setupDocumentEvents } from './events.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');

  setupCanvasEvents(canvas);
  setupDocumentEvents();
});
