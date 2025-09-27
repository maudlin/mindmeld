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
import { CanvasBehavior } from './behaviors/CanvasBehavior.js';
import { ConnectionBehavior } from './behaviors/ConnectionBehavior.js';
import { ViewportBehavior } from './behaviors/ViewportBehavior.js';
import { MenuBehavior } from './behaviors/MenuBehavior.js';
import { NavbarBehavior } from './behaviors/NavbarBehavior.js';
import { ToolbarBehavior } from './behaviors/ToolbarBehavior.js';
import { ServerConnectionBehavior } from '../features/serverConnection/serverConnectionBehavior.js';
import { MapSelectionBehavior } from '../features/mapSelection/mapSelectionBehavior.js';
import { logger } from '../services/logger.js';

export class InteractionController {
  constructor() {
    this.eventBus = null;
    this.isInitialized = false;

    // Behavior registry
    this.behaviors = new Map();

    // Active interaction state
    this.activeInteraction = null; // 'drag', 'selection', 'edit', etc.
    this.activeBehavior = null;

    logger.debug('InteractionController created');
  }

  /**
   * Initialize the controller with event bus and behaviors
   */
  async initialize(eventBusInstance) {
    if (this.isInitialized) {
      logger.warn('Already initialized');
      return;
    }

    this.eventBus = eventBusInstance || eventBus;

    // Initialize behaviors (will be implemented in next phase)
    await this.initializeBehaviors();

    // Set up cross-behavior coordination
    this.setupCoordination();

    this.isInitialized = true;
    logger.info(
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
      const canvasBehavior = new CanvasBehavior(this.eventBus);
      const connectionBehavior = new ConnectionBehavior(this.eventBus);
      const viewportBehavior = new ViewportBehavior(this.eventBus);
      const menuBehavior = new MenuBehavior(this.eventBus);
      const navbarBehavior = new NavbarBehavior(this.eventBus);
      const toolbarBehavior = new ToolbarBehavior(this.eventBus);
      const serverConnectionBehavior = new ServerConnectionBehavior(
        this.eventBus,
      );
      const mapSelectionBehavior = new MapSelectionBehavior(this);

      // Register behaviors
      this.registerBehavior('note', noteBehavior);
      this.registerBehavior('drag', dragBehavior);
      this.registerBehavior('selectionBox', selectionBoxBehavior);
      this.registerBehavior('canvas', canvasBehavior);
      this.registerBehavior('connection', connectionBehavior);
      this.registerBehavior('viewport', viewportBehavior);
      this.registerBehavior('menu', menuBehavior);
      this.registerBehavior('navbar', navbarBehavior);
      this.registerBehavior('toolbar', toolbarBehavior);
      this.registerBehavior('serverConnection', serverConnectionBehavior);
      this.registerBehavior('mapSelection', mapSelectionBehavior);

      // Initialize all behaviors
      await noteBehavior.initialize();
      logger.info('InteractionController: NoteBehavior initialized');

      await dragBehavior.initialize();
      logger.info('InteractionController: DragBehavior initialized');

      await selectionBoxBehavior.initialize();
      logger.info('InteractionController: SelectionBoxBehavior initialized');

      await canvasBehavior.initialize();
      logger.info('InteractionController: CanvasBehavior initialized');

      await connectionBehavior.initialize();
      logger.info('InteractionController: ConnectionBehavior initialized');

      await toolbarBehavior.initialize();
      logger.info('InteractionController: ToolbarBehavior initialized');

      await serverConnectionBehavior.initialize();
      logger.info(
        'InteractionController: ServerConnectionBehavior initialized',
      );

      // MapSelectionBehavior can initialize immediately - sets up DOM event listeners
      await mapSelectionBehavior.initialize();
      logger.info('InteractionController: MapSelectionBehavior initialized');

      // MenuBehavior will be initialized later when DOM elements are available
      logger.info(
        'InteractionController: MenuBehavior created, will initialize later',
      );

      // ViewportBehavior needs canvas and zoomDisplay - will be initialized later during bootstrap
      logger.info(
        'InteractionController: ViewportBehavior registered (will initialize with canvas)',
      );

      logger.info('InteractionController: All behaviors initialized');
    } catch (error) {
      logger.error(
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
      logger.warn(
        `InteractionController: Behavior '${name}' already registered, replacing`,
      );
    }

    this.behaviors.set(name, behaviorInstance);
    logger.info(`InteractionController: Registered behavior '${name}'`);
  }

  /**
   * Get a behavior by name
   */
  getBehavior(name) {
    return this.behaviors.get(name);
  }

  /**
   * Initialize MenuBehavior with canvas reference
   * Called after canvas is available during bootstrap
   */
  async initializeMenuBehavior(canvas) {
    const menuBehavior = this.getBehavior('menu');
    if (menuBehavior) {
      menuBehavior.canvas = canvas;
      menuBehavior.interactionController = this; // Provide access to other behaviors
      canvas.menuBehavior = menuBehavior; // Allow tests to access MenuBehavior from canvas
      canvas.interactionController = this; // Allow MenuBehavior to access other behaviors
      await menuBehavior.initialize(); // Initialize now that DOM elements are available
      logger.info(
        'InteractionController: MenuBehavior initialized with canvas and DOM elements',
      );
    } else {
      logger.warn(
        'InteractionController: MenuBehavior not found for canvas initialization',
      );
    }
  }

  /**
   * Initialize NavbarBehavior for map title editing and collaboration
   * Called after DOM elements are available during bootstrap
   */
  async initializeNavbarBehavior() {
    const navbarBehavior = this.getBehavior('navbar');
    if (navbarBehavior) {
      await navbarBehavior.initialize(); // Initialize now that DOM elements are available
      logger.info(
        'InteractionController: NavbarBehavior initialized with DOM elements',
      );
    } else {
      logger.warn(
        'InteractionController: NavbarBehavior not found for initialization',
      );
    }
  }

  /**
   * Initialize MapSelectionBehavior after DOM elements are available
   * Called after DOM is ready during bootstrap
   */
  async initializeMapSelectionBehavior() {
    const mapSelectionBehavior = this.getBehavior('mapSelection');
    if (mapSelectionBehavior) {
      await mapSelectionBehavior.initialize(); // Initialize now that DOM elements are available
      logger.info(
        'InteractionController: MapSelectionBehavior initialized with DOM elements',
      );
    } else {
      logger.warn(
        'InteractionController: MapSelectionBehavior not found for initialization',
      );
    }
  }

  /**
   * Initialize ViewportBehavior with canvas references
   * Called after canvas is available during bootstrap
   */
  async initializeViewportBehavior(canvas, zoomDisplay) {
    const viewportBehavior = this.getBehavior('viewport');
    if (viewportBehavior) {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      // Set global reference for legacy services
      const { setViewportBehavior } = await import(
        '../features/zoom/viewportAdapter.js'
      );
      setViewportBehavior(viewportBehavior);

      logger.info(
        'InteractionController: ViewportBehavior initialized with canvas',
      );
    } else {
      logger.warn(
        'InteractionController: ViewportBehavior not found for initialization',
      );
    }
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

    logger.info('InteractionController: Cross-behavior coordination set up');
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

    logger.info(`InteractionController: Started '${type}' interaction`);
  }

  /**
   * Handle end of an interaction
   */
  handleInteractionEnd(data) {
    const { type } = data;

    if (this.activeInteraction === type) {
      this.activeInteraction = null;
      this.activeBehavior = null;

      logger.info(`InteractionController: Ended '${type}' interaction`);
    }
  }

  /**
   * Cancel the currently active interaction
   */
  cancelActiveInteraction() {
    if (this.activeInteraction && this.activeBehavior) {
      logger.info(
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
  async cleanup() {
    await this.destroy();
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
          logger.info(`InteractionController: Destroyed behavior '${name}'`);
        } catch (error) {
          logger.error(
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

    logger.info('InteractionController: Destroyed');
  }
}

// Export singleton instance
export const interactionController = new InteractionController();
export default interactionController;
