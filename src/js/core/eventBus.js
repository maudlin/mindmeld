// eventBus.js - Simple event bus for decoupling components
export class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((cb) => cb !== callback);

    // Clean up empty event arrays to prevent memory leaks
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Event listener error for "${event}":`, error);
      }
    });
  }

  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}

// Global event bus instance
export const eventBus = new EventBus();
