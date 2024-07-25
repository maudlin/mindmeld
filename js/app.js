//app.js
import { setupCanvasEvents, setupDocumentEvents } from './events.js';
import { exportToJSON } from './dataStore.js';
import './movement.js';
import { getZoomLevel, setZoomLevel } from './zoomManager.js';

const zoomMin = 1;
const zoomMax = 5;
let isPanning = false;
let startX, startY, scrollLeft, scrollTop;

document.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  const canvas = document.getElementById('canvas');
  const exportButton = document.getElementById('export-json');
  const zoomDisplay = document.getElementById('zoom-display');

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

  // Add zoom event listener
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    let zoomLevel = getZoomLevel();

    // Calculate new zoom level
    if (event.deltaY < 0 && zoomLevel < zoomMax) {
      zoomLevel += 1;
    } else if (event.deltaY > 0 && zoomLevel > zoomMin) {
      zoomLevel -= 1;
    }

    // Update the zoom level
    setZoomLevel(zoomLevel);

    // Update the zoom display
    zoomDisplay.textContent = `${zoomLevel}x`;

    // Calculate zoom scale factor
    const scale = zoomLevel / 5;

    // Get the cursor position relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    // Calculate the new transform origin based on the cursor position
    const originX = (cursorX / rect.width) * 100;
    const originY = (cursorY / rect.height) * 100;

    // Apply the scale and transform origin
    canvas.style.transformOrigin = `${originX}% ${originY}%`;
    canvas.style.transform = `scale(${scale})`;

    console.log({
      zoomLevel,
      scale,
      originX,
      originY,
    });
  });

  // Add panning functionality
  canvasContainer.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
      // Right-click
      isPanning = true;
      startX = event.clientX;
      startY = event.clientY;
      scrollLeft = canvasContainer.scrollLeft;
      scrollTop = canvasContainer.scrollTop;
    }
  });

  canvasContainer.addEventListener('mousemove', (event) => {
    if (isPanning) {
      const x = event.clientX - startX;
      const y = event.clientY - startY;
      canvasContainer.scrollLeft = scrollLeft - x;
      canvasContainer.scrollTop = scrollTop - y;
    }
  });

  canvasContainer.addEventListener('mouseup', () => {
    isPanning = false;
  });

  canvasContainer.addEventListener('mouseleave', () => {
    isPanning = false;
  });
});
