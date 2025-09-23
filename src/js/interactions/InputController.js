// src/js/interactions/InputController.js

import { connectionManager } from '../features/connection/connectionManager.js';

/**
 * Central controller for input adapters
 * Handles capability detection, dynamic adapter loading, and adapter lifecycle
 */
export class InputController {
  constructor(eventBus, capabilityDetector, interactionController) {
    this.eventBus = eventBus;
    this.capabilityDetector = capabilityDetector;
    this.interactionController = interactionController;
    this.currentAdapter = null;
    this.currentMode = null;
    this.adapterCache = new Map(); // Cache loaded adapters for performance
  }

  /**
   * Initialize the input controller with optimal adapter
   */
  async initialize() {
    console.log('🚀 InputController: initialize() called - DIAGNOSTIC');
    console.log(
      '🔍 InputController: capabilityDetector available:',
      !!this.capabilityDetector,
    );

    const optimalMode = this.capabilityDetector.getOptimalInputMode();
    console.log('🎯 InputController: optimalMode detected:', optimalMode);

    await this.switchToMode(optimalMode);
    console.log('✅ InputController: switched to mode:', optimalMode);
  }

  /**
   * Switch to a different input mode
   * @param {string} mode - Input mode ('desktop', 'touch')
   */
  async switchToMode(mode) {
    // Validate mode
    if (!this._isValidMode(mode)) {
      throw new Error(`Unsupported input mode: ${mode}`);
    }

    // Skip if already in this mode
    if (this.currentMode === mode && this.currentAdapter) {
      return;
    }

    const previousMode = this.currentMode;

    const oldAdapter = this.currentAdapter;

    try {
      // Load new adapter first
      const newAdapter = await this._loadAdapter(mode);

      // Initialize new adapter
      try {
        await newAdapter.initialize(this.eventBus);
      } catch (initError) {
        throw new Error(
          `Failed to initialize ${mode} adapter: ${initError.message}`,
        );
      }

      // Initialize connection drawing system (required for ghost connector interactions)
      const canvas = document.getElementById('canvas');
      if (canvas) {
        connectionManager.initializeSVGContainer(canvas);
      }

      // Only destroy old adapter after new one is successfully initialized
      if (oldAdapter) {
        await oldAdapter.destroy();
      }

      // Update state
      this.currentAdapter = newAdapter;
      this.currentMode = mode;

      // Emit mode change event
      this.eventBus.emit('input.modeChanged', {
        from: previousMode,
        to: mode,
        timestamp: Date.now(),
      });

      // Emit adapter loaded event
      this.eventBus.emit('input.adapterLoaded', {
        mode,
        adapter: newAdapter,
      });
    } catch (error) {
      // Re-throw if it's already a formatted error from adapter init
      if (error.message.includes('Failed to initialize')) {
        throw error;
      }
      throw new Error(`Failed to switch to ${mode} mode: ${error.message}`);
    }
  }

  /**
   * Handle events from adapters
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   */
  handleAdapterEvent(eventType, eventData) {
    this.eventBus.emit(eventType, eventData);
  }

  /**
   * Get current mode information
   * @returns {Object} Current mode info
   */
  getCurrentModeInfo() {
    return {
      mode: this.currentMode,
      adapter: this.currentAdapter,
      capabilities: this.capabilityDetector.getCapabilities(),
    };
  }

  /**
   * Get available input modes for this device
   * @returns {Array} Array of available modes
   */
  getAvailableModes() {
    const capabilities = this.capabilityDetector.getCapabilities();
    return capabilities.supportedModes;
  }

  /**
   * Load adapter for specified mode
   * @private
   * @param {string} mode - Mode to load adapter for
   * @returns {Object} Loaded adapter instance
   */
  async _loadAdapter(mode) {
    // Check cache first
    if (this.adapterCache.has(mode)) {
      return this.adapterCache.get(mode);
    }

    try {
      // Dynamic import based on mode
      const adapterModule = await this._importAdapter(mode);
      const AdapterClass = this._getAdapterClass(adapterModule, mode);
      const adapter = new AdapterClass(this.interactionController);

      // Cache the adapter
      this.adapterCache.set(mode, adapter);

      return adapter;
    } catch (error) {
      throw new Error(`Failed to load ${mode} adapter: ${error.message}`);
    }
  }

  /**
   * Dynamic import for adapter modules
   * @private
   * @param {string} mode - Mode to import
   * @returns {Object} Imported module
   */
  async _importAdapter(mode) {
    switch (mode) {
      case 'desktop':
        return await import('./adapters/DesktopAdapter.js');
      case 'touch':
        return await import('./adapters/TouchAdapter.js');
      default:
        throw new Error(`Unknown adapter mode: ${mode}`);
    }
  }

  /**
   * Extract adapter class from module
   * @private
   * @param {Object} module - Imported module
   * @param {string} mode - Mode name for error reporting
   * @returns {Function} Adapter constructor
   */
  _getAdapterClass(module, mode) {
    const expectedClassName =
      mode.charAt(0).toUpperCase() + mode.slice(1) + 'Adapter';
    // Safe: expectedClassName is constructed from validated mode input
    // eslint-disable-next-line security/detect-object-injection
    const AdapterClass = module[expectedClassName];

    if (!AdapterClass) {
      throw new Error(
        `${expectedClassName} not found in ${mode} adapter module`,
      );
    }

    return AdapterClass;
  }

  /**
   * Validate input mode
   * @private
   * @param {string} mode - Mode to validate
   * @returns {boolean} True if valid
   */
  _isValidMode(mode) {
    return ['desktop', 'touch'].includes(mode);
  }
}
