// observableState.js
import { STORAGE_KEY } from '../core/constants.js';

// Separate debounce delay for state saving (much shorter than backup interval)
const SAVE_DEBOUNCE_DELAY = 300; // 300ms debounce for responsive saving

class ObservableState {
  constructor(initialState = {}) {
    this.state = initialState;
    this.observers = new Set();
    this.saveTimeout = null;
  }

  subscribe(observer) {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  setState(newState, silent = false) {
    this.state = { ...this.state, ...newState };
    this.notifyObservers();
    if (!silent) {
      this.debouncedSave();
    }
  }

  getState() {
    return this.state;
  }

  notifyObservers() {
    this.observers.forEach((observer) => observer(this.state));
  }

  debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToLocalStorage();
    }, SAVE_DEBOUNCE_DELAY);
  }

  saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  loadFromLocalStorage() {
    const storedState = localStorage.getItem(STORAGE_KEY);
    if (storedState) {
      const parsedState = JSON.parse(storedState);

      // Ensure colorState exists for backward compatibility
      if (!parsedState.colorState) {
        parsedState.colorState = {
          currentColor: 'yellow',
          notes: {},
        };
      }

      // Validate currentColor and fall back to default if invalid
      const validColors = ['yellow', 'pink', 'green', 'blue'];
      if (
        parsedState.colorState.currentColor &&
        !validColors.includes(parsedState.colorState.currentColor)
      ) {
        parsedState.colorState.currentColor = 'yellow';
      }

      // Ensure canvasType exists for backward compatibility
      if (!parsedState.canvasType) {
        parsedState.canvasType = 'Standard Canvas';
      }

      this.state = parsedState;
      return true;
    }
    return false;
  }

  clearLocalStorage() {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const appState = new ObservableState({
  notes: [],
  connections: [],
  zoomLevel: 5,
  canvasType: 'Standard Canvas', // Canvas template/type selection
  colorState: {
    currentColor: 'yellow', // Global state for new notes
    notes: {}, // Individual note colors: { noteId: { colorScheme: 'blue' } }
  },
});

// Debug: expose appState globally for testing
if (typeof window !== 'undefined') {
  window.appStateDebug = appState;
}
