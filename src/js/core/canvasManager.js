// canvasManager.js
import config from './config.js';
import { CanvasModule } from './canvasModule.js';
import { logger } from '../services/logger.js';

export class CanvasManager {
  constructor() {
    this.modules = new Map();
    this.currentModule = null;
    this.defaultModuleName = config.defaultCanvasType;
    logger.info(
      'CanvasManager initialized with default type:',
      this.defaultModuleName,
    );
  }

  async loadModules() {
    logger.info('Loading standard canvas module only (V1 simplification)...');

    try {
      const standardPath =
        '../features/canvas/templates/standardCanvas/standardCanvas.js';
      logger.info(`Loading standard canvas from: ${standardPath}`);

      // eslint-disable-next-line no-unsanitized/method
      const module = await import(standardPath);
      const instance = new module.default();
      if (instance instanceof CanvasModule) {
        this.registerModule(instance);
        logger.info(
          'Successfully loaded and registered standard canvas module',
        );
      } else {
        logger.info(
          'Standard canvas module is not an instance of CanvasModule',
        );
      }
    } catch (error) {
      logger.error('Failed to load standard canvas module:', error);
    }

    logger.info(
      'Finished loading modules. Available modules:',
      this.getAvailableModules(),
    );
  }

  registerModule(module) {
    if (!(module instanceof CanvasModule)) {
      throw new TypeError('Module must be an instance of CanvasModule');
    }
    this.modules.set(module.name, module);
    logger.info(`Registered module: ${module.name}`);
    if (module.name === this.defaultModuleName) {
      this.currentModule = module;
      logger.info(`Set default module: ${module.name}`);
    }
  }

  setCurrentModule(moduleName) {
    logger.info(`Attempting to set current module to: ${moduleName}`);
    const module = this.modules.get(moduleName);
    if (module) {
      this.currentModule = module;
      logger.info(`Successfully set current module to: ${moduleName}`);
    } else {
      logger.info(`Module ${moduleName} not found. Falling back to default.`);
      this.currentModule = this.modules.get(this.defaultModuleName);
    }
    return this.currentModule;
  }

  async switchBackgroundLayout(moduleName, canvas) {
    // V1 Simplification: Only Standard Canvas supported
    logger.info(
      `V1: Using Standard Canvas layout only (ignoring request for: ${moduleName})`,
    );
    const module =
      this.currentModule || this.modules.get(this.defaultModuleName);
    if (!module) {
      logger.info(
        'Standard Canvas module not found. Cannot initialize background.',
      );
      return;
    }

    // Remove existing background layout elements
    const existingBackgrounds = canvas.querySelectorAll('.background-layout');
    if (existingBackgrounds && existingBackgrounds.length > 0) {
      existingBackgrounds.forEach((el) => el.remove());
    }

    // Remove existing module-specific styles
    const existingStyles = document.head.querySelectorAll(
      'style[id^="style-"]',
    );
    if (existingStyles && existingStyles.length > 0) {
      existingStyles.forEach((style) => style.remove());
    }

    // Load Standard Canvas CSS and layout
    const newStyle = await module.loadCSS();
    if (newStyle) {
      document.head.appendChild(newStyle);
    }

    const newBackground = module.createBackgroundLayout();
    canvas.insertBefore(newBackground, canvas.firstChild);

    logger.info(`Applied Standard Canvas layout`);
  }

  getCurrentModule() {
    return this.currentModule;
  }

  getAvailableModules() {
    return Array.from(this.modules.keys());
  }
}

export const canvasManager = new CanvasManager();
