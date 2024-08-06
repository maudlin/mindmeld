import { setupCanvasEvents, setupDocumentEvents } from './core/event.js';
import { exportToJSON, importFromJSON } from './data/dataStore.js';
import {
  setupZoomAndPan,
  getZoomLevel,
  removeZoomAndPan,
  setFixedZoom,
} from './features/zoom/zoomManager.js';
import { DOM_SELECTORS } from './core/constants.js';
import { canvasManager } from './core/canvasManager.js';
import config from './core/config.js';

async function initializeApp() {
  const elements = {
    canvasContainer: document.getElementById('canvas-container'),
    canvas: document.querySelector(DOM_SELECTORS.CANVAS),
    zoomDisplay: document.getElementById('zoom-display'),
    canvasStyleDropdown: document.getElementById('canvas-style-dropdown'),
    menu: document.getElementById('menu'),
  };

  await registerCanvasModules();
  setupUI(elements);
  initializeCanvas(elements);
  setupEventListeners(elements);
}

async function registerCanvasModules() {
  for (const [key, value] of Object.entries(config.canvasTypes)) {
    try {
      const module = await import(value.path);
      canvasManager.registerModule(new module.default());
    } catch (error) {
      console.error(`Failed to load canvas module: ${key}`, error);
    }
  }
}

function setupUI(elements) {
  populateCanvasStyleDropdown(elements);
  setupExportImport(elements.menu, elements.canvas);
}

function initializeCanvas(elements) {
  canvasManager.setCurrentModule(config.defaultCanvasType);
  canvasManager.renderCurrentModule(elements.canvas);
  setupZoomAndPan(
    elements.canvasContainer,
    elements.canvas,
    elements.zoomDisplay,
  );
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
  console.log('Switching canvas. Current zoom level:', getZoomLevel());

  canvasManager.setCurrentModule(moduleName);
  canvasManager.renderCurrentModule(elements.canvas);

  // Use requestAnimationFrame to ensure the canvas is rendered before zooming
  requestAnimationFrame(() => {
    const centerX = elements.canvas.width / 2;
    const centerY = elements.canvas.height / 2;
    console.log('Canvas dimensions:', {
      width: elements.canvas.width,
      height: elements.canvas.height,
    });

    // Remove existing zoom and pan setup
    removeZoomAndPan(elements.canvasContainer);

    setFixedZoom(1, elements.canvas, elements.zoomDisplay, centerX, centerY);
    setupZoomAndPan(
      elements.canvasContainer,
      elements.canvas,
      elements.zoomDisplay,
    );
    console.log('Canvas switched. New zoom level:', getZoomLevel());
  });
}

function setupExportImport(menu, canvas) {
  menu.addEventListener('click', (event) => {
    if (event.target.id === 'export-button') handleExport();
    else if (event.target.id === 'import-button') handleImport(canvas);
  });
}

function handleExport() {
  const json = exportToJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mindmap_export.json';
  a.click();
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
