import { setupCanvasEvents, setupDocumentEvents } from './core/event.js';
import { exportToJSON, importFromJSON } from './data/dataStore.js';
import './core/movement.js';
import {
  setupZoomAndPan,
  getZoomLevel,
  resetZoomLevel,
} from './features/zoom/zoomManager.js';
import { DOM_SELECTORS } from './core/constants.js';
import { canvasManager } from './core/canvasManager.js';
import config from './core/config.js';

async function initializeApp() {
  const canvasContainer = document.getElementById('canvas-container');
  const canvas = document.querySelector(DOM_SELECTORS.CANVAS);
  const zoomDisplay = document.getElementById('zoom-display');
  const canvasStyleDropdown = document.getElementById('canvas-style-dropdown');
  const menu = document.getElementById('menu');

  // Check for any delayed style applications
  requestAnimationFrame(() => {
    console.log('Checking canvas position after frame render');
    const canvasRect = canvas.getBoundingClientRect();
    console.log('Canvas position:', {
      left: canvasRect.left,
      top: canvasRect.top,
      width: canvasRect.width,
      height: canvasRect.height,
    });
  });

  // Register canvas modules
  for (const [key, value] of Object.entries(config.canvasTypes)) {
    try {
      const module = await import(value.path);
      canvasManager.registerModule(new module.default());
    } catch (error) {
      console.error(`Failed to load canvas module: ${key}`, error);
    }
  }

  populateCanvasStyleDropdown(
    canvasStyleDropdown,
    canvas,
    canvasContainer,
    zoomDisplay,
  );

  // Set up export and import functionality
  setupExportImport(menu, canvas);

  // Initialize with default canvas
  canvasManager.setCurrentModule(config.defaultCanvasType);
  canvasManager.renderCurrentModule(canvas);

  setupCanvasEvents(canvas);
  setupDocumentEvents();
  setupZoomAndPan(canvasContainer, canvas, zoomDisplay);

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
}

function populateCanvasStyleDropdown(
  dropdown,
  canvas,
  canvasContainer,
  zoomDisplay,
) {
  canvasManager.getAvailableModules().forEach((moduleName) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.textContent = moduleName;
    button.addEventListener('click', () => {
      console.log('Switching canvas. Current zoom level:', getZoomLevel());
      resetZoomLevel();
      canvasManager.setCurrentModule(moduleName);
      canvasManager.renderCurrentModule(canvas);
      setupZoomAndPan(canvasContainer, canvas, zoomDisplay);
      console.log('Canvas switched. New zoom level:', getZoomLevel());
    });
    li.appendChild(button);
    dropdown.appendChild(li);
  });
}

function setupExportImport(menu, canvas) {
  menu.addEventListener('click', (event) => {
    if (event.target.id === 'export-button') {
      handleExport();
    } else if (event.target.id === 'import-button') {
      handleImport(canvas);
    }
  });
}

function handleExport() {
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
}

function handleImport(canvas) {
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
        alert("Error importing file. Please make sure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

document.addEventListener('DOMContentLoaded', initializeApp);
