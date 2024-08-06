// canvasManager.js

import { CanvasModule } from './canvasModule.js';
import config from './config.js';

class CanvasManager {
  constructor() {
    this.modules = new Map();
    this.currentModule = null;
    this.defaultModuleName = config.defaultCanvasType;
  }

  registerModule(module) {
    if (!(module instanceof CanvasModule)) {
      throw new TypeError('Module must be an instance of CanvasModule');
    }
    this.modules.set(module.name, module);
    if (module.name === this.defaultModuleName) {
      this.currentModule = module;
    }
  }

  setCurrentModule(moduleName) {
    if (this.modules.has(moduleName)) {
      this.currentModule = this.modules.get(moduleName);
    } else {
      console.error(
        `Canvas module "${moduleName}" not found. Falling back to default.`,
      );
      this.fallbackToDefaultCanvas();
    }
  }

  renderCurrentModule(canvas) {
    if (this.currentModule) {
      try {
        this.currentModule.render(canvas);

        // Ensure canvas dimensions are set
        if (!canvas.width || !canvas.height) {
          canvas.width = this.currentModule.width;
          canvas.height = this.currentModule.height;
        }
        console.log('Canvas rendered:', {
          width: canvas.width,
          height: canvas.height,
        });
      } catch (error) {
        console.error(`Error rendering ${this.currentModule.name}:`, error);
        this.fallbackToDefaultCanvas(canvas);
      }
    } else {
      console.error('No current module set. Falling back to default canvas.');
      this.fallbackToDefaultCanvas(canvas);
    }
  }

  fallbackToDefaultCanvas(canvas) {
    const defaultModule = this.modules.get(this.defaultModuleName);
    if (defaultModule) {
      defaultModule.render(canvas);
    } else {
      console.error(
        'Default canvas module not found. Unable to render any canvas.',
      );
      // Consider rendering a basic error message on the canvas
    }
  }

  getAvailableModules() {
    return Array.from(this.modules.keys());
  }
}

export const canvasManager = new CanvasManager();
