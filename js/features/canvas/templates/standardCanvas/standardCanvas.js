// standardCanvas.js

import { CanvasModule } from '../../../../core/canvasModule.js';

class standardCanvas extends CanvasModule {
  constructor() {
    super('Standard Canvas', 7680, 4320);
  }
  render(canvas) {
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    canvas.style.backgroundColor = '#fffcf8';
    canvas.style.backgroundImage = 'radial-gradient(#eee 2px, transparent 2px)';
    canvas.style.backgroundSize = '20px 20px';

    // Add link to the CSS file
    if (!document.querySelector('link[href$="canvas.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './js/features/canvas/templates/standardCanvas/canvas.css';
      document.head.appendChild(link);
    }
  }
}

export default standardCanvas;
