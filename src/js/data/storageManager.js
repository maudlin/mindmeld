// js/data/storageManager.js
// Local Storage Implementation for MindMeld

import { appState } from './data/observableState.js';
import { importFromJSON } from './data/dataStore.js';

const STORAGE_KEY = 'mindmeld_state';

// Save state to localStorage
export function saveStateToStorage() {
  const state = appState.getState();
  const jsonState = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, jsonState);
}

// Load state from localStorage
export function loadStateFromStorage(canvas) {
  const storedState = localStorage.getItem(STORAGE_KEY);
  if (storedState) {
    const state = JSON.parse(storedState);
    importFromJSON(JSON.stringify(state), canvas);
  }
}

// Clear state from localStorage
export function clearStateFromStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

// Auto-save functionality
export function setupAutoSave() {
  const autoSaveInterval = 30000; // Save every 30 seconds
  setInterval(saveStateToStorage, autoSaveInterval);
}

// Event listener for before unload to save state
window.addEventListener('beforeunload', saveStateToStorage);

// Initialize state on page load
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('#canvas');
  loadStateFromStorage(canvas);
  setupAutoSave();
});
