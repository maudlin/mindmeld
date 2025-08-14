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
import { log } from '../../utils/utils.js';
import { AdaptiveHelp } from '../../accessibility/adaptiveHelp.js';

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
      log('UIBootstrap: Canvas management system ready');
    } catch (error) {
      throw new Error(`Canvas system initialization failed: ${error.message}`);
    }
  }

  async setupUserInterface(elements) {
    try {
      setupUI(elements);
      log('UIBootstrap: User interface setup completed');
    } catch (error) {
      throw new Error(`UI setup failed: ${error.message}`);
    }
  }

  async initializeCanvasView(elements) {
    try {
      initializeCanvas(elements);
      log('UIBootstrap: Canvas view initialized');
    } catch (error) {
      throw new Error(`Canvas initialization failed: ${error.message}`);
    }
  }

  async setupAccessibilityFeatures() {
    try {
      this.adaptiveHelp = new AdaptiveHelp();
      this.adaptiveHelp.initialize();
      log('UIBootstrap: Adaptive accessibility features initialized');
    } catch (error) {
      throw new Error(`Accessibility setup failed: ${error.message}`);
    }
  }

  async cleanup() {
    await super.cleanup();
    this.adaptiveHelp = null;
    log('UIBootstrap: UI components cleaned up');
  }
}
