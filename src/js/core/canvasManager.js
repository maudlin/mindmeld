// canvasManager.js
import config from './config.js';
import { CanvasModule } from './canvasModule.js';
import { log } from '../utils/utils.js';
import { logger, errorHandler } from '../services/logger.js';

export class CanvasManager {
  constructor() {
    this.modules = new Map();
    this.currentModule = null;
    this.defaultModuleName = config.defaultCanvasType;
    log('CanvasManager initialized with default type:', this.defaultModuleName);
  }

  async loadModules() {
    log('Loading standard canvas module only (V1 simplification)...');

    try {
      const standardPath =
        '../features/canvas/templates/standardCanvas/standardCanvas.js';
      log(`Loading standard canvas from: ${standardPath}`);

      // eslint-disable-next-line no-unsanitized/method
      const module = await import(standardPath);
      const instance = new module.default();
      if (instance instanceof CanvasModule) {
        this.registerModule(instance);
        log('Successfully loaded and registered standard canvas module');
      } else {
        log('Standard canvas module is not an instance of CanvasModule');
      }
    } catch (error) {
      console.error('Failed to load standard canvas module:', error);
    }

    log(
      'Finished loading modules. Available modules:',
      this.getAvailableModules(),
    );
  }

  registerModule(module) {
    if (!(module instanceof CanvasModule)) {
      throw new TypeError('Module must be an instance of CanvasModule');
    }
    this.modules.set(module.name, module);
    log(`Registered module: ${module.name}`);
    if (module.name === this.defaultModuleName) {
      this.currentModule = module;
      log(`Set default module: ${module.name}`);
    }
  }

  setCurrentModule(moduleName) {
    log(`Attempting to set current module to: ${moduleName}`);
    const module = this.modules.get(moduleName);
    if (module) {
      this.currentModule = module;
      log(`Successfully set current module to: ${moduleName}`);
    } else {
      log(`Module ${moduleName} not found. Falling back to default.`);
      this.currentModule = this.modules.get(this.defaultModuleName);
    }
    return this.currentModule;
  }

  async switchBackgroundLayout(moduleName, canvas) {
    // V1 Simplification: Only Standard Canvas supported
    log(
      `V1: Using Standard Canvas layout only (ignoring request for: ${moduleName})`,
    );
    const module =
      this.currentModule || this.modules.get(this.defaultModuleName);
    if (!module) {
      log('Standard Canvas module not found. Cannot initialize background.');
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

    log(`Applied Standard Canvas layout`);
  }

  getCurrentModule() {
    return this.currentModule;
  }

  getAvailableModules() {
    return Array.from(this.modules.keys());
  }
}

export const canvasManager = new CanvasManager();
