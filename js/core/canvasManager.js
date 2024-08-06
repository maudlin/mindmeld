// canvasManager.js
import config from './config.js';
import { CanvasModule } from './canvasModule.js';

export class CanvasManager {
  constructor() {
    this.modules = new Map();
    this.currentModule = null;
    this.defaultModuleName = config.defaultCanvasType;
    console.log(
      'CanvasManager initialized with default type:',
      this.defaultModuleName,
    );
  }

  async loadModules() {
    console.log('Loading modules...');
    for (const [key, value] of Object.entries(config.canvasTypes)) {
      try {
        console.log(
          `Attempting to load module: ${key} from path: ${value.path}`,
        );
        const module = await import(value.path);
        const instance = new module.default();
        if (instance instanceof CanvasModule) {
          this.registerModule(instance);
          console.log(`Successfully loaded and registered module: ${key}`);
        } else {
          console.error(`Module ${key} is not an instance of CanvasModule`);
        }
      } catch (error) {
        console.error(`Failed to load canvas module: ${key}`, error);
      }
    }
    console.log(
      'Finished loading modules. Available modules:',
      this.getAvailableModules(),
    );
  }

  registerModule(module) {
    if (!(module instanceof CanvasModule)) {
      throw new TypeError('Module must be an instance of CanvasModule');
    }
    this.modules.set(module.name, module);
    console.log(`Registered module: ${module.name}`);
    if (module.name === this.defaultModuleName) {
      this.currentModule = module;
      console.log(`Set default module: ${module.name}`);
    }
  }

  setCurrentModule(moduleName) {
    console.log(`Attempting to set current module to: ${moduleName}`);
    const module = this.modules.get(moduleName);
    if (module) {
      this.currentModule = module;
      console.log(`Successfully set current module to: ${moduleName}`);
    } else {
      console.error(`Module ${moduleName} not found. Falling back to default.`);
      this.currentModule = this.modules.get(this.defaultModuleName);
    }
    return this.currentModule;
  }

  async switchBackgroundLayout(moduleName, canvas) {
    console.log(`Switching background layout to: ${moduleName}`);
    const module = this.setCurrentModule(moduleName);
    if (!module) {
      console.error('Default module not found. Cannot switch background.');
      return;
    }

    // Remove existing background layout
    const existingBackground = canvas.querySelector('.background-layout');
    if (existingBackground) {
      existingBackground.remove();
    }

    // Remove existing module-specific styles
    const existingStyle = document.head.querySelector(`style[id^="style-"]`);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Load and apply new CSS
    const newStyle = await module.loadCSS();
    if (newStyle) {
      document.head.appendChild(newStyle);
    }

    // Create and append new background layout
    const newBackground = module.createBackgroundLayout();
    canvas.insertBefore(newBackground, canvas.firstChild);

    console.log(`Switched to ${moduleName} layout`);
  }

  getCurrentModule() {
    return this.currentModule;
  }

  getAvailableModules() {
    return Array.from(this.modules.keys());
  }
}

export const canvasManager = new CanvasManager();
