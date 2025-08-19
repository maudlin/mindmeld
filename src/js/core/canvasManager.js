// canvasManager.js
import config from './config.js';
import { CanvasModule } from './canvasModule.js';
import { log } from '../utils/utils.js';

export class CanvasManager {
  constructor() {
    this.modules = new Map();
    this.currentModule = null;
    this.defaultModuleName = config.defaultCanvasType;
    log('CanvasManager initialized with default type:', this.defaultModuleName);
  }

  async loadModules() {
    log('Loading modules...');

    // Security: Allowlist of safe module paths to prevent code injection
    const allowedPaths = [
      '../features/canvas/templates/standardCanvas/standardCanvas.js',
      '../features/canvas/templates/herosJourney/herosJourneyCanvas.js',
      '../features/canvas/templates/nowNextFuture/nowNextFutureCanvas.js',
      '../features/canvas/templates/wardleyMap/wardleyMapCanvas.js',
    ];

    for (const [key, value] of Object.entries(config.canvasTypes)) {
      try {
        log(`Attempting to load module: ${key} from path: ${value.path}`);

        // Security check: Only import from approved paths
        if (!allowedPaths.includes(value.path)) {
          console.error(
            `Security: Attempted to load unauthorized module path: ${value.path}`,
          );
          continue;
        }

        // eslint-disable-next-line no-unsanitized/method
        const module = await import(value.path);
        const instance = new module.default();
        if (instance instanceof CanvasModule) {
          this.registerModule(instance);
          log(`Successfully loaded and registered module: ${key}`);
        } else {
          log(`Module ${key} is not an instance of CanvasModule`);
        }
      } catch (error) {
        error(`Failed to load canvas module: ${key}`, error);
      }
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
    log(`Switching background layout to: ${moduleName}`);
    const module = this.setCurrentModule(moduleName);
    if (!module) {
      log('Default module not found. Cannot switch background.');
      return;
    }

    // Remove ALL existing background layout elements to avoid duplicates
    const existingBackgrounds = canvas.querySelectorAll('.background-layout');
    if (existingBackgrounds && existingBackgrounds.length > 0) {
      existingBackgrounds.forEach((el) => el.remove());
      log(
        `Removed ${existingBackgrounds.length} existing background layout element(s).`,
      );
    }

    // Remove ALL existing module-specific styles (style tags with id starting with "style-")
    const existingStyles = document.head.querySelectorAll(
      'style[id^="style-"]',
    );
    if (existingStyles && existingStyles.length > 0) {
      existingStyles.forEach((style) => style.remove());
      log(`Removed ${existingStyles.length} existing module style tag(s).`);
    }

    // Load and apply new CSS
    const newStyle = await module.loadCSS();
    if (newStyle) {
      document.head.appendChild(newStyle);
    }

    // Create and append new background layout as the first child of the canvas
    const newBackground = module.createBackgroundLayout();
    canvas.insertBefore(newBackground, canvas.firstChild);

    // Safety check in development: ensure only one background-layout exists
    if (process && process.env && process.env.NODE_ENV !== 'production') {
      const count = canvas.querySelectorAll('.background-layout').length;
      if (count !== 1) {
        console.warn(
          `Expected exactly 1 .background-layout after switch, found ${count}`,
        );
      }
    }

    log(`Switched to ${module.name} layout`);
  }

  getCurrentModule() {
    return this.currentModule;
  }

  getAvailableModules() {
    return Array.from(this.modules.keys());
  }
}

export const canvasManager = new CanvasManager();
