// src/js/interactions/adapters/BaseAdapter.js

/**
 * Base class for input adapters that standardizes interaction handling
 * All adapters (desktop, touch) extend this class
 */
export class BaseAdapter {
  constructor() {
    this.eventBus = null;
    this.isInitialized = false;
    this.name = null; // Must be set by subclass
  }

  /**
   * Initialize the adapter with event bus
   * @param {Object} eventBus - Event bus instance for communication
   */
  async init(eventBus) {
    if (this.isInitialized) {
      throw new Error('Adapter is already initialized');
    }

    if (!eventBus) {
      throw new Error('EventBus is required for adapter initialization');
    }

    try {
      this.eventBus = eventBus;

      // Initialize event listeners (must be implemented by subclass)
      await this.initializeEventListeners();

      this.isInitialized = true;

      // Call lifecycle hook
      if (this.onInitialized) {
        await this.onInitialized();
      }
    } catch (error) {
      // Cleanup on failure
      this.eventBus = null;
      this.isInitialized = false;
      throw new Error(
        `Failed to initialize ${this.getName()} adapter: ${error.message}`,
      );
    }
  }

  /**
   * Destroy the adapter and clean up resources
   */
  async destroy() {
    if (!this.isInitialized) {
      return; // Already destroyed or never initialized
    }

    try {
      // Cleanup event listeners (must be implemented by subclass)
      await this.destroyEventListeners();

      // Call lifecycle hook
      if (this.onDestroyed) {
        await this.onDestroyed();
      }
    } catch (error) {
      throw new Error(
        `Failed to destroy ${this.getName()} adapter: ${error.message}`,
      );
    } finally {
      // Always cleanup state even if destroy fails
      this.isInitialized = false;
      this.eventBus = null;
    }
  }

  /**
   * Emit an event through the event bus with adapter metadata
   * @param {string} eventType - Type of event to emit
   * @param {Object} eventData - Data to send with the event
   */
  emit(eventType, eventData = {}) {
    if (!this.isInitialized) {
      throw new Error('Cannot emit events before adapter initialization');
    }

    // Add adapter metadata to the event
    const enrichedData = {
      ...eventData,
      _adapter: this.getName(),
      _timestamp: Date.now(),
    };

    this.eventBus.emit(eventType, enrichedData);
  }

  /**
   * Get the adapter name
   * @returns {string} Adapter name
   */
  getName() {
    if (!this.name) {
      throw new Error('Adapter name must be defined');
    }
    return this.name;
  }

  /**
   * Get current adapter state
   * @returns {Object} State information
   */
  getState() {
    return {
      name: this.name,
      isInitialized: this.isInitialized,
      hasEventBus: !!this.eventBus,
    };
  }

  /**
   * Abstract method: Initialize event listeners
   * Must be implemented by subclass
   */
  async initializeEventListeners() {
    throw new Error('initializeEventListeners must be implemented by subclass');
  }

  /**
   * Abstract method: Destroy event listeners
   * Must be implemented by subclass
   */
  async destroyEventListeners() {
    throw new Error('destroyEventListeners must be implemented by subclass');
  }

  /**
   * Optional lifecycle hook called after successful initialization
   */
  async onInitialized() {
    // Override in subclass if needed
  }

  /**
   * Optional lifecycle hook called during destruction
   */
  async onDestroyed() {
    // Override in subclass if needed
  }
}
