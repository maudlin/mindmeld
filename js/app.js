import { setupCanvasEvents, setupDocumentEvents } from './events.js';
import { exportToJSON, importFromJSON } from './dataStore.js';
import './movement.js';
import { setupZoomAndPan } from './zoomManager.js';
import { DOM_SELECTORS } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('overlay');
  const dismissButton = document.getElementById('dismiss-button');

  // Check if the user has seen the overlay before
  if (!localStorage.getItem('overlayDismissed')) {
    overlay.classList.remove('hidden');
    console.log('Overlay shown');
  } else {
    overlay.classList.add('hidden');
    console.log('Overlay already dismissed');
  }

  // Add event listener to the dismiss button
  dismissButton.addEventListener('click', function () {
    console.log('Dismiss button clicked');
    overlay.classList.add('hidden');
    console.log('Overlay should now be hidden');
    localStorage.setItem('overlayDismissed', 'true');
    console.log('LocalStorage set to true');
  });

  // Add event listener to hide overlay when clicking outside of it
  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) {
      console.log('Overlay clicked');
      overlay.classList.add('hidden');
      console.log('Overlay should now be hidden');
      localStorage.setItem('overlayDismissed', 'true');
      console.log('LocalStorage set to true');
    }
  });

  const canvasContainer = document.getElementById('canvas-container');
  const canvas = document.querySelector(DOM_SELECTORS.CANVAS);
  const exportButton = document.getElementById('export-json');
  const importButton = document.getElementById('import-json');
  const zoomDisplay = document.getElementById('zoom-display');

  setupCanvasEvents(canvas);
  setupDocumentEvents();
  setupZoomAndPan(canvasContainer, canvas, zoomDisplay);

  exportButton.addEventListener('click', () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  importButton.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          importFromJSON(e.target.result, canvas);
        } catch (error) {
          console.error('Error importing file:', error);
          alert(
            "Error importing file. Please make sure it's a valid JSON file.",
          );
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
});
