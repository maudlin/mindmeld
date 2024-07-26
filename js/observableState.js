// observableState.js

class ObservableState {
  constructor(initialState = {}) {
    this.state = initialState;
    this.observers = new Set();
  }

  subscribe(observer) {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyObservers();
  }

  getState() {
    return this.state;
  }

  notifyObservers() {
    this.observers.forEach((observer) => observer(this.state));
  }
}

export const appState = new ObservableState({
  notes: [],
  connections: [],
  zoomLevel: 5,
});
