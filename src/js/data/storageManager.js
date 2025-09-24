// js/data/storageManager.js
// Local Storage Implementation for MindMeld

import { appState } from './observableState.js';
import { debounce } from '../utils/utils.js';
import { BACKUP_INTERVAL } from '../core/constants.js';
import { eventBus } from '../core/eventBus.js';
import {
  updateNotesAndConnections,
  clearAllNotesAndConnections,
  getCurrentState,
} from './dataStore.js';
import { logger } from '../services/logger.js';
// Function to check if we're in a browser environment
const isBrowser =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';

let stateLoaded = false;

// Save state to localStorage
export function saveStateToStorage() {
  const currentState = getCurrentState(); // Get the most up-to-date state
  // logger.info('Saving state:', JSON.stringify(currentState, null, 2));
  appState.setState(currentState, true); // Update appState silently
  appState.saveToLocalStorage();
  // logger.info('State saved to storage');
}

const debouncedSaveState = debounce(saveStateToStorage, 300);

// Load state from localStorage
export async function loadStateFromStorage() {
  if (stateLoaded) {
    // logger.info('State already loaded, skipping');
    return false;
  }

  const currentState = appState.getState();
  if (currentState.notes.length > 0 || currentState.connections.length > 0) {
    // logger.info('Current state is not empty, skipping load from storage');
    return false;
  }

  // Mute auto-save events during offline state loading to prevent ETag conflicts
  const { ServerClient } = await import('../services/serverClient.js');
  ServerClient.debouncedSave.cancel();
  ServerClient.removeAutoSaveListeners();

  if (appState.loadFromLocalStorage()) {
    const loadedState = appState.getState();
    // logger.info('Loaded state:', JSON.stringify(loadedState, null, 2));

    clearAllNotesAndConnections(); // Clear existing notes and connections before applying loaded state
    updateNotesAndConnections(loadedState);
    stateLoaded = true;

    // Emit notes.loaded event for color application (same as import process)
    eventBus.emit('notes.loaded');
    logger.info('Emitted notes.loaded event for color restoration');

    // logger.info('State loaded from storage and applied');
    verifyLoadedState(loadedState);

    // Re-enable auto-save listeners after offline loading completes
    setTimeout(() => {
      ServerClient.setupAutoSaveListeners();
    }, 100);

    return true;
  }

  // Re-enable auto-save listeners even if no state was loaded
  setTimeout(() => {
    ServerClient.setupAutoSaveListeners();
  }, 100);

  logger.info('No state found in storage or failed to load');
  return false;
}

function verifyLoadedState(loadedState) {
  const currentState = getCurrentState();
  // logger.info('Verifying loaded state...');
  // logger.info('Loaded state:', JSON.stringify(loadedState, null, 2));
  // logger.info('Current state after loading:', JSON.stringify(currentState, null, 2));
  if (JSON.stringify(loadedState) !== JSON.stringify(currentState)) {
    logger.warn('Loaded state does not match current state after loading!');
  } else {
    logger.info('Loaded state verified successfully');
  }
}

// Clear state from localStorage
export function clearStateFromStorage() {
  appState.clearLocalStorage();
  appState.setState({
    notes: [],
    connections: [],
    zoomLevel: 5,
    colorState: {
      currentColor: 'yellow',
      notes: {},
    },
  });
  clearAllNotesAndConnections();
  logger.info('State cleared from storage and reset');
}

// Setup state listeners
export function setupStateListeners() {
  // 1. Note created
  document.addEventListener('noteCreated', saveStateToStorage);

  // 2. Note content changes (debounced)
  document.addEventListener('noteContentChanged', debouncedSaveState);

  // 3 & 6. Note moves (including multiple selections)
  document.addEventListener('noteMoveEnd', saveStateToStorage);

  // 4. Connector added
  document.addEventListener('connectorAdded', saveStateToStorage);

  // 5. Connector removed
  document.addEventListener('connectorRemoved', saveStateToStorage);

  // Backup save
  setInterval(saveStateToStorage, BACKUP_INTERVAL);

  logger.info('State listeners set up');
}

// Initialize state management
export function initializeStateManagement() {
  if (isBrowser) {
    window.addEventListener('beforeunload', saveStateToStorage);
  }

  // Set up event bus listeners
  eventBus.on('state.save', saveStateToStorage);

  // Listen for color change events
  eventBus.on('note.color.changed', saveStateToStorage);
  eventBus.on('note.color.removed', saveStateToStorage);

  // Only attempt to load state if it hasn't been loaded before
  // and the current state is empty
  if (!stateLoaded && appState.getState().notes.length === 0) {
    loadStateFromStorage().catch((error) => {
      logger.error('Error loading state from storage:', error);
    });
  }
  setupStateListeners();
  logger.info('State management initialized');
}

// Function to check if we should restore state (e.g., after a page refresh)
export function shouldRestoreState() {
  return (
    !stateLoaded &&
    appState.getState().notes.length === 0 &&
    appState.hasStoredState()
  );
}

export function clearAllState() {
  clearStateFromStorage();
  logger.info('All state cleared, local storage cleared, and UI reset');
}

// Event listener for before unload to save state
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', saveStateToStorage);
}
