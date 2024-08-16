// js/data/storageManager.js
// Local Storage Implementation for MindMeld

import { appState } from './observableState.js';
import { debounce } from '../utils/utils.js';
import { BACKUP_INTERVAL } from '../core/constants.js';
import {
  updateNotesAndConnections,
  clearAllNotesAndConnections,
  getCurrentState,
} from './dataStore.js';
import { log } from '../utils/utils.js';

// Function to check if we're in a browser environment
const isBrowser =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';

let stateLoaded = false;

// Save state to localStorage
export function saveStateToStorage() {
  const currentState = getCurrentState(); // Get the most up-to-date state
  // log('Saving state:', JSON.stringify(currentState, null, 2));
  appState.setState(currentState, true); // Update appState silently
  appState.saveToLocalStorage();
  // log('State saved to storage');
}

const debouncedSaveState = debounce(saveStateToStorage, 300);

// Load state from localStorage
export function loadStateFromStorage() {
  if (stateLoaded) {
    // log('State already loaded, skipping');
    return false;
  }

  const currentState = appState.getState();
  if (currentState.notes.length > 0 || currentState.connections.length > 0) {
    // log('Current state is not empty, skipping load from storage');
    return false;
  }

  if (appState.loadFromLocalStorage()) {
    const loadedState = appState.getState();
    // log('Loaded state:', JSON.stringify(loadedState, null, 2));
    clearAllNotesAndConnections(); // Clear existing notes and connections before applying loaded state
    updateNotesAndConnections(loadedState);
    stateLoaded = true;
    // log('State loaded from storage and applied');
    verifyLoadedState(loadedState);
    return true;
  }

  log('No state found in storage or failed to load');
  return false;
}

function verifyLoadedState(loadedState) {
  const currentState = getCurrentState();
  // log('Verifying loaded state...');
  // log('Loaded state:', JSON.stringify(loadedState, null, 2));
  // log('Current state after loading:', JSON.stringify(currentState, null, 2));
  if (JSON.stringify(loadedState) !== JSON.stringify(currentState)) {
    console.warn('Loaded state does not match current state after loading!');
  } else {
    log('Loaded state verified successfully');
  }
}

// Clear state from localStorage
export function clearStateFromStorage() {
  appState.clearLocalStorage();
  appState.setState({ notes: [], connections: [], zoomLevel: 5 });
  clearAllNotesAndConnections();
  log('State cleared from storage and reset');
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

  log('State listeners set up');
}

// Initialize state management
export function initializeStateManagement() {
  if (isBrowser) {
    window.addEventListener('beforeunload', saveStateToStorage);
  }
  // Only attempt to load state if it hasn't been loaded before
  // and the current state is empty
  if (!stateLoaded && appState.getState().notes.length === 0) {
    loadStateFromStorage();
  }
  setupStateListeners();
  log('State management initialized');
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
  log('All state cleared, local storage cleared, and UI reset');
}

// Event listener for before unload to save state
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', saveStateToStorage);
}
