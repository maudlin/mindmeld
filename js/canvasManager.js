// canvasManager.js

import { CANVAS_DIMENSIONS } from './constants.js';
import { CanvasModule } from './canvasModule.js';

class StandardCanvas extends CanvasModule {
  constructor() {
    super('Standard Canvas', CANVAS_DIMENSIONS.WIDTH, CANVAS_DIMENSIONS.HEIGHT);
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
  }

  registerModule(module) {
    if (!(module instanceof CanvasModule)) {
      throw new TypeError('Module must be an instance of CanvasModule');
    }
    this.modules.set(module.name, module);
  }

  setCurrentModule(moduleName) {
    if (!this.modules.has(moduleName)) {
      throw new Error(`Canvas module "${moduleName}" not found`);
    }
    this.currentModule = this.modules.get(moduleName);
  }

  renderCurrentModule(canvas) {
    if (!this.currentModule) {
      throw new Error('No canvas module selected');
    }
    this.currentModule.render(canvas);
  }

  getAvailableModules() {
    return Array.from(this.modules.keys());
  }
}

export const canvasManager = new CanvasManager();
canvasManager.registerModule(new StandardCanvas());
