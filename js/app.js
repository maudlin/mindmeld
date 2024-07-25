// app.js
import { setupCanvasEvents, setupDocumentEvents } from './events.js';
import { exportToJSON } from './dataStore.js';
import './movement.js';
import { setupZoomAndPan } from './zoomManager.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  const canvas = document.getElementById('canvas');
  const exportButton = document.getElementById('export-json');
  const zoomDisplay = document.getElementById('zoom-display');

  setupCanvasEvents(canvas);
  setupDocumentEvents();
  setupZoomAndPan(canvasContainer, canvas, zoomDisplay);

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
