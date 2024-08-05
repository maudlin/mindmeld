// canvasModule.js

export class CanvasModule {
  constructor(name, width, height) {
    this.name = name;
    this.width = width;
    this.height = height;
  }

  render(_canvas) {
    // This method should be overridden by specific canvas modules
    throw new Error('render method must be implemented');
  }
}
