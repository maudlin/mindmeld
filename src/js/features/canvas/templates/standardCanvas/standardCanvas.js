// standardCanvas.js
import { CanvasModule } from '../../../../core/canvasModule.js';

class StandardCanvas extends CanvasModule {
  constructor() {
    super('Standard Canvas', 7680, 4320);
  }

  createBackgroundLayout() {
    const layout = super.createBackgroundLayout();
    layout.classList.add('standard-canvas');
    layout.style.backgroundColor = '#fffcf8';
    layout.style.backgroundImage = 'radial-gradient(#eee 2px, transparent 2px)';
    layout.style.backgroundSize = '20px 20px';
    return layout;
  }
}

export default StandardCanvas;
