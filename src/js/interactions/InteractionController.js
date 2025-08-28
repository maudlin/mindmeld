/**
 * InteractionController - Central orchestrator for all interaction behaviors
 *
 * Coordinates between adapters (input detection) and behaviors (interaction logic).
 * Single source of truth for interaction state and behavior management.
 */

import { eventBus } from '../core/eventBus.js';
import { NoteBehavior } from './behaviors/NoteBehavior.js';
import { DragBehavior } from './behaviors/DragBehavior.js';
import { SelectionBoxBehavior } from './behaviors/SelectionBoxBehavior.js';

class InteractionController {
  constructor() {
    this.eventBus = null;
    this.isInitialized = false;

    // Behavior registry
    this.behaviors = new Map();

    // Active interaction state
    this.activeInteraction = null; // 'drag', 'selection', 'edit', etc.
    this.activeBehavior = null;

    console.log('InteractionController: Created');
  }

  /**
   * Initialize the controller with event bus and behaviors
   */
  async initialize(eventBusInstance) {
    if (this.isInitialized) {
      console.warn('InteractionController: Already initialized');
      return;
    }

    this.eventBus = eventBusInstance || eventBus;

    // Initialize behaviors (will be implemented in next phase)
    await this.initializeBehaviors();

    // Set up cross-behavior coordination
    this.setupCoordination();

    this.isInitialized = true;
    console.log(
      'InteractionController: Initialized with behaviors:',
      Array.from(this.behaviors.keys()),
    );
  }

  /**
   * Initialize all behavior instances
   */
  async initializeBehaviors() {
    try {
      // Create behavior instances
      const noteBehavior = new NoteBehavior(this.eventBus);
      const dragBehavior = new DragBehavior(this.eventBus);
      const selectionBoxBehavior = new SelectionBoxBehavior(this.eventBus);

      // Register behaviors
      this.registerBehavior('note', noteBehavior);
      this.registerBehavior('drag', dragBehavior);
      this.registerBehavior('selectionBox', selectionBoxBehavior);

      // Initialize all behaviors
      await noteBehavior.initialize();
      await dragBehavior.initialize();
      await selectionBoxBehavior.initialize();

      console.log('InteractionController: All behaviors initialized');
    } catch (error) {
      console.error(
        'InteractionController: Failed to initialize behaviors:',
        error,
      );
      throw error;
    }
  }

  /**
   * Register a behavior with the controller
   */
  registerBehavior(name, behaviorInstance) {
    if (this.behaviors.has(name)) {
      console.warn(
        `InteractionController: Behavior '${name}' already registered, replacing`,
      );
    }

    this.behaviors.set(name, behaviorInstance);
    console.log(`InteractionController: Registered behavior '${name}'`);
  }

  /**
   * Get a behavior by name
   */
  getBehavior(name) {
    return this.behaviors.get(name);
  }

  /**
   * Set up coordination between behaviors
   */
  setupCoordination() {
    // Listen for interaction state changes
    this.eventBus.on('interaction.start', (data) => {
      this.handleInteractionStart(data);
    });

    this.eventBus.on('interaction.end', (data) => {
      this.handleInteractionEnd(data);
    });

    this.eventBus.on('interaction.cancel', () => {
      this.cancelActiveInteraction();
    });

    console.log('InteractionController: Cross-behavior coordination set up');
  }

  /**
   * Handle start of an interaction
   */
  handleInteractionStart(data) {
    const { type, behavior } = data;

    // Cancel any existing interaction
    if (this.activeInteraction) {
      this.cancelActiveInteraction();
    }

    this.activeInteraction = type;
    this.activeBehavior = behavior;

    console.log(`InteractionController: Started '${type}' interaction`);
  }

  /**
   * Handle end of an interaction
   */
  handleInteractionEnd(data) {
    const { type } = data;

    if (this.activeInteraction === type) {
      this.activeInteraction = null;
      this.activeBehavior = null;

      console.log(`InteractionController: Ended '${type}' interaction`);
    }
  }

  /**
   * Cancel the currently active interaction
   */
  cancelActiveInteraction() {
    if (this.activeInteraction && this.activeBehavior) {
      console.log(
        `InteractionController: Cancelling '${this.activeInteraction}' interaction`,
      );

      // Notify the active behavior to clean up
      if (this.activeBehavior.cancel) {
        this.activeBehavior.cancel();
      }

      this.eventBus.emit('interaction.cancelled', {
        type: this.activeInteraction,
      });
    }

    this.activeInteraction = null;
    this.activeBehavior = null;
  }

  /**
   * Get current interaction state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      behaviorCount: this.behaviors.size,
      behaviors: Array.from(this.behaviors.keys()),
      activeInteraction: this.activeInteraction,
      hasActiveBehavior: !!this.activeBehavior,
    };
  }

  /**
   * Clean up controller and behaviors
   */
  async destroy() {
    // Cancel any active interaction
    this.cancelActiveInteraction();

    // Destroy all behaviors
    for (const [name, behavior] of this.behaviors) {
      if (behavior.destroy) {
        try {
          await behavior.destroy();
          console.log(`InteractionController: Destroyed behavior '${name}'`);
        } catch (error) {
          console.error(
            `InteractionController: Failed to destroy behavior '${name}':`,
            error,
          );
        }
      }
    }

    // Clear registry
    this.behaviors.clear();

    // Reset state
    this.isInitialized = false;
    this.eventBus = null;

    console.log('InteractionController: Destroyed');
  }
}

// Export singleton instance
export const interactionController = new InteractionController();
export default interactionController;
