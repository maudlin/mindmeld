// observableState.js
import { STORAGE_KEY, BACKUP_INTERVAL } from '../core/constants.js';

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
    }, BACKUP_INTERVAL);
  }

  saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    console.log('State saved to localStorage', this.state);
  }

  loadFromLocalStorage() {
    const storedState = localStorage.getItem(STORAGE_KEY);
    if (storedState) {
      const parsedState = JSON.parse(storedState);
      this.state = parsedState;
      console.log('State loaded from localStorage', parsedState);
      return true;
    }
    console.log('No state found in localStorage');
    return false;
  }

  clearLocalStorage() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Local storage cleared');
  }
}

export const appState = new ObservableState({
  notes: [],
  connections: [],
  zoomLevel: 5,
});
