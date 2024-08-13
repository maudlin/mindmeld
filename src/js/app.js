// app.js
import { log } from './utils/utils.js';
log('app.js loaded');
import { setupCanvasEvents, setupDocumentEvents } from './core/event.js';
import { exportToJSON, importFromJSON } from './data/dataStore.js';
import { setupZoomAndPan, setFixedZoom } from './features/zoom/zoomManager.js';
import { DOM_SELECTORS } from './core/constants.js';
import { canvasManager } from './core/canvasManager.js';
import config from './core/config.js';
import {
  loadStateFromStorage,
  saveStateToStorage,
  initializeStateManagement,
  shouldRestoreState,
  clearAllState,
} from './data/storageManager.js';

async function initializeApp() {
  log('Initializing app...');
  const elements = {
    canvasContainer: document.getElementById('canvas-container'),
    svgContainer: document.getElementById('svg-container'),
    canvas: document.querySelector(DOM_SELECTORS.CANVAS),
    zoomDisplay: document.getElementById('zoom-display'),
    canvasStyleDropdown: document.getElementById('canvas-style-dropdown'),
    menu: document.getElementById('menu'),
  };

  await canvasManager.loadModules();
  setupUI(elements);
  initializeCanvas(elements);
  setupEventListeners(elements);

  loadStateFromStorage(elements.canvas);

  if (shouldRestoreState()) {
    loadStateFromStorage();
  }

  initializeStateManagement();

  window.addEventListener('beforeunload', saveStateToStorage);
}

function setupUI(elements) {
  populateCanvasStyleDropdown(elements);
  setupExportImport(elements.menu, elements.canvas);
  setupClearCanvas(elements.menu, elements.canvas);
}

function initializeCanvas(elements) {
  log('Initializing canvas...');
  const initialModule = canvasManager.setCurrentModule(
    config.defaultCanvasType,
  );
  if (initialModule) {
    log(`Initial module set: ${initialModule.name}`);
    canvasManager.switchBackgroundLayout(initialModule.name, elements.canvas);
    setupZoomAndPan(
      elements.canvasContainer,
      elements.canvas,
      elements.zoomDisplay,
    );
  } else {
    log('Failed to initialize canvas. No default module found.');
  }
}

function setupEventListeners(elements) {
  setupCanvasEvents(elements.canvas);
  setupDocumentEvents();
  document.addEventListener('contextmenu', (event) => event.preventDefault());
}

function populateCanvasStyleDropdown(elements) {
  canvasManager.getAvailableModules().forEach((moduleName) => {
    const button = createDropdownButton(moduleName, () =>
      switchCanvas(moduleName, elements),
    );
    elements.canvasStyleDropdown.appendChild(button);
  });
}

function createDropdownButton(text, onClick) {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  li.appendChild(button);
  return li;
}

function switchCanvas(moduleName, elements) {
  log('Switching to canvas:', moduleName);
  try {
    canvasManager.switchBackgroundLayout(moduleName, elements.canvas);

    // Update canvas dimensions if necessary
    const currentModule = canvasManager.getCurrentModule();
    if (currentModule) {
      elements.canvas.style.width = `${currentModule.width}px`;
      elements.canvas.style.height = `${currentModule.height}px`;
    }

    // Handle zoom and pan
    const centerX = elements.canvas.clientWidth / 2;
    const centerY = elements.canvas.clientHeight / 2;
    setFixedZoom(1, elements.canvas, elements.zoomDisplay, centerX, centerY);
    setupZoomAndPan(
      elements.canvasContainer,
      elements.canvas,
      elements.zoomDisplay,
    );
  } catch (error) {
    error(`Error switching to canvas ${moduleName}:`, error);
    alert(`Failed to switch to ${moduleName}. Please try again.`);
  }
}

function handleExportToFile() {
  const json = exportToJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mindmap_export.json';
  a.click();
  URL.revokeObjectURL(url);
}

function handleImportFromFile(canvas) {
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

function handleExportToClipboard() {
  const json = exportToJSON();
  navigator.clipboard.writeText(json).then(
    () => {
      alert('Mind map data copied to clipboard');
    },
    (err) => {
      console.error('Failed to copy to clipboard', err);
      alert('Failed to copy to clipboard');
    }
  );
}

function handleImportFromClipboard(canvas) {
  navigator.clipboard.readText().then(
    (text) => {
      try {
        importFromJSON(text, canvas);
        alert('Mind map imported from clipboard');
      } catch (error) {
        console.error('Error importing from clipboard:', error);
        alert("Error importing from clipboard. Please make sure it's valid JSON data.");
      }
    },
    (err) => {
      console.error('Failed to read from clipboard', err);
      alert('Failed to read from clipboard');
    }
  );
}

function setupImportExport(menu, canvas) {
  menu.addEventListener('click', (event) => {
    switch (event.target.id) {
      case 'export-to-file-button':
        handleExportToFile();
        break;
      case 'import-from-file-button':
        handleImportFromFile(canvas);
        break;
      case 'export-to-clipboard-button':
        handleExportToClipboard();
        break;
      case 'import-from-clipboard-button':
        handleImportFromClipboard(canvas);
        break;
    }
  });
}

function setupClearCanvas(menu, canvas) {
  menu.addEventListener('click', (event) => {
    if (event.target.id === 'clear-canvas-button') handleClearCanvas();
  });
}

function handleClearCanvas() {
  if (
    confirm(
      'Are you sure you want to clear all data? This action cannot be undone.',
    )
  ) {
    clearAllState();
  }
}

document.addEventListener('DOMContentLoaded', initializeApp);
