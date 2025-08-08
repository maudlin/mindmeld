// app.js
import { log } from './utils/utils.js';
log('app.js loaded');
import { setupCanvasEvents, setupDocumentEvents } from './core/event.js';
import { DOM_SELECTORS } from './core/constants.js';
import { canvasManager } from './core/canvasManager.js';
import {
  loadStateFromStorage,
  saveStateToStorage,
  initializeStateManagement,
  shouldRestoreState,
} from './data/storageManager.js';
import { setupUI } from './core/uiSetup.js';
import { initializeCanvas } from './core/canvasInitialization.js';
import { ConnectionService } from './services/connectionService.js';
import { connectionManager } from './features/connection/connectionManager.js';
import {
  updateConnectionInDataStore,
  initializeDataStore,
} from './data/dataStore.js';
import { NoteEventService } from './services/noteEventService.js';
import { ColorPickerEvents } from './features/colorPicker/colorPickerEvents.js';
import { NoteColorApplication } from './features/note/noteColorApplication.js';

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

  // Initialize dependency injection and event bus
  initializeDataStore();
  NoteEventService.initialize();
  ColorPickerEvents.initialize();
  NoteColorApplication.initialize();
  ConnectionService.setConnectionManager(connectionManager);
  ConnectionService.setDataStoreUpdateCallback(updateConnectionInDataStore);

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

function setupEventListeners(elements) {
  setupCanvasEvents(elements.canvas);
  setupDocumentEvents();
  document.addEventListener('contextmenu', (event) => event.preventDefault());
}

document.addEventListener('DOMContentLoaded', initializeApp);
