import { setupCanvasEvents, setupDocumentEvents } from './events.js';
import { exportToJSON } from './dataStore.js';
import './movement.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');
  const exportButton = document.getElementById('export-json');

  setupCanvasEvents(canvas);
  setupDocumentEvents();

  exportButton.addEventListener('click', () => {
    const json = exportToJSON();
    navigator.clipboard.writeText(json).then(() => {
      alert('Mind map exported to JSON and copied to clipboard!');
    });
  });

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
});
