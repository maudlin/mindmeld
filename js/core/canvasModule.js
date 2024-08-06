export class CanvasModule {
  constructor(name, width, height) {
    this.name = name;
    this.width = width;
    this.height = height;
  }

  createBackgroundLayout() {
    const layout = document.createElement('div');
    layout.classList.add('background-layout');
    layout.style.width = `${this.width}px`;
    layout.style.height = `${this.height}px`;
    // Add module-specific background content
    return layout;
  }
}
