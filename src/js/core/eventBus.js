import { logger } from '../services/logger.js';
// eventBus.js - Simple event bus for decoupling components
export class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    // eslint-disable-next-line security/detect-object-injection
    if (!this.events[event]) {
      // eslint-disable-next-line security/detect-object-injection
      this.events[event] = [];
    }
    // eslint-disable-next-line security/detect-object-injection
    this.events[event].push(callback);
  }

  off(event, callback) {
    // eslint-disable-next-line security/detect-object-injection
    if (!this.events[event]) return;
    // eslint-disable-next-line security/detect-object-injection
    this.events[event] = this.events[event].filter((cb) => cb !== callback);

    // Clean up empty event arrays to prevent memory leaks
    // eslint-disable-next-line security/detect-object-injection
    if (this.events[event].length === 0) {
      // eslint-disable-next-line security/detect-object-injection
      delete this.events[event];
    }
  }

  emit(event, data) {
    // eslint-disable-next-line security/detect-object-injection
    if (!this.events[event]) return;
    // eslint-disable-next-line security/detect-object-injection
    this.events[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        logger.error(`Event listener error for "${event}":`, error);
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
