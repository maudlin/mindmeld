/**
 * Interaction Bootstrap Module
 *
 * Initializes the interaction layer: input controllers, event handling, and gesture recognition.
 * Depends on UIBootstrap for canvas elements being available.
 */

import { BaseBootstrap } from './BaseBootstrap.js';
import { InputController } from '../../interactions/InputController.js';
import { CapabilityDetector } from '../../interactions/capabilities/detector.js';
import { setupCanvasEvents, setupDocumentEvents } from '../event.js';
import { eventBus } from '../eventBus.js';
import { log } from '../../utils/utils.js';

export class InteractionBootstrap extends BaseBootstrap {
  constructor() {
    super('InteractionBootstrap');
    this.inputController = null;
    this.usingLegacyEvents = false;
  }

  async initialize(elements) {
    // Initialize modern input system with graceful fallback
    const inputSystemReady = await this.initializeInputSystem();

    // Set up additional event handling
    this.setupContextMenuPrevention();

    // Set up fallback system if needed
    if (!inputSystemReady) {
      await this.initializeLegacyEventSystem(elements);
    }

    return {
      inputSystemReady,
      legacyFallbackActive: this.usingLegacyEvents,
      contextMenuPrevented: true,
    };
  }

  async initializeInputSystem() {
    try {
      const capabilityDetector = new CapabilityDetector();
      this.inputController = new InputController(eventBus, capabilityDetector);

      await this.inputController.initialize();

      log('InteractionBootstrap: Modern input system initialized successfully');
      return true;
    } catch (error) {
      console.error(
        'InteractionBootstrap: Failed to initialize modern input system, will use legacy fallback:',
        error,
      );
      return false;
    }
  }

  async initializeLegacyEventSystem(elements) {
    try {
      if (!elements.canvas) {
        throw new Error('Canvas element required for legacy event system');
      }

      setupCanvasEvents(elements.canvas);
      setupDocumentEvents();

      this.usingLegacyEvents = true;
      log('InteractionBootstrap: Legacy event system initialized as fallback');
    } catch (error) {
      throw new Error(
        `Legacy event system initialization failed: ${error.message}`,
      );
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
