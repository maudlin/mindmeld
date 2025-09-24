/**
 * UI Bootstrap Module
 *
 * Initializes the user interface layer: canvas management, UI setup, and visual components.
 * Depends on ServiceBootstrap for business logic services being available.
 */

import { BaseBootstrap } from './BaseBootstrap.js';
import { canvasManager } from '../canvasManager.js';
import { setupUI } from '../uiSetup.js';
import { initializeCanvas } from '../canvasInitialization.js';
import { DOM_SELECTORS } from '../constants.js';
import { CanvasStateService } from '../../services/canvasStateService.js';
import { AdaptiveHelp } from '../../accessibility/adaptiveHelp.js';
import { logger } from '../../services/logger.js';

export class UIBootstrap extends BaseBootstrap {
  constructor() {
    super('UIBootstrap');
    this.adaptiveHelp = null;
  }

  async initialize() {
    // Get required DOM elements
    const elements = this.getDOMElements();

    // Initialize UI systems in correct order
    await this.initializeCanvasSystem();
    await this.setupUserInterface(elements);
    await this.initializeCanvasView(elements);
    await this.setupAccessibilityFeatures();

    return {
      elements,
      canvasSystemReady: true,
      userInterfaceReady: true,
      canvasViewReady: true,
      accessibilityReady: true,
    };
  }

  getDOMElements() {
    const elements = {
      canvasContainer: document.getElementById('canvas-container'),
      svgContainer: document.getElementById('svg-container'),
      canvas: document.querySelector(DOM_SELECTORS.CANVAS),
      zoomDisplay: document.getElementById('zoom-display'),
      canvasStyleDropdown: document.getElementById('canvas-style-dropdown'),
      menu: document.getElementById('menu'),
    };

    // Verify critical elements exist
    if (!elements.canvas) {
      throw new Error('Canvas element not found - check DOM structure');
    }

    return elements;
  }

  async initializeCanvasSystem() {
    try {
      await canvasManager.loadModules();
      logger.info('UIBootstrap: Canvas management system ready');
    } catch (error) {
      throw new Error(`Canvas system initialization failed: ${error.message}`);
    }
  }

  async setupUserInterface(elements) {
    try {
      setupUI(elements);
      logger.info('UIBootstrap: User interface setup completed');
    } catch (error) {
      throw new Error(`UI setup failed: ${error.message}`);
    }
  }

  async initializeCanvasView(elements) {
    try {
      // Await initial canvas setup to prevent race conditions during template switching
      await initializeCanvas(elements);

      // Restore canvas type state after canvas is available
      await CanvasStateService.restoreCanvasType(elements.canvas);

      logger.info('UIBootstrap: Canvas view initialized');
    } catch (error) {
      throw new Error(`Canvas initialization failed: ${error.message}`);
    }
  }

  async setupAccessibilityFeatures() {
    try {
      this.adaptiveHelp = new AdaptiveHelp();
      this.adaptiveHelp.initialize();
      logger.info('UIBootstrap: Adaptive accessibility features initialized');
    } catch (error) {
      throw new Error(`Accessibility setup failed: ${error.message}`);
    }
  }

  async cleanup() {
    await super.cleanup();
    this.adaptiveHelp = null;
    logger.info('UIBootstrap: UI components cleaned up');
  }
}
