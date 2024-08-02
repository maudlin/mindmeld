import { setupCanvasEvents, setupDocumentEvents } from './events.js';
import { exportToJSON, importFromJSON } from './dataStore.js';
import './movement.js';
import { setupZoomAndPan } from './zoomManager.js';
import { DOM_SELECTORS } from './constants.js';
import { canvasManager } from './canvasManager.js';
import HerosJourneyCanvas from './canvas/herosJourneyCanvas.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  const canvas = document.querySelector(DOM_SELECTORS.CANVAS);
  const zoomDisplay = document.getElementById('zoom-display');
  const canvasStyleDropdown = document.getElementById('canvas-style-dropdown');
  const menu = document.getElementById('menu');

  canvasManager.registerModule(new HerosJourneyCanvas());

  // Populate the canvas style dropdown
  function populateCanvasStyleDropdown() {
    canvasManager.getAvailableModules().forEach((moduleName) => {
      if (moduleName !== 'Standard Canvas') {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = moduleName;
        button.addEventListener('click', () => {
          canvasManager.setCurrentModule(moduleName);
          canvasManager.renderCurrentModule(canvas);
          setupZoomAndPan(canvasContainer, canvas, zoomDisplay);
        });
        li.appendChild(button);
        canvasStyleDropdown.appendChild(li);
      }
    });
  }

  populateCanvasStyleDropdown();

  // Set up export and import functionality using event delegation
  menu.addEventListener('click', (event) => {
    if (event.target.id === 'export-button') {
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
    } else if (event.target.id === 'import-button') {
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
    }
  });

  // Initialize with Standard Canvas
  canvasManager.setCurrentModule('Standard Canvas');
  canvasManager.renderCurrentModule(canvas);

  setupCanvasEvents(canvas);
  setupDocumentEvents();
  setupZoomAndPan(canvasContainer, canvas, zoomDisplay);

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
});
