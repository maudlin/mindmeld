/**
 * Interaction Bootstrap Module
 *
 * Initializes the interaction layer: input controllers, event handling, and gesture recognition.
 * Depends on UIBootstrap for canvas elements being available.
 */

import { BaseBootstrap } from './BaseBootstrap.js';
import { InputController } from '../../interactions/InputController.js';
import { InteractionController } from '../../interactions/InteractionController.js';
import { CapabilityDetector } from '../../interactions/capabilities/detector.js';
import { editModeController } from '../../features/note/EditModeController.js';
import { eventBus } from '../eventBus.js';
import { log } from '../../utils/utils.js';

export class InteractionBootstrap extends BaseBootstrap {
  constructor() {
    super('InteractionBootstrap');
    this.inputController = null;
    this.interactionController = null;
    this.usingLegacyEvents = false;
  }

  async initialize() {
    // Legacy system removed - elements parameter no longer needed
    // Initialize modern input system with graceful fallback
    const inputSystemReady = await this.initializeInputSystem();

    // Initialize EditModeController for unified edit/view state management
    this.initializeEditModeController();

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
      console.log(
        'InteractionBootstrap: Starting modern input system initialization',
      );

      // Initialize InteractionController for behavior management
      this.interactionController = new InteractionController(eventBus);
      await this.interactionController.initialize();

      const capabilityDetector = new CapabilityDetector();
      this.inputController = new InputController(
        eventBus,
        capabilityDetector,
        this.interactionController,
      );

      await this.inputController.initialize();

      console.log(
        'InteractionBootstrap: Modern input system initialized successfully',
      );
      log('InteractionBootstrap: Modern input system initialized successfully');

      // Global debug flag for E2E tests
      if (typeof window !== 'undefined') {
        window.mindMeldDebug = {
          modernInputSystemReady: true,
          inputController: this.inputController,
          interactionController: this.interactionController,
          timestamp: Date.now(),
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

  initializeEditModeController() {
    try {
      editModeController.initialize();
      log('InteractionBootstrap: EditModeController initialized successfully');
    } catch (error) {
      console.error(
        'InteractionBootstrap: Failed to initialize EditModeController:',
        error,
      );
      // Don't throw error since EditModeController is not critical for basic functionality
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

    if (this.interactionController) {
      await this.interactionController.cleanup();
      this.interactionController = null;
    }

    // Cleanup EditModeController
    try {
      editModeController.cleanup();
      log('InteractionBootstrap: EditModeController cleaned up');
    } catch (error) {
      console.error(
        'InteractionBootstrap: Failed to cleanup EditModeController:',
        error,
      );
    }

    // Remove context menu prevention
    document.removeEventListener('contextmenu', (event) =>
      event.preventDefault(),
    );

    this.usingLegacyEvents = false;
    log('InteractionBootstrap: Interaction systems cleaned up');
  }
}
