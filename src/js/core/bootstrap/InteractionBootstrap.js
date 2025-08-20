/**
 * Interaction Bootstrap Module
 *
 * Initializes the interaction layer: input controllers, event handling, and gesture recognition.
 * Depends on UIBootstrap for canvas elements being available.
 */

import { BaseBootstrap } from './BaseBootstrap.js';
import { InputController } from '../../interactions/InputController.js';
import { CapabilityDetector } from '../../interactions/capabilities/detector.js';
import { eventBus } from '../eventBus.js';
import { log } from '../../utils/utils.js';

export class InteractionBootstrap extends BaseBootstrap {
  constructor() {
    super('InteractionBootstrap');
    this.inputController = null;
    this.usingLegacyEvents = false;
  }

  async initialize() {
    // Legacy system removed - elements parameter no longer needed
    // Initialize modern input system with graceful fallback
    const inputSystemReady = await this.initializeInputSystem();

    // Set up additional event handling
    this.setupContextMenuPrevention();

    if (!inputSystemReady) {
      throw new Error(
        'Modern input system failed to initialize - no fallback available',
      );
    }

    return {
      inputSystemReady,
      legacyFallbackActive: this.usingLegacyEvents,
      contextMenuPrevented: true,
    };
  }

  async initializeInputSystem() {
    try {
      console.log('InteractionBootstrap: Starting modern input system initialization');
      
      const capabilityDetector = new CapabilityDetector();
      this.inputController = new InputController(eventBus, capabilityDetector);

      await this.inputController.initialize();

      console.log('InteractionBootstrap: Modern input system initialized successfully');
      log('InteractionBootstrap: Modern input system initialized successfully');
      
      // Global debug flag for E2E tests
      if (typeof window !== 'undefined') {
        window.mindMeldDebug = {
          modernInputSystemReady: true,
          inputController: this.inputController,
          timestamp: Date.now()
        };
      }
      
      return true;
    } catch (error) {
      console.error(
        'InteractionBootstrap: Failed to initialize modern input system:',
        error,
      );
      return false;
    }
  }


  setupContextMenuPrevention() {
    // Prevent context menu across the application
    document.addEventListener('contextmenu', (event) => event.preventDefault());
    log('InteractionBootstrap: Context menu prevention configured');
  }

  async cleanup() {
    await super.cleanup();

    if (this.inputController) {
      // InputController cleanup would go here if it has a cleanup method
      this.inputController = null;
    }

    // Remove context menu prevention
    document.removeEventListener('contextmenu', (event) =>
      event.preventDefault(),
    );

    this.usingLegacyEvents = false;
    log('InteractionBootstrap: Interaction systems cleaned up');
  }
}
