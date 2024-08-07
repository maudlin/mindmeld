// canvasModule.js
export class CanvasModule {
  constructor(name, width, height, cssPath) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.cssPath = cssPath;
  }

  createBackgroundLayout() {
    const layout = document.createElement('div');
    layout.classList.add('background-layout');
    layout.style.width = `${this.width}px`;
    layout.style.height = `${this.height}px`;
    return layout;
  }

  async loadCSS() {
    if (this.cssPath) {
      const response = await fetch(this.cssPath);
      if (response.ok) {
        const cssText = await response.text();
        const style = document.createElement('style');
        style.textContent = cssText;
        style.id = `style-${this.name.replace(/\s+/g, '-').toLowerCase()}`;
        return style;
      } else {
        console.error(`Failed to load CSS for ${this.name}`);
      }
    }
    return null;
  }
}
