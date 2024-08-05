// canvasManager.js

import { CanvasModule } from './canvasModule.js';
import config from './config.js';

// Move StandardCanvas to its own file in the future
class StandardCanvas extends CanvasModule {
  constructor() {
    super('Standard Canvas', config.canvasSize.width, config.canvasSize.height);
  }

  render(canvas) {
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    canvas.style.backgroundImage = 'radial-gradient(#eee 2px, transparent 2px)';
    canvas.style.backgroundSize = '20px 20px';
  }
}

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
      // Here you might want to render a basic error message on the canvas
    }
  }

  getAvailableModules() {
    return Array.from(this.modules.keys());
  }
}

export const canvasManager = new CanvasManager();
canvasManager.registerModule(new StandardCanvas());
